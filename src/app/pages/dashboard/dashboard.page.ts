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
  IonButton
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
  listOutline
} from 'ionicons/icons';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth';
import { ApiService, DashboardWeeklySyncStatus } from '../../services/api-service';

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
  pdfUrl: string;
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
  currentBusinessId: string = '';

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
      listOutline
    });
  }

  async ngOnInit() {
    await this.loadBalanceFromStorage();
    await this.loadDashboardContext();
    await this.notifyIfWeeklySyncPending();
  }

  async ionViewWillEnter() {
    await this.loadBalanceFromStorage();
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
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  private formatRelativeTime(dateValue: any): string {
    const date = new Date(dateValue);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Hace minutos';
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    return `Hace ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  }

  private normalizeDate(value: any): string {
    if (!value) return new Date().toISOString();
    if (typeof value === 'string') return value;
    if (value?.toDate && typeof value.toDate === 'function') return value.toDate().toISOString();
    if (typeof value?._seconds === 'number') return new Date(value._seconds * 1000).toISOString();
    return new Date().toISOString();
  }

  private async loadBalanceFromStorage(): Promise<void> {
    try {
      this.balanceGeneral = await this.apiService.getDashboardBalanceLocal();
    } catch (error) {
      console.error('[DASHBOARD] Error loading local balance:', error);
      this.balanceGeneral = 0;
    }
  }

  private async loadDashboardContext(): Promise<void> {
    try {
      this.isLoading = true;
      await this.loadBalanceFromStorage();
      await this.loadUserData();

      const uid = this.authService.uid || await this.apiService.getUid();
      if (!uid) return;

      const businesses = await this.apiService.getBusinessByUserId(uid);
      if (!businesses || businesses.length === 0) return;

      const business = businesses[0];
      const idNegocio = business['idNegocio'] || business['id'];
      this.currentBusinessId = idNegocio;
      this.businessName = business['nombreNegocio'] || 'Negocio';

      const { year, month } = this.getCurrentYearMonth();

      const [
        rentabilidadLive,
        resumenVentas,
        gastosFijos,
        transacciones,
        productos,
        egresosShort,
        gastosFijosPagados
      ] = await Promise.all([
        this.apiService.getRentabilidadLive(idNegocio, year, month).catch(() => null),
        this.apiService.getResumenVentasByNegocioEnMes(idNegocio, year, month).catch(() => null),
        this.apiService.getGastosFijosByBusiness(idNegocio).catch(() => ({ totals: {}, data: [] })),
        this.apiService.getTransactionsByBusiness(idNegocio).catch(() => []),
        this.apiService.getProductsByBusiness(idNegocio).catch(() => []),
        this.apiService.getEgresosByMonthShort(idNegocio, year, month).catch(() => ({ totalEgresos: 0, count: 0 })),
        this.apiService.getGastosFijosPagados().catch(() => [])
      ]);

      const gastosFijosPayload: any = gastosFijos;
      const totalGastosFijosPayload = Array.isArray(gastosFijosPayload)
        ? 0
        : Number(gastosFijosPayload?.totals?.totalGastos ?? 0);

      const totalVentas = Number(resumenVentas?.totalVentas ?? 0);
      const utilidadVentas = Number(resumenVentas?.utilidadTotal ?? 0);
      const rentabilidadNeta = Number(rentabilidadLive?.rentabilidadNeta ?? utilidadVentas);
      const egresos = Number(egresosShort?.totalEgresos ?? 0);
      const gastosFijosMes = totalGastosFijosPayload;
      const totalGastosMes = egresos + gastosFijosMes;

      this.ingresosMes = totalVentas;
      this.gastosMes = totalGastosMes;
      this.rentabilidadMes = rentabilidadNeta;
      this.productosCount = (productos || []).length;

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

      const actividadesTransacciones = (transacciones || []).map((t: any) => ({
        title: t.description || t.descripcion || 'Transaccion',
        date: this.normalizeDate(t.date || t.fechaISO || t.fecha),
        amount: Math.abs(Number(t.amount || t.monto || 0)),
        type: (t.type === 'income' || t.tipo === false || t.tipo === 0) ? 'income' as const : 'expense' as const
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
          time: this.formatRelativeTime(activity.date),
          amount: activity.amount,
          type: activity.type
        }));
    } catch (error) {
      console.error('[DASHBOARD] Error loading dashboard context:', error);
    } finally {
      this.isLoading = false;
    }
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
      pdfUrl: report?.pdfUrl || '',
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

  async generatePdfForBalance(idBalance: string): Promise<void> {
    if (!idBalance) return;

    try {
      this.generatingPdfBalanceId = idBalance;
      const response = await this.apiService.generateBalancePdf(idBalance);
      const pdfUrl = response?.data?.pdfUrl || response?.pdfUrl || '';

      await this.loadPdfReports();
      await this.presentToast('PDF generado correctamente', 'success');

      if (pdfUrl) {
        window.open(pdfUrl, '_blank');
      }
    } catch (error: any) {
      console.error('[DASHBOARD] Error generating PDF:', error);
      await this.presentToast(error?.message || 'No se pudo generar el PDF', 'danger');
    } finally {
      this.generatingPdfBalanceId = '';
    }
  }

  openPdfUrl(pdfUrl: string): void {
    if (!pdfUrl) return;
    window.open(pdfUrl, '_blank');
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
