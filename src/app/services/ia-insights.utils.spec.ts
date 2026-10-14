import { calcularAlertas, calcularProyeccionMes, calcularSerieMes } from './ia-insights.utils';

// Hoy: 15 de marzo de 2026 (hora local); marzo tiene 31 dias
const hoy = new Date(2026, 2, 15, 12, 0);
const enMarzo = (dia: number) => new Date(2026, 2, dia, 10).toISOString();
const enFebrero = (dia: number) => new Date(2026, 1, dia, 10).toISOString();

describe('calcularAlertas', () => {
  const base = {
    productos: [
      { nombreProducto: 'Camiseta', precioVenta: 100, costoProduccion: 60, stock: 50 },
      { nombreProducto: 'Gorra', precioVenta: 50, costoProduccion: 70, stock: 8 },
      { nombreProducto: 'Media', precioVenta: 20, costoProduccion: 5, stock: 3 }
    ],
    gastosFijos: [
      { nombreGasto: 'Arriendo', costoGasto: 500, pagado: false },
      { nombreGasto: 'Luz', costoGasto: 80, pagado: true }
    ],
    movimientos: { ventas: [], transacciones: [], gastosFijosPagados: [] },
    hoy
  };

  it('detecta stock bajo, margen negativo y gastos fijos pendientes', () => {
    const alertas = calcularAlertas(base);
    const ids = alertas.map((a) => a.id);
    expect(ids).toContain('stock-bajo');
    expect(ids).toContain('margen-negativo');
    expect(ids).toContain('gastos-pendientes');

    const stock = alertas.find((a) => a.id === 'stock-bajo')!;
    expect(stock.detalle).toContain('Gorra');
    expect(stock.detalle).toContain('Media');
    expect(stock.detalle).not.toContain('Camiseta');

    expect(alertas.find((a) => a.id === 'margen-negativo')!.nivel).toBe('alta');
    expect(alertas.find((a) => a.id === 'gastos-pendientes')!.detalle).toContain('500');
  });

  it('ordena primero las alertas de nivel alto', () => {
    const niveles = calcularAlertas(base).map((a) => a.nivel);
    expect(niveles.indexOf('media')).toBeGreaterThan(niveles.lastIndexOf('alta'));
  });

  it('avisa si el mes va en perdida', () => {
    const alertas = calcularAlertas({
      ...base,
      movimientos: {
        ventas: [{ totalVenta: 100, fechaVenta: enMarzo(3) }],
        transacciones: [{ tipo: true, monto: 400, fechaISO: enMarzo(4) }],
        gastosFijosPagados: []
      }
    });
    expect(alertas.map((a) => a.id)).toContain('mes-en-perdida');
  });

  it('avisa si las ventas caen frente al mismo periodo del mes anterior', () => {
    const alertas = calcularAlertas({
      ...base,
      movimientos: {
        ventas: [
          { totalVenta: 1000, fechaVenta: enFebrero(10) },
          { totalVenta: 900, fechaVenta: enFebrero(25) }, // fuera del periodo comparable (dia > 15)
          { totalVenta: 300, fechaVenta: enMarzo(10) }
        ],
        transacciones: [],
        gastosFijosPagados: []
      }
    });
    const caida = alertas.find((a) => a.id === 'ventas-caen');
    expect(caida).toBeTruthy();
    expect(caida!.detalle).toContain('70%');
  });

  it('no genera alertas si todo esta bien', () => {
    expect(calcularAlertas({
      productos: [{ nombreProducto: 'Camiseta', precioVenta: 100, costoProduccion: 60, stock: 50 }],
      gastosFijos: [{ nombreGasto: 'Luz', costoGasto: 80, pagado: true }],
      movimientos: { ventas: [], transacciones: [], gastosFijosPagados: [] },
      hoy
    })).toEqual([]);
  });
});

