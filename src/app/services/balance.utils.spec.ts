import { calcularResumenMes, calcularResumenHistorico, aFecha, esTransaccionIngreso } from './balance.utils';

describe('aFecha', () => {
  it('entiende ISO, Timestamp serializado de Firestore y Date', () => {
    const esperado = new Date('2026-03-08T10:00:00.000Z').getTime();
    expect(aFecha('2026-03-08T10:00:00.000Z')?.getTime()).toBe(esperado);
    expect(aFecha({ _seconds: esperado / 1000, _nanoseconds: 0 })?.getTime()).toBe(esperado);
    expect(aFecha({ seconds: esperado / 1000, nanoseconds: 0 })?.getTime()).toBe(esperado);
    expect(aFecha(new Date(esperado))?.getTime()).toBe(esperado);
  });

  it('devuelve null si no hay fecha valida', () => {
    expect(aFecha(undefined)).toBeNull();
    expect(aFecha('no es fecha')).toBeNull();
  });
});

describe('calcularResumenMes', () => {
  // Fechas en hora local, igual que el selector de mes del dashboard
  const enMarzo = new Date(2026, 2, 15).toISOString();
  const finDeMarzo = new Date(2026, 2, 31, 23, 59).toISOString();
  const enAbril = new Date(2026, 3, 1, 0, 0).toISOString();

  const datos = {
    ventas: [
      { totalVenta: 300, fechaVenta: enMarzo },
      { totalVenta: 200, fechaVenta: enAbril },
      { totalVenta: 999 } // sin fecha: no se puede asignar a un mes
    ],
    transacciones: [
      { tipo: false, monto: 100, fechaISO: finDeMarzo },
      { tipo: 'income', monto: 3, fecha: { _seconds: new Date(2026, 2, 2).getTime() / 1000 } },
      { tipo: true, monto: 40, fechaISO: enMarzo },
      { tipo: true, monto: 70, fechaISO: enAbril }
    ],
    gastosFijosPagados: [
      { costoGasto: 60, createdAt: enMarzo },
      { costoGasto: 500, createdAt: enAbril }
    ]
  };

  it('suma ingresos (ventas + transacciones de ingreso) y gastos (egresos + fijos pagados) del mes', () => {
    expect(calcularResumenMes(datos, 2026, 3)).toEqual({
      ventas: 300,
      transaccionesIngreso: 103,
      transaccionesEgreso: 40,
      gastosFijosPagados: 60,
      ingresos: 403,
      gastos: 100
    });
  });

  it('no mezcla meses', () => {
    const abril = calcularResumenMes(datos, 2026, 4);
    expect(abril.ingresos).toBe(200);
    expect(abril.gastos).toBe(570);
  });

  it('devuelve ceros en un mes sin movimientos', () => {
    expect(calcularResumenMes(datos, 2026, 10).ingresos).toBe(0);
    expect(calcularResumenMes(datos, 2026, 10).gastos).toBe(0);
  });
});

describe('calcularResumenHistorico', () => {
  it('agrupa el balance general en ingresos, gastos y resultado neto', () => {
    expect(calcularResumenHistorico({
      capitalInicial: 1000,
      ventas: 550,
      transaccionesIngreso: 100,
      transaccionesEgreso: 40,
      gastosFijosPagados: 60,
      balanceTotal: 1550
    })).toEqual({ ingresos: 650, gastos: 100, resultadoNeto: 550 });
  });
});

describe('esTransaccionIngreso', () => {
  it('reconoce el formato actual y los antiguos', () => {
    expect(esTransaccionIngreso(false)).toBeTrue();
    expect(esTransaccionIngreso(0)).toBeTrue();
    expect(esTransaccionIngreso('income')).toBeTrue();
    expect(esTransaccionIngreso('ingreso')).toBeTrue();
    expect(esTransaccionIngreso(true)).toBeFalse();
    expect(esTransaccionIngreso('expense')).toBeFalse();
    expect(esTransaccionIngreso(undefined)).toBeFalse();
  });
});
