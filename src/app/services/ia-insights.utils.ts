import { aFecha, calcularResumenMes } from './balance.utils';

// Datos del negocio que usan las alertas y la proyeccion del panel de IA
export interface DatosNegocio {
  productos: any[];
  gastosFijos: any[];
  movimientos: { ventas: any[]; transacciones: any[]; gastosFijosPagados: any[] };
  hoy: Date;
}

export interface AlertaNegocio {
  id: 'stock-bajo' | 'margen-negativo' | 'gastos-pendientes' | 'mes-en-perdida' | 'ventas-caen';
  nivel: 'alta' | 'media';
  titulo: string;
  detalle: string;
}

export interface ProyeccionMes {
  diasTranscurridos: number;
  diasMes: number;
  ingresosActuales: number;
  gastosActuales: number;
  ingresosProyectados: number;
  gastosProyectados: number;
  resultadoProyectado: number;
  puntoEquilibrio: { unidadesNecesarias: number; unidadesVendidas: number; unidadesFaltantes: number } | null;
}

// Mismo umbral que la etiqueta "Bajo" de la pagina de productos
const STOCK_BAJO = 10;
// Caida de ventas a partir de la cual se avisa
const CAIDA_VENTAS = 0.2;

const num = (value: any): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const dinero = (value: number): string =>
  `$${Math.round(value).toLocaleString('es-CO')}`;

const nombreProducto = (p: any): string => p?.nombreProducto || p?.nombre || 'Producto';

const lista = (nombres: string[]): string =>
  nombres.length <= 3 ? nombres.join(', ') : `${nombres.slice(0, 3).join(', ')} y ${nombres.length - 3} más`;

function ventasHastaDia(ventas: any[], year: number, month: number, dia: number): number {
  return ventas
    .filter((v) => {
      const date = aFecha(v?.fechaVenta ?? v?.fechaVentaISO ?? v?.createdAt);
      return !!date && date.getFullYear() === year && date.getMonth() + 1 === month && date.getDate() <= dia;
    })
    .reduce((sum, v) => sum + num(v?.totalVenta), 0);
}

export function calcularAlertas(datos: DatosNegocio): AlertaNegocio[] {
  const alertas: AlertaNegocio[] = [];
  const year = datos.hoy.getFullYear();
  const month = datos.hoy.getMonth() + 1;

  const margenNegativo = datos.productos.filter((p) => num(p?.precioVenta) < num(p?.costoProduccion));
  if (margenNegativo.length > 0) {
    alertas.push({
      id: 'margen-negativo',
      nivel: 'alta',
      titulo: `${margenNegativo.length} producto${margenNegativo.length > 1 ? 's' : ''} con margen negativo`,
      detalle: `Se venden por debajo de su costo: ${lista(margenNegativo.map(nombreProducto))}.`
    });
  }

  const resumen = calcularResumenMes(datos.movimientos, year, month);
  if (resumen.gastos > 0 && resumen.gastos > resumen.ingresos) {
    alertas.push({
      id: 'mes-en-perdida',
      nivel: 'alta',
      titulo: 'El mes va en pérdida',
      detalle: `Gastos de ${dinero(resumen.gastos)} frente a ingresos de ${dinero(resumen.ingresos)} en lo que va del mes.`
    });
  }

  const stockBajo = datos.productos.filter((p) => num(p?.stock) <= STOCK_BAJO);
  if (stockBajo.length > 0) {
    alertas.push({
      id: 'stock-bajo',
      nivel: 'media',
      titulo: `Stock bajo en ${stockBajo.length} producto${stockBajo.length > 1 ? 's' : ''}`,
      detalle: `${STOCK_BAJO} unidades o menos: ${lista(stockBajo.map(nombreProducto))}.`
    });
  }

  const pendientes = datos.gastosFijos.filter((g) => !g?.pagado);
  if (pendientes.length > 0) {
    const total = pendientes.reduce((sum, g) => sum + num(g?.costoGasto), 0);
    alertas.push({
      id: 'gastos-pendientes',
      nivel: 'media',
      titulo: `${pendientes.length} gasto${pendientes.length > 1 ? 's' : ''} fijo${pendientes.length > 1 ? 's' : ''} pendiente${pendientes.length > 1 ? 's' : ''}`,
      detalle: `Por pagar ${dinero(total)}: ${lista(pendientes.map((g) => g?.nombreGasto || 'Gasto fijo'))}.`
    });
  }

  // Ventas del mes hasta hoy vs. los mismos dias del mes anterior
  const dia = datos.hoy.getDate();
  const anterior = new Date(year, month - 2, 1);
  const ventasActual = ventasHastaDia(datos.movimientos.ventas, year, month, dia);
  const ventasAnterior = ventasHastaDia(datos.movimientos.ventas, anterior.getFullYear(), anterior.getMonth() + 1, dia);
  if (ventasAnterior > 0 && ventasActual < ventasAnterior * (1 - CAIDA_VENTAS)) {
    const caida = Math.round((1 - ventasActual / ventasAnterior) * 100);
    alertas.push({
      id: 'ventas-caen',
      nivel: 'media',
      titulo: 'Las ventas están cayendo',
      detalle: `Bajaron un ${caida}% frente a los mismos días del mes anterior (${dinero(ventasActual)} vs ${dinero(ventasAnterior)}).`
    });
  }

  return alertas.sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === 'alta' ? -1 : 1));
}