describe('calcularProyeccionMes', () => {
  const datos = {
    productos: [
      { nombreProducto: 'Camiseta', precioVenta: 100, costoProduccion: 60, stock: 50 }
    ],
    gastosFijos: [
      { nombreGasto: 'Arriendo', costoGasto: 600, pagado: false }
    ],
    movimientos: {
      ventas: [
        { totalVenta: 1000, totalCostoProduccion: 600, cantidadVendida: 10, fechaVenta: enMarzo(5) },
        { totalVenta: 9999, totalCostoProduccion: 1, cantidadVendida: 1, fechaVenta: enFebrero(5) }
      ],
      transacciones: [
        { tipo: false, monto: 500, fechaISO: enMarzo(6) },
        { tipo: true, monto: 300, fechaISO: enMarzo(7) }
      ],
      gastosFijosPagados: []
    },
    hoy
  };

  it('proyecta ingresos y gastos al cierre del mes segun el ritmo actual', () => {
    const p = calcularProyeccionMes(datos);
    expect(p.diasTranscurridos).toBe(15);
    expect(p.diasMes).toBe(31);
    expect(p.ingresosActuales).toBe(1500);
    expect(p.ingresosProyectados).toBe(Math.round(1500 / 15 * 31));
    // egresos variables proyectados + gastos fijos del mes
    expect(p.gastosProyectados).toBe(Math.round(300 / 15 * 31) + 600);
    expect(p.resultadoProyectado).toBe(p.ingresosProyectados - p.gastosProyectados);
  });

  it('calcula el punto de equilibrio en unidades con la contribucion de las ventas del mes', () => {
    const p = calcularProyeccionMes(datos);
    // contribucion por unidad = (1000 - 600) / 10 = 40; gastos fijos 600 -> 15 unidades
    expect(p.puntoEquilibrio).toEqual({ unidadesNecesarias: 15, unidadesVendidas: 10, unidadesFaltantes: 5 });
  });

  it('sin ventas en el mes usa el margen promedio de los productos', () => {
    const p = calcularProyeccionMes({ ...datos, movimientos: { ventas: [], transacciones: [], gastosFijosPagados: [] } });
    // contribucion promedio = 100 - 60 = 40 -> 600 / 40 = 15
    expect(p.puntoEquilibrio?.unidadesNecesarias).toBe(15);
    expect(p.puntoEquilibrio?.unidadesFaltantes).toBe(15);
  });

  it('no hay punto de equilibrio si los productos no dejan margen', () => {
    const p = calcularProyeccionMes({
      ...datos,
      productos: [{ nombreProducto: 'Gorra', precioVenta: 50, costoProduccion: 70, stock: 1 }],
      movimientos: { ventas: [], transacciones: [], gastosFijosPagados: [] }
    });
    expect(p.puntoEquilibrio).toBeNull();
  });
});

describe('calcularSerieMes', () => {
  const datos = {
    productos: [],
    gastosFijos: [{ nombreGasto: 'Arriendo', costoGasto: 600, pagado: false }],
    movimientos: {
      ventas: [
        { totalVenta: 100, fechaVenta: enMarzo(2) },
        { totalVenta: 50, fechaVenta: enMarzo(2) },
        { totalVenta: 9999, fechaVenta: enFebrero(2) }
      ],
      transacciones: [
        { tipo: false, monto: 30, fechaISO: enMarzo(5) },
        { tipo: true, monto: 40, fechaISO: enMarzo(3) }
      ],
      gastosFijosPagados: [{ costoGasto: 20, createdAt: enMarzo(10) }]
    },
    hoy
  };

  it('acumula ingresos y gastos dia a dia hasta hoy', () => {
    const serie = calcularSerieMes(datos);
    expect(serie.diasMes).toBe(31);
    expect(serie.hoy).toBe(15);
    expect(serie.real.length).toBe(15);
    expect(serie.real[0]).toEqual({ dia: 1, ingresos: 0, gastos: 0 });
    expect(serie.real[1]).toEqual({ dia: 2, ingresos: 150, gastos: 0 });
    expect(serie.real[2]).toEqual({ dia: 3, ingresos: 150, gastos: 40 });
    expect(serie.real[4]).toEqual({ dia: 5, ingresos: 180, gastos: 40 });
    expect(serie.real[14]).toEqual({ dia: 15, ingresos: 180, gastos: 60 });
  });

  it('termina la proyeccion en los totales proyectados del mes', () => {
    const serie = calcularSerieMes(datos);
    const proyeccion = calcularProyeccionMes(datos);
    expect(serie.cierre).toEqual({ dia: 31, ingresos: proyeccion.ingresosProyectados, gastos: proyeccion.gastosProyectados });
  });
});
