import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonIcon,
  IonButton,
  IonSkeletonText
} from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  cashOutline,
  arrowUpOutline,
  arrowDownOutline,
  cubeOutline,
  hardwareChipOutline,
  businessOutline,
  trendingUpOutline,
  trendingDownOutline,
  settingsOutline,
  documentTextOutline,
  listOutline,
  chevronBackOutline,
  chevronForwardOutline,
  chevronDownOutline,
  chevronUpOutline,
  pieChartOutline,
  receiptOutline,
  addCircleOutline,
  removeCircleOutline
} from 'ionicons/icons';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth';
import { ApiService, DashboardWeeklySyncStatus } from '../../services/api-service';
import {
  BalanceGeneral,
  ResumenHistorico,
  aFecha,
  calcularResumenHistorico,
  esTransaccionIngreso,
  calcularResumenMes
} from '../../services/balance.utils';

// Mismo umbral que la etiqueta "Bajo" de Productos
const STOCK_BAJO = 10;

interface DashboardActivity {
  title: string;
  time: string;
  amount: number;
  type: 'income' | 'expense';
}

interface WeeklyBalanceSummary {
  idBalance: string;
  weekKey: string;
  weekStart: string;
  weekEnd: string;
  balanceTotal: number;
  createdAt: string;
}

interface BalancePdfReportSummary {
  idReporte: string;
  idBalance: string;
  weekKey: string;
  createdAt: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonIcon,
    IonButton,
    IonSkeletonText,
    CommonModule,
    FormsModule
  ]
})
export class DashboardPage implements OnInit {
  userName: string = 'Usuario';
  businessName: string = 'Negocio';
  isLoading: boolean = true;

  balanceGeneral: number = 0;
  ingresosMes: number = 0;
  gastosMes: number = 0;
  productosCount: number = 0;
  rentabilidadMes: number = 0;
  margenPromedio: number | null = null;
  productosStockBajo: number = 0;
  gastosPendientesCount: number = 0;
  gastosPendientesTotal: number = 0;
  currentBusinessId: string = '';
  private currentCapitalInicial: number = 0;

  // Mes que muestran las tarjetas de Ingresos / Gastos / Rentabilidad (month: 1-12)
  selectedYear: number = new Date().getFullYear();
  selectedMonth: number = new Date().getMonth() + 1;
  showHistoricos: boolean = false;
  balanceDetalle: BalanceGeneral | null = null;
  private movimientos: { ventas: any[]; transacciones: any[]; gastosFijosPagados: any[] } = {
    ventas: [],
    transacciones: [],
    gastosFijosPagados: []
  };
  private rentabilidadRequestId = 0;

  recentActivities: DashboardActivity[] = [];
  showWeeklyBalancesModal: boolean = false;
  weeklyBalancesLoading: boolean = false;
  weeklyBalances: WeeklyBalanceSummary[] = [];
  isManualWeeklySyncLoading: boolean = false;
  weeklySyncStatus: DashboardWeeklySyncStatus | null = null;
  private weeklyReminderShownForWeekKey: string = '';

  showPdfModal: boolean = false;
  pdfReportsLoading: boolean = false;
  pdfReports: BalancePdfReportSummary[] = [];
  generatingPdfBalanceId: string = '';
  downloadingReportId: string = '';

  constructor(
    private router: Router,
    private themeService: ThemeService,
    private authService: AuthService,
    private apiService: ApiService,
    private toastController: ToastController
  ) {
    addIcons({
      settingsOutline,
      cashOutline,
      arrowUpOutline,
      arrowDownOutline,
      cubeOutline,
      hardwareChipOutline,
      businessOutline,
      trendingUpOutline,
      trendingDownOutline,
      documentTextOutline,
      listOutline,
      chevronBackOutline,
      chevronForwardOutline,
      chevronDownOutline,
      chevronUpOutline,
      pieChartOutline,
      receiptOutline,
      addCircleOutline,
      removeCircleOutline
    });
  }

  async ngOnInit() {
    await this.loadDashboardContext();
    await this.notifyIfWeeklySyncPending();
  }

