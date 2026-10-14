import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonCard,
  IonCardContent,
  IonIcon,
  IonButton,
  IonFab,
  IonFabButton,
  IonSpinner,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  refresh,
  hardwareChip,
  trendingUp,
  trendingDown,
  barChart,
  warning,
  alertCircle,
  bulb,
  chatbubbleOutline,
  checkmarkCircle,
  closeCircle,
  sparkles
} from 'ionicons/icons';
import { ApiService } from '../../services/api-service';
import { AiService, AiServiceError } from '../../services/ai.service';
import { aFecha } from '../../services/balance.utils';
import {
  AlertaNegocio,
  DatosNegocio,
  ProyeccionMes,
  SerieMes,
  calcularAlertas,
  calcularProyeccionMes,
  calcularSerieMes
} from '../../services/ia-insights.utils';
import { MonthProjectionChartComponent } from '../../components/month-projection-chart/month-projection-chart.component';

type Prioridad = 'alta' | 'media' | 'baja';
type EstadoRecomendacion = 'pendiente' | 'aplicada' | 'descartada';

interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: Prioridad;
  impact: string;
  tipo: string;
  estado: EstadoRecomendacion;
  fecha: Date | null;
}

const PRIORIDAD_ORDEN: Record<Prioridad, number> = { alta: 0, media: 1, baja: 2 };

@Component({
  selector: 'app-ia-panel',
  templateUrl: './ia-panel.page.html',
  styleUrls: ['./ia-panel.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonCard,
    IonCardContent,
    IonIcon,
    IonButton,
    IonFab,
    IonFabButton,
    IonSpinner,
    MonthProjectionChartComponent,
    CommonModule,
    FormsModule
  ]
})
export class IaPanelPage implements OnInit {
  isLoading = true;
  isGenerating = false;
  showHistorial = false;
  updatingId = '';

  alertas: AlertaNegocio[] = [];
  proyeccion: ProyeccionMes | null = null;
  serieMes: SerieMes | null = null;
  recommendations: Recommendation[] = [];

  private idNegocio = '';

  constructor(
    private router: Router,
    private apiService: ApiService,
    private aiService: AiService,
    private toastController: ToastController
  ) {
    addIcons({
      refresh,
      hardwareChip,
      trendingUp,
      trendingDown,
      barChart,
      warning,
      alertCircle,
      bulb,
      chatbubbleOutline,
      checkmarkCircle,
      closeCircle,
      sparkles
    });
  }

  ngOnInit(): void {
    void this.loadPanel();
  }

  // Al volver al panel (p. ej. tras registrar ventas) se recalculan alertas y proyeccion
  ionViewWillEnter(): void {
    if (this.idNegocio && !this.isLoading) {
      void this.loadPanel();
    }
  }

  get pendientes(): Recommendation[] {
    return this.recommendations
      .filter((r) => r.estado === 'pendiente')
      .sort((a, b) => PRIORIDAD_ORDEN[a.priority] - PRIORIDAD_ORDEN[b.priority]);
  }

  get historial(): Recommendation[] {
    return this.recommendations.filter((r) => r.estado !== 'pendiente');
  }

  get ultimaGeneracion(): Date | null {
    const fechas = this.recommendations.map((r) => r.fecha).filter((f): f is Date => !!f);
    return fechas.length ? new Date(Math.max(...fechas.map((f) => f.getTime()))) : null;
  }

