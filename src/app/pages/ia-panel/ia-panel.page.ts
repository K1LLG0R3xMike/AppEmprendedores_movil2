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
  IonFabButton
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  refresh,
  hardwareChip,
  trendingUp,
  barChart,
  warning,
  bulb,
  chatbubbleOutline
} from 'ionicons/icons';
import { ApiService } from '../../services/api-service';

interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  impact: string;
}

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
    CommonModule,
    FormsModule
  ]
})
export class IaPanelPage implements OnInit {
  recommendations: Recommendation[] = [];

  constructor(
    private router: Router,
    private apiService: ApiService
  ) {
    addIcons({
      refresh,
      hardwareChip,
      trendingUp,
      barChart,
      warning,
      bulb,
      chatbubbleOutline
    });
  }

  ngOnInit(): void {
    void this.loadRecommendationsFromBackend();
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high':
        return '#f04438';
      case 'medium':
        return '#f79009';
      case 'low':
        return '#12b76a';
      default:
        return '#667085';
    }
  }

  getPriorityLabel(priority: string): string {
    switch (priority) {
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Media';
      case 'low':
        return 'Baja';
      default:
        return 'Normal';
    }
  }

  applyRecommendation(id: string): void {
    console.log('Applying recommendation:', id);
  }

  viewDetails(id: string): void {
    console.log('Viewing details for recommendation:', id);
  }

  openChat(): void {
    this.router.navigate(['tabs/chat']);
  }

  refreshRecommendations(): void {
    console.log('Refreshing AI recommendations...');
    void this.loadRecommendationsFromBackend();
  }

  private async loadRecommendationsFromBackend(): Promise<void> {
    try {
      const uid = await this.apiService.getUid();
      if (!uid) {
        this.recommendations = [];
        return;
      }

      const businesses = await this.apiService.getBusinessByUserId(uid);
      const idNegocio = this.resolveBusinessId(businesses);
      if (!idNegocio) {
        this.recommendations = [];
        return;
      }

      const items = await this.apiService.getAiRecommendationsByBusiness(idNegocio);
      this.recommendations = this.mapBackendRecommendations(items);
    } catch (error) {
      console.error('[IA] Error loading recommendations:', error);
      this.recommendations = [];
    }
  }

  private resolveBusinessId(businesses: any[]): string | null {
    if (!Array.isArray(businesses) || businesses.length === 0) {
      return null;
    }

    const firstBusiness = businesses[0];
    return firstBusiness?.idNegocio || firstBusiness?.id || firstBusiness?._id || null;
  }

  private mapBackendRecommendations(items: any[]): Recommendation[] {
    if (!Array.isArray(items)) {
      return [];
    }

    return items.map((item: any, index: number) => {
      const typeRaw = String(item?.tipo || item?.type || '').toLowerCase();
      const priority = this.resolvePriority(typeRaw, item?.priority);
      const id = String(item?.idRecomendacion || item?.id || `ia-rec-${index}`);

      return {
        id,
        title: item?.titulo || item?.title || (typeRaw ? `Recomendacion: ${typeRaw}` : 'Recomendacion IA'),
        description: item?.mensaje || item?.descripcion || item?.description || 'Sin descripcion',
        priority,
        impact: item?.impacto || item?.impact || 'Revisar sugerencia para tu negocio'
      };
    });
  }

  private resolvePriority(typeRaw: string, priorityRaw: any): 'high' | 'medium' | 'low' {
    const priority = String(priorityRaw || '').toLowerCase();
    if (priority === 'high' || priority === 'alta') return 'high';
    if (priority === 'medium' || priority === 'media') return 'medium';
    if (priority === 'low' || priority === 'baja') return 'low';

    if (typeRaw.includes('alerta') || typeRaw.includes('riesgo')) return 'high';
    if (typeRaw.includes('rentabilidad') || typeRaw.includes('balance')) return 'medium';

    return 'low';
  }
}