  async ionViewWillEnter() {
    // Recalcula al volver (p. ej. tras registrar una venta en Finanzas)
    await this.loadBalanceGeneral();
    await this.notifyIfWeeklySyncPending();
  }

  private getCurrentYearMonth(): { year: number; month: number } {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1
    };
  }

  private formatCurrency(value: number): string {
    const abs = new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(value || 0));
    return value < 0 ? `-$${abs}` : `$${abs}`;
  }

  // "Hoy", "Ayer" o la fecha corta ("28 mar"; con año si no es el actual)
  private formatActivityDate(dateValue: any): string {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';
    const hoy = new Date();
    const inicioDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dias = Math.round((inicioDia(hoy) - inicioDia(date)) / 86400000);
    if (dias === 0) return 'Hoy';
    if (dias === 1) return 'Ayer';
    return new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'short',
      ...(date.getFullYear() !== hoy.getFullYear() ? { year: 'numeric' } : {})
    }).format(date).replace('.', '');
  }

  private normalizeDate(value: any): string {
    if (!value) return new Date().toISOString();
    if (typeof value === 'string') return value;
    if (value?.toDate && typeof value.toDate === 'function') return value.toDate().toISOString();
    if (typeof value?._seconds === 'number') return new Date(value._seconds * 1000).toISOString();
    return new Date().toISOString();
  }

  private async loadBalanceGeneral(): Promise<void> {
    const idNegocio = this.currentBusinessId;
    if (!idNegocio) return;

    // Mostrar el ultimo valor calculado mientras se recalcula
    const cached = await this.apiService.getBalanceGeneralCache(idNegocio);
    if (cached && idNegocio === this.currentBusinessId) {
      this.balanceGeneral = cached.balanceTotal;
      this.balanceDetalle = cached;
    }

    try {
      const balance = await this.apiService.getBalanceGeneral(idNegocio, this.currentCapitalInicial);
      if (idNegocio === this.currentBusinessId) {
        this.balanceGeneral = balance.balanceTotal;
        this.balanceDetalle = balance;
      }
    } catch (error) {
      console.error('[DASHBOARD] Error loading balance general:', error);
    }
  }

  private async loadDashboardContext(): Promise<void> {
    try {
      this.isLoading = true;
      await this.loadUserData();

      const uid = this.authService.uid || await this.apiService.getUid();
      if (!uid) return;

      const businesses = await this.apiService.getBusinessByUserId(uid);
      if (!businesses || businesses.length === 0) return;

      const business = businesses[0];
      const idNegocio = business['idNegocio'] || business['id'];
      this.currentBusinessId = idNegocio;
      this.currentCapitalInicial = Number(business['capitalInicial']) || 0;
      const balancePromise = this.loadBalanceGeneral();
      this.businessName = business['nombreNegocio'] || 'Negocio';

      const [
        transacciones,
        productos,
        gastosFijosPagados,
        gastosFijos
      ] = await Promise.all([
        this.apiService.getTransactionsByBusiness(idNegocio).catch(() => []),
        this.apiService.getProductsByBusiness(idNegocio).catch(() => []),
        this.apiService.getGastosFijosPagados().catch(() => []),
        this.apiService.getGastosFijosByBusiness(idNegocio).catch(() => [])
      ]);

      this.calcularIndicadores(productos || [], Array.isArray(gastosFijos) ? gastosFijos : []);

      const productosList = productos || [];
      const productNameById = new Map<string, string>();
      productosList.forEach((product: any) => {
        const productId = String(product?.idProducto || product?.id || '');
        if (productId) {
          productNameById.set(productId, product?.nombreProducto || product?.nombre || product?.name || 'Producto');
        }
      });

      const ventasByProduct = await Promise.all(
        productosList.map(async (product: any) => {
          const productId = product?.idProducto || product?.id;
          if (!productId) return [];

          const ventas = await this.apiService.getVentasByProducto(productId).catch(() => []);
          return (ventas || []).map((venta: any) => ({
            ...venta,
            __productName: productNameById.get(String(productId)) || 'Producto'
          }));
        })
      );

      const ventas = ventasByProduct
        .flat()
        .filter((venta: any) => !venta?.idNegocio || venta.idNegocio === idNegocio);

      const gastosPagadosDelNegocio = (gastosFijosPagados || []).filter((gasto: any) => {
        const businessId = gasto?.idNegocio || gasto?.negocioId || gasto?.idBusiness;
        return !businessId || businessId === idNegocio;
      });

      this.movimientos = {
        ventas,
        transacciones: transacciones || [],
        gastosFijosPagados: gastosPagadosDelNegocio
      };
      const rentabilidadPromise = this.applySelectedMonth();

      const actividadesTransacciones = (transacciones || []).map((t: any) => ({
        title: t.description || t.descripcion || 'Transaccion',
        date: this.normalizeDate(t.date || t.fechaISO || t.fecha),
        amount: Math.abs(Number(t.amount || t.monto || 0)),
        type: esTransaccionIngreso(t.tipoOriginal ?? t.tipo) ? 'income' as const : 'expense' as const
      }));

      const actividadesVentas = (ventas || []).map((venta: any) => {
        const cantidad = Number(venta?.cantidadVendida || 0);
        const nombreProducto = venta?.__productName || productNameById.get(String(venta?.idProducto || '')) || 'Producto';
        const totalVenta = Number(venta?.totalVenta ?? (cantidad * Number(venta?.precioUnitario || 0)));

        return {
          title: `Venta: ${nombreProducto}${cantidad > 0 ? ` x${cantidad}` : ''}`,
          date: this.normalizeDate(venta?.fechaVenta || venta?.fechaVentaISO || venta?.createdAt),
          amount: Math.abs(Number.isFinite(totalVenta) ? totalVenta : 0),
          type: 'income' as const
        };
      });

      const actividadesGastosPagados = gastosPagadosDelNegocio.map((gasto: any) => ({
        title: `Pago gasto fijo: ${gasto?.nombreGasto || 'Gasto fijo'}`,
        date: this.normalizeDate(gasto?.createdAtISO || gasto?.createdAt || gasto?.fecha),
        amount: Math.abs(Number(gasto?.costoGasto || 0)),
        type: 'expense' as const
      }));

      this.recentActivities = [
        ...actividadesTransacciones,
        ...actividadesVentas,
        ...actividadesGastosPagados
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 4)
        .map((activity) => ({
          title: activity.title,
          time: this.formatActivityDate(activity.date),
          amount: activity.amount,
          type: activity.type
        }));

      await Promise.all([balancePromise, rentabilidadPromise]);
    } catch (error) {
      console.error('[DASHBOARD] Error loading dashboard context:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Recalcula Ingresos / Gastos / Rentabilidad para el mes seleccionado
  private async applySelectedMonth(): Promise<void> {
    const year = this.selectedYear;
    const month = this.selectedMonth;
    const resumen = calcularResumenMes(this.movimientos, year, month);
    this.ingresosMes = resumen.ingresos;
    this.gastosMes = resumen.gastos;

    const idNegocio = this.currentBusinessId;
    if (!idNegocio) return;

    // Si se cambia de mes rapido, ignorar respuestas de meses anteriores
    const requestId = ++this.rentabilidadRequestId;
    const rentabilidadLive = await this.apiService.getRentabilidadLive(idNegocio, year, month).catch(() => null);
    if (requestId !== this.rentabilidadRequestId) return;

    const utilidadVentasMes = this.movimientos.ventas
      .filter((venta: any) => {
        const date = aFecha(venta?.fechaVenta ?? venta?.fechaVentaISO ?? venta?.createdAt);
        return !!date && date.getFullYear() === year && date.getMonth() + 1 === month;
      })
      .reduce((sum: number, venta: any) => sum + (Number(venta?.utilidad) || 0), 0);
    this.rentabilidadMes = Number(rentabilidadLive?.rentabilidadNeta ?? utilidadVentasMes);
  }

  async changeMonth(delta: number): Promise<void> {
    if (delta > 0 && this.isCurrentMonthSelected) return;

    const date = new Date(this.selectedYear, this.selectedMonth - 1 + delta, 1);
    this.selectedYear = date.getFullYear();
    this.selectedMonth = date.getMonth() + 1;
    await this.applySelectedMonth();
  }

  toggleHistoricos(): void {
    this.showHistoricos = !this.showHistoricos;
  }

  get isCurrentMonthSelected(): boolean {
    const { year, month } = this.getCurrentYearMonth();
    return this.selectedYear === year && this.selectedMonth === month;
  }

  get selectedMonthLabel(): string {
    const label = new Intl.DateTimeFormat('es-CO', { month: 'short', year: 'numeric' })
      .format(new Date(this.selectedYear, this.selectedMonth - 1, 1))
      .replace('.', '');
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  get resumenHistorico(): ResumenHistorico | null {
    return this.balanceDetalle ? calcularResumenHistorico(this.balanceDetalle) : null;
  }

  formatMoney(value: number): string {
    return this.formatCurrency(value);
  }

  private calcularIndicadores(productos: any[], gastosFijos: any[]): void {
    this.productosCount = productos.length;
    this.productosStockBajo = productos.filter((p) => (Number(p?.stock) || 0) <= STOCK_BAJO).length;

    const margenes = productos
      .map((p) => ({ precio: Number(p?.precioVenta) || 0, costo: Number(p?.costoProduccion) || 0 }))
      .filter((p) => p.precio > 0)
      .map((p) => ((p.precio - p.costo) / p.precio) * 100);
    this.margenPromedio = margenes.length ? margenes.reduce((a, b) => a + b, 0) / margenes.length : null;

    const pendientes = gastosFijos.filter((g) => !g?.pagado);
    this.gastosPendientesCount = pendientes.length;
    this.gastosPendientesTotal = pendientes.reduce((sum, g) => sum + (Number(g?.costoGasto) || 0), 0);
  }

  get margenPromedioFmt(): string {
    return this.margenPromedio === null
      ? 'Sin productos'
      : `${this.margenPromedio.toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`;
  }

  // Atajos al formulario correspondiente de Finanzas
  nuevaVenta(): void {
    this.router.navigate(['/tabs/finance'], { state: { accion: 'venta' } });
  }

  nuevoGasto(): void {
    this.router.navigate(['/tabs/finance'], { state: { accion: 'gasto' } });
  }

  private async loadUserData(): Promise<void> {
    try {
      if (!this.authService.isAuthenticated || !this.authService.uid) return;

      const userData = await this.apiService.getUserByUid(this.authService.uid);
      const actualData = userData['data'] || userData;
      this.userName = actualData['name'] || actualData['displayName'] || 'Usuario';
    } catch (error) {
      console.error('[DASHBOARD] Error loading user:', error);
      this.userName = 'Usuario';
    }
  }

  private async presentToast(message: string, color: string = 'primary'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color,
      position: 'top'
    });
    await toast.present();
  }

  private async ensureBusinessId(): Promise<string> {
    if (this.currentBusinessId) return this.currentBusinessId;

    const uid = this.authService.uid || await this.apiService.getUid();
    if (!uid) return '';

    const businesses = await this.apiService.getBusinessByUserId(uid);
    const firstBusiness = businesses?.[0];
    this.currentBusinessId = firstBusiness?.['idNegocio'] || firstBusiness?.['id'] || '';
    return this.currentBusinessId;
  }

  private extractBalanceId(balance: any): string {
    return String(
      balance?.idBalance ||
      balance?.idSnapshot ||
      balance?.id ||
      ''
    ).trim();
  }

  private normalizeWeekDate(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (value?.toDate && typeof value.toDate === 'function') return value.toDate().toISOString();
    if (typeof value?._seconds === 'number') return new Date(value._seconds * 1000).toISOString();
    return '';
  }

  private mapWeeklyBalanceItem(balance: any): WeeklyBalanceSummary | null {
    const idBalance = this.extractBalanceId(balance);
    if (!idBalance) return null;

    return {
      idBalance,
      weekKey: balance?.weekKey || '-',
      weekStart: this.normalizeWeekDate(balance?.weekStart),
      weekEnd: this.normalizeWeekDate(balance?.weekEnd),
      balanceTotal: Number(balance?.balanceTotal || 0),
      createdAt: this.normalizeWeekDate(balance?.createdAt || balance?.generatedAt || balance?.syncedAt)
    };
  }

  private mapPdfReportItem(report: any): BalancePdfReportSummary | null {
    const idReporte = String(report?.idReporte || report?.id || '').trim();
    if (!idReporte) return null;

    return {
      idReporte,
      idBalance: String(report?.idBalance || '').trim(),
      weekKey: report?.weekKey || '-',
      createdAt: this.normalizeWeekDate(report?.createdAt || report?.generatedAt)
    };
  }

  formatDateShort(value: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  }

  getBalanceRangeLabel(balance: WeeklyBalanceSummary): string {
    if (balance.weekStart && balance.weekEnd) {
      return `${this.formatDateShort(balance.weekStart)} - ${this.formatDateShort(balance.weekEnd)}`;
    }
    return balance.weekKey || '-';
  }

  async openWeeklyBalancesModal(): Promise<void> {
    this.showWeeklyBalancesModal = true;
    await Promise.all([
      this.loadWeeklyBalances(),
      this.refreshWeeklySyncStatus()
    ]);
  }

  closeWeeklyBalancesModal(): void {
    this.showWeeklyBalancesModal = false;
  }

  async openPdfModal(): Promise<void> {
    this.showPdfModal = true;
    await Promise.all([
      this.loadWeeklyBalances(),
      this.loadPdfReports()
    ]);
  }

  closePdfModal(): void {
    this.showPdfModal = false;
  }

  async loadWeeklyBalances(): Promise<void> {
    try {
      this.weeklyBalancesLoading = true;
      const idNegocio = await this.ensureBusinessId();
      if (!idNegocio) {
        this.weeklyBalances = [];
        return;
      }

      const balances = await this.apiService.getBalancesSemanalesByBusiness(idNegocio);
      this.weeklyBalances = (balances || [])
        .map((item: any) => this.mapWeeklyBalanceItem(item))
        .filter((item: WeeklyBalanceSummary | null): item is WeeklyBalanceSummary => !!item)
        .sort((a, b) => {
          const dateA = new Date(a.weekStart || a.createdAt).getTime();
          const dateB = new Date(b.weekStart || b.createdAt).getTime();
          return dateB - dateA;
        });
    } catch (error) {
      console.error('[DASHBOARD] Error loading weekly balances:', error);
      this.weeklyBalances = [];
      await this.presentToast('No se pudieron cargar los balances semanales', 'warning');
    } finally {
      this.weeklyBalancesLoading = false;
    }
  }

  async refreshWeeklySyncStatus(): Promise<void> {
    try {
      const idNegocio = await this.ensureBusinessId();
      if (!idNegocio) {
        this.weeklySyncStatus = null;
        return;
      }

      this.weeklySyncStatus = await this.apiService.getDashboardWeeklySyncStatus(idNegocio);
    } catch (error) {
      console.error('[DASHBOARD] Error loading weekly sync status:', error);
      this.weeklySyncStatus = null;
    }
  }

  private async notifyIfWeeklySyncPending(): Promise<void> {
    await this.refreshWeeklySyncStatus();
    const status = this.weeklySyncStatus;

    if (!status?.pending) return;
    if (!status.lastSyncedWeekKey) return;
    if (this.weeklyReminderShownForWeekKey === status.currentWeekKey) return;

    this.weeklyReminderShownForWeekKey = status.currentWeekKey;
    await this.presentToast(
      'Se cerro la semana. Abre "Balances Semanales" y pulsa "Generar balance semanal".',
      'warning'
    );
  }

  async syncWeeklyBalanceNow(): Promise<void> {
    try {
      this.isManualWeeklySyncLoading = true;
      const result = await this.apiService.runWeeklyDashboardSyncIfNeeded();

      if (result.status === 'synced') {
        await this.presentToast('Balance semanal generado y guardado', 'success');
      } else if (result.reason === 'already_synced_this_week') {
        await this.presentToast('Esta semana ya fue sincronizada', 'medium');
      } else if (result.reason === 'no_business') {
        await this.presentToast('No hay negocio activo para sincronizar', 'warning');
      } else if (result.reason === 'no_auth_session') {
        await this.presentToast('Debes iniciar sesion para sincronizar', 'warning');
      } else {
        await this.presentToast('No se pudo sincronizar el balance semanal', 'warning');
      }

      await Promise.all([
        this.loadWeeklyBalances(),
        this.refreshWeeklySyncStatus(),
        this.loadPdfReports()
      ]);
    } catch (error: any) {
      console.error('[DASHBOARD] Error syncing weekly balance:', error);
      await this.presentToast(error?.message || 'Error al generar balance semanal', 'danger');
    } finally {
      this.isManualWeeklySyncLoading = false;
    }
  }

  async loadPdfReports(): Promise<void> {
    try {
      this.pdfReportsLoading = true;
      const idNegocio = await this.ensureBusinessId();
      if (!idNegocio) {
        this.pdfReports = [];
        return;
      }

      const reports = await this.apiService.getBalancePdfReportsByBusiness(idNegocio);
      this.pdfReports = (reports || [])
        .map((item: any) => this.mapPdfReportItem(item))
        .filter((item: BalancePdfReportSummary | null): item is BalancePdfReportSummary => !!item)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error('[DASHBOARD] Error loading PDF reports:', error);
      this.pdfReports = [];
      await this.presentToast('No se pudieron cargar los reportes PDF', 'warning');
    } finally {
      this.pdfReportsLoading = false;
    }
  }

  async generatePdfForBalance(balance: WeeklyBalanceSummary): Promise<void> {
    if (!balance?.idBalance) return;

    try {
      this.generatingPdfBalanceId = balance.idBalance;
      const pdf = await this.apiService.generateBalancePdf(balance.idBalance);
      this.guardarPdf(pdf, balance.weekKey);
      await this.loadPdfReports();
      await this.presentToast('PDF generado y descargado', 'success');
    } catch (error: any) {
      console.error('[DASHBOARD] Error generating PDF:', error);
      await this.presentToast(error?.message || 'No se pudo generar el PDF', 'danger');
    } finally {
      this.generatingPdfBalanceId = '';
    }
  }

  async downloadReport(report: BalancePdfReportSummary): Promise<void> {
    if (!report?.idBalance) return;

    try {
      this.downloadingReportId = report.idReporte;
      const pdf = await this.apiService.downloadBalancePdf(report.idBalance);
      this.guardarPdf(pdf, report.weekKey);
    } catch (error: any) {
      console.error('[DASHBOARD] Error downloading PDF:', error);
      await this.presentToast(error?.message || 'No se pudo descargar el PDF', 'danger');
    } finally {
      this.downloadingReportId = '';
    }
  }

  // Descarga el PDF recibido del backend con el nombre de la semana
  private guardarPdf(pdf: Blob, weekKey: string): void {
    const url = URL.createObjectURL(pdf);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `balance-${(weekKey || 'semanal').replace(/[^\w-]/g, '')}.pdf`;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  get balanceGeneralFmt(): string {
    return this.formatCurrency(this.balanceGeneral);
  }

  get ingresosMesFmt(): string {
    return this.formatCurrency(this.ingresosMes);
  }

  get gastosMesFmt(): string {
    return this.formatCurrency(this.gastosMes);
  }

  get rentabilidadMesFmt(): string {
    return this.formatCurrency(this.rentabilidadMes);
  }

  isDarkMode(): boolean {
    return this.themeService.getDarkMode();
  }

  goTo(route: string): void {
    this.router.navigate([route]);
  }

  goToSettings(): void {
    this.router.navigate(['/tabs/settings']);
  }
}