  async loadPanel(): Promise<void> {
    try {
      this.isLoading = true;
      const uid = await this.apiService.getUid();
      if (!uid) return;

      const businesses = await this.apiService.getBusinessByUserId(uid);
      const business = businesses?.[0];
      this.idNegocio = business?.['idNegocio'] || business?.['id'] || '';
      if (!this.idNegocio) return;

      const [datos, recomendaciones] = await Promise.all([
        this.loadDatosNegocio(this.idNegocio),
        this.apiService.getAiRecommendationsByBusiness(this.idNegocio).catch(() => [])
      ]);

      this.alertas = calcularAlertas(datos);
      this.proyeccion = calcularProyeccionMes(datos);
      this.serieMes = calcularSerieMes(datos);
      this.recommendations = this.mapRecommendations(recomendaciones);
    } catch (error) {
      console.error('[IA] Error loading panel:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private async loadDatosNegocio(idNegocio: string): Promise<DatosNegocio> {
    const [productos, transacciones, gastosFijos, gastosFijosPagados] = await Promise.all([
      this.apiService.getProductsByBusiness(idNegocio).catch(() => []),
      this.apiService.getTransactionsByBusiness(idNegocio).catch(() => []),
      this.apiService.getGastosFijosByBusiness(idNegocio).catch(() => []),
      this.apiService.getGastosFijosPagados().catch(() => [])
    ]);

    const ventas = (await Promise.all(
      (productos || []).map((p: any) => {
        const idProducto = p?.idProducto || p?.id;
        return idProducto ? this.apiService.getVentasByProducto(idProducto).catch(() => []) : Promise.resolve([]);
      })
    )).flat();

    return {
      productos: productos || [],
      gastosFijos: Array.isArray(gastosFijos) ? gastosFijos : [],
      movimientos: {
        ventas,
        transacciones: transacciones || [],
        gastosFijosPagados: (gastosFijosPagados || []).filter((g: any) => g?.idNegocio === idNegocio)
      },
      hoy: new Date()
    };
  }

  async generateRecommendations(): Promise<void> {
    if (!this.idNegocio || this.isGenerating) return;

    try {
      this.isGenerating = true;
      const nuevas = await this.aiService.generateRecommendations(this.idNegocio);
      this.recommendations = [...this.mapRecommendations(nuevas), ...this.recommendations];
      await this.presentToast(`La IA generó ${nuevas.length} recomendaciones nuevas`, 'success');
    } catch (error: any) {
      const message = error instanceof AiServiceError && error.status === 429 && error.retryAfterSeconds
        ? `IA saturada. Intenta de nuevo en ${error.retryAfterSeconds} segundos.`
        : error?.message || 'No se pudieron generar recomendaciones';
      await this.presentToast(message, 'danger');
    } finally {
      this.isGenerating = false;
    }
  }

  async setEstado(rec: Recommendation, estado: EstadoRecomendacion): Promise<void> {
    const anterior = rec.estado;
    try {
      this.updatingId = rec.id;
      rec.estado = estado;
      await this.apiService.updateAiRecommendationStatus(rec.id, estado);
    } catch (error: any) {
      rec.estado = anterior;
      await this.presentToast(error?.message || 'No se pudo actualizar la recomendación', 'danger');
    } finally {
      this.updatingId = '';
    }
  }

  // Abre el chat con la recomendacion como contexto
  viewDetails(rec: Recommendation): void {
    const pregunta =
      `Explícame en detalle cómo aplicar esta recomendación en mi negocio, paso a paso y con números si es posible:\n\n` +
      `"${rec.title}": ${rec.description}`;
    this.router.navigate(['tabs/chat'], { state: { pregunta } });
  }

  openChat(): void {
    this.router.navigate(['tabs/chat']);
  }

  getPriorityColor(priority: Prioridad): string {
    return { alta: '#f04438', media: '#f79009', baja: '#12b76a' }[priority] || '#667085';
  }

  getPriorityLabel(priority: Prioridad): string {
    return { alta: 'Alta', media: 'Media', baja: 'Baja' }[priority] || 'Normal';
  }

  getEstadoLabel(estado: EstadoRecomendacion): string {
    return { pendiente: 'Pendiente', aplicada: 'Aplicada', descartada: 'Descartada' }[estado];
  }

  money(value: number): string {
    const abs = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Math.abs(value || 0));
    return value < 0 ? `-$${abs}` : `$${abs}`;
  }

  private mapRecommendations(items: any[]): Recommendation[] {
    if (!Array.isArray(items)) return [];

    return items
      .filter((item) => item && (item.idRecomendacion || item.id))
      .map((item: any) => {
        const tipo = String(item?.tipo || '').toLowerCase();
        const prioridad = String(item?.prioridad || item?.priority || '').toLowerCase();
        return {
          id: String(item.idRecomendacion || item.id),
          title: item?.titulo || item?.title || (tipo ? `Recomendación: ${tipo}` : 'Recomendación IA'),
          description: item?.mensaje || item?.descripcion || item?.description || '',
          priority: (['alta', 'media', 'baja'].includes(prioridad) ? prioridad : 'media') as Prioridad,
          impact: item?.impacto || item?.impact || '',
          tipo,
          estado: (['aplicada', 'descartada'].includes(item?.estado) ? item.estado : 'pendiente') as EstadoRecomendacion,
          fecha: aFecha(item?.fechaGeneracion)
        };
      });
  }

  private async presentToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 3000, color, position: 'top' });
    await toast.present();
  }
}
