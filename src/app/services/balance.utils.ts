export interface BalanceGeneral {
  capitalInicial: number;
  ventas: number;
  transaccionesIngreso: number;
  transaccionesEgreso: number;
  gastosFijosPagados: number;
  balanceTotal: number;
  source: 'backend' | 'frontend';
  calculatedAt: string;
}

const toBalanceNumber = (value: any): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

// tipo: false = ingreso, true = egreso. Datos antiguos lo guardan como numero o texto.
const esTransaccionEgreso = (tipo: any): boolean =>
  tipo === true || tipo === 1 || tipo === 'expense' || tipo === 'egreso';
export const esTransaccionIngreso = (tipo: any): boolean =>
  tipo === false || tipo === 0 || tipo === 'income' || tipo === 'ingreso';

// Misma formula que el endpoint GET /balance-general/:idNegocio del backend:
// capitalInicial + ventas + ingresos - egresos - gastos fijos pagados
export function calcularBalanceGeneral(input: {
  capitalInicial: any;
  ventas: any[];
  transacciones: any[];
  gastosFijosPagados: any[];
}): Omit<BalanceGeneral, 'source' | 'calculatedAt'> {
  const capitalInicial = toBalanceNumber(input.capitalInicial);
  const ventas = input.ventas.reduce((sum, v) => sum + toBalanceNumber(v?.totalVenta), 0);
  const transaccionesIngreso = input.transacciones
    .filter((t) => esTransaccionIngreso(t?.tipo))
    .reduce((sum, t) => sum + toBalanceNumber(t?.monto), 0);
  const transaccionesEgreso = input.transacciones
    .filter((t) => esTransaccionEgreso(t?.tipo))
    .reduce((sum, t) => sum + toBalanceNumber(t?.monto), 0);
  const gastosFijosPagados = input.gastosFijosPagados
    .reduce((sum, g) => sum + toBalanceNumber(g?.costoGasto), 0);

  return {
    capitalInicial,
    ventas,
    transaccionesIngreso,
    transaccionesEgreso,
    gastosFijosPagados,
    balanceTotal: capitalInicial + ventas + transaccionesIngreso - transaccionesEgreso - gastosFijosPagados
  };
}

// Convierte las fechas que devuelve el backend (ISO, Timestamp de Firestore serializado o Date)
export function aFecha(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === 'function') return value.toDate();

  const seconds = value?._seconds ?? value?.seconds;
  if (typeof seconds === 'number') return new Date(seconds * 1000);

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export interface ResumenMes {
  ventas: number;
  transaccionesIngreso: number;
  transaccionesEgreso: number;
  gastosFijosPagados: number;
  ingresos: number;
  gastos: number;
}

// Ingresos y gastos de un mes (month: 1-12, en hora local):
// ingresos = ventas + transacciones de ingreso; gastos = egresos + gastos fijos pagados
export function calcularResumenMes(
  input: { ventas: any[]; transacciones: any[]; gastosFijosPagados: any[] },
  year: number,
  month: number
): ResumenMes {
  const enMes = (value: any): boolean => {
    const date = aFecha(value);
    return !!date && date.getFullYear() === year && date.getMonth() + 1 === month;
  };

  const ventasMes = input.ventas.filter((v) => enMes(v?.fechaVenta ?? v?.fechaVentaISO ?? v?.createdAt));
  const transaccionesMes = input.transacciones.filter((t) => enMes(t?.fechaISO ?? t?.fecha ?? t?.date));
  const gastosMes = input.gastosFijosPagados.filter((g) => enMes(g?.createdAtISO ?? g?.createdAt ?? g?.fecha));

  const totales = calcularBalanceGeneral({
    capitalInicial: 0,
    ventas: ventasMes,
    transacciones: transaccionesMes,
    gastosFijosPagados: gastosMes
  });

  return {
    ventas: totales.ventas,
    transaccionesIngreso: totales.transaccionesIngreso,
    transaccionesEgreso: totales.transaccionesEgreso,
    gastosFijosPagados: totales.gastosFijosPagados,
    ingresos: totales.ventas + totales.transaccionesIngreso,
    gastos: totales.transaccionesEgreso + totales.gastosFijosPagados
  };
}

export interface ResumenHistorico {
  ingresos: number;
  gastos: number;
  resultadoNeto: number;
}

export function calcularResumenHistorico(
  balance: Omit<BalanceGeneral, 'source' | 'calculatedAt'>
): ResumenHistorico {
  const ingresos = balance.ventas + balance.transaccionesIngreso;
  const gastos = balance.transaccionesEgreso + balance.gastosFijosPagados;
  return { ingresos, gastos, resultadoNeto: ingresos - gastos };
}