export function calcularProyeccionMes(datos: DatosNegocio): ProyeccionMes {
  const year = datos.hoy.getFullYear();
  const month = datos.hoy.getMonth() + 1;
  const diasMes = new Date(year, month, 0).getDate();
  const diasTranscurridos = Math.max(1, Math.min(datos.hoy.getDate(), diasMes));
  const ritmo = (valor: number) => Math.round((valor / diasTranscurridos) * diasMes);

  const resumen = calcularResumenMes(datos.movimientos, year, month);
  const gastosFijosMes = datos.gastosFijos.reduce((sum, g) => sum + num(g?.costoGasto), 0);

  const ingresosProyectados = ritmo(resumen.ingresos);
  // Los egresos variables siguen el ritmo; los gastos fijos se cuentan completos una vez
  const gastosProyectados = ritmo(resumen.transaccionesEgreso) + Math.max(gastosFijosMes, resumen.gastosFijosPagados);

  return {
    diasTranscurridos,
    diasMes,
    ingresosActuales: resumen.ingresos,
    gastosActuales: resumen.gastos,
    ingresosProyectados,
    gastosProyectados,
    resultadoProyectado: ingresosProyectados - gastosProyectados,
    puntoEquilibrio: calcularPuntoEquilibrio(datos, year, month, gastosFijosMes)
  };
}

// Unidades que hay que vender en el mes para cubrir los gastos fijos
function calcularPuntoEquilibrio(datos: DatosNegocio, year: number, month: number, gastosFijosMes: number) {
  if (gastosFijosMes <= 0) return null;

  const ventasMes = datos.movimientos.ventas.filter((v) => {
    const date = aFecha(v?.fechaVenta ?? v?.fechaVentaISO ?? v?.createdAt);
    return !!date && date.getFullYear() === year && date.getMonth() + 1 === month;
  });
  const unidadesVendidas = ventasMes.reduce((sum, v) => sum + num(v?.cantidadVendida), 0);

  let contribucionUnitaria = 0;
  if (unidadesVendidas > 0) {
    const contribucion = ventasMes.reduce((sum, v) => sum + num(v?.totalVenta) - num(v?.totalCostoProduccion), 0);
    contribucionUnitaria = contribucion / unidadesVendidas;
  } else {
    const margenes = datos.productos
      .map((p) => num(p?.precioVenta) - num(p?.costoProduccion))
      .filter((m) => m > 0);
    contribucionUnitaria = margenes.length ? margenes.reduce((a, b) => a + b, 0) / margenes.length : 0;
  }

  if (contribucionUnitaria <= 0) return null;

  const unidadesNecesarias = Math.ceil(gastosFijosMes / contribucionUnitaria);
  return {
    unidadesNecesarias,
    unidadesVendidas,
    unidadesFaltantes: Math.max(0, unidadesNecesarias - unidadesVendidas)
  };
}

export interface PuntoSerie {
  dia: number;
  ingresos: number;
  gastos: number;
}

export interface SerieMes {
  diasMes: number;
  hoy: number;
  // Acumulado real, un punto por dia desde el 1 hasta hoy
  real: PuntoSerie[];
  // Totales proyectados al ultimo dia del mes
  cierre: PuntoSerie;
}

// Serie para el grafico de proyeccion: acumulado diario de ingresos y gastos del mes actual
export function calcularSerieMes(datos: DatosNegocio): SerieMes {
  const year = datos.hoy.getFullYear();
  const month = datos.hoy.getMonth() + 1;
  const proyeccion = calcularProyeccionMes(datos);
  const hoy = proyeccion.diasTranscurridos;

  const ingresosPorDia = new Array(proyeccion.diasMes + 1).fill(0);
  const gastosPorDia = new Array(proyeccion.diasMes + 1).fill(0);
  const sumar = (destino: number[], fecha: any, monto: any) => {
    const date = aFecha(fecha);
    if (date && date.getFullYear() === year && date.getMonth() + 1 === month) {
      destino[date.getDate()] += num(monto);
    }
  };

  datos.movimientos.ventas.forEach((v) =>
    sumar(ingresosPorDia, v?.fechaVenta ?? v?.fechaVentaISO ?? v?.createdAt, v?.totalVenta));
  datos.movimientos.transacciones.forEach((t) => {
    const fecha = t?.fechaISO ?? t?.fecha ?? t?.date;
    const tipo = t?.tipoOriginal ?? t?.tipo;
    if (tipo === false || tipo === 0 || tipo === 'income' || tipo === 'ingreso') sumar(ingresosPorDia, fecha, t?.monto);
    else if (tipo === true || tipo === 1 || tipo === 'expense' || tipo === 'egreso') sumar(gastosPorDia, fecha, t?.monto);
  });
  datos.movimientos.gastosFijosPagados.forEach((g) =>
    sumar(gastosPorDia, g?.createdAtISO ?? g?.createdAt ?? g?.fecha, g?.costoGasto));

  const real: PuntoSerie[] = [];
  let ingresos = 0;
  let gastos = 0;
  for (let dia = 1; dia <= hoy; dia++) {
    ingresos += ingresosPorDia[dia];
    gastos += gastosPorDia[dia];
    real.push({ dia, ingresos, gastos });
  }

  return {
    diasMes: proyeccion.diasMes,
    hoy,
    real,
    cierre: { dia: proyeccion.diasMes, ingresos: proyeccion.ingresosProyectados, gastos: proyeccion.gastosProyectados }
  };
}
