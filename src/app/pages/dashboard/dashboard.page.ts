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
  settingsOutline
} from 'ionicons/icons';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth';
import { ApiService } from '../../services/api-service';

interface DashboardActivity {
  title: string;
  time: string;
  amount: number;
  type: 'income' | 'expense';
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

  recentActivities: DashboardActivity[] = [];

  constructor(
    private router: Router,
    private themeService: ThemeService,
    private authService: AuthService,
    private apiService: ApiService
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
      trendingDownOutline
    });
  }

  async ngOnInit() {
    await this.loadDashboardContext();
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
      this.businessName = business['nombreNegocio'] || 'Negocio';

      const { year, month } = this.getCurrentYearMonth();

      const [
        rentabilidadLive,
        resumenVentas,
        gastosFijos,
        transacciones,
        productos,
        egresosShort
      ] = await Promise.all([
        this.apiService.getRentabilidadLive(idNegocio, year, month).catch(() => null),
        this.apiService.getResumenVentasByNegocioEnMes(idNegocio, year, month).catch(() => null),
        this.apiService.getGastosFijosByBusiness(idNegocio).catch(() => ({ totals: {}, data: [] })),
        this.apiService.getTransactionsByBusiness(idNegocio).catch(() => []),
        this.apiService.getProductsByBusiness(idNegocio).catch(() => []),
        this.apiService.getEgresosByMonthShort(idNegocio, year, month).catch(() => ({ totalEgresos: 0, count: 0 }))
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
      this.balanceGeneral = 0;
      this.productosCount = (productos || []).length;

      this.recentActivities = (transacciones || [])
        .slice()
        .sort((a: any, b: any) => {
          const da = new Date(this.normalizeDate(a.date || a.fechaISO || a.fecha)).getTime();
          const db = new Date(this.normalizeDate(b.date || b.fechaISO || b.fecha)).getTime();
          return db - da;
        })
        .slice(0, 4)
        .map((t: any) => ({
          title: t.description || 'Movimiento',
          time: this.formatRelativeTime(this.normalizeDate(t.date || t.fechaISO || t.fecha)),
          amount: Number(t.amount || t.monto || 0),
          type: (t.type === 'income' || t.tipo === false) ? 'income' : 'expense'
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
