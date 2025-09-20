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

interface Recommendation {
  id: number;
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
  recommendations: Recommendation[] = [
    {
      id: 1,
      title: 'Optimizar inventario de Zapatillas Deportivas',
      description: 'El stock está bajo (12 unidades). Basado en las ventas históricas, se recomienda reabastecer con 30 unidades.',
      priority: 'high',
      impact: 'Evitar pérdida de ventas por falta de stock'
    },
    {
      id: 2,
      title: 'Ajustar precio de Camiseta Básica',
      description: 'El margen de ganancia es del 52%. Podrías reducir el precio en 5% para aumentar las ventas sin afectar significativamente la rentabilidad.',
      priority: 'medium',
      impact: 'Incremento estimado del 15% en ventas'
    },
    {
      id: 3,
      title: 'Promocionar Mochila Urbana',
      description: 'Este producto tiene buen margen pero pocas ventas. Una campaña promocional podría aumentar su rotación.',
      priority: 'low',
      impact: 'Mejorar rotación de inventario'
    }
  ];

  constructor(private router: Router) {
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

  ngOnInit() {
  }

  isDarkMode(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high':
        return '#f04438'; // Red
      case 'medium':
        return '#f79009'; // Yellow/Orange
      case 'low':
        return '#12b76a'; // Green
      default:
        return '#667085'; // Gray
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

  applyRecommendation(id: number): void {
    console.log('Applying recommendation:', id);
    // TODO: Implement recommendation application logic
  }

  viewDetails(id: number): void {
    console.log('Viewing details for recommendation:', id);
    // TODO: Navigate to detailed view or show modal
  }

  openChat(): void {
    this.router.navigate(['/chat']);
  }

  refreshRecommendations(): void {
    console.log('Refreshing AI recommendations...');
    // TODO: Implement refresh logic
  }
}
