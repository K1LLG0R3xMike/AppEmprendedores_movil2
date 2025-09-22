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
  trendingDownOutline, settingsOutline } from 'ionicons/icons';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth';
import { ApiService } from '../../services/api-service';

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
  userName: string = '';
  isLoading: boolean = true;

  constructor(
    private router: Router,
    private themeService: ThemeService,
    private authService: AuthService,
    private apiService: ApiService
  ) {
    addIcons({settingsOutline,cashOutline,arrowUpOutline,arrowDownOutline,cubeOutline,hardwareChipOutline,businessOutline,trendingUpOutline,trendingDownOutline});
  }

  async ngOnInit() {
    await this.loadUserData();
  }

  private async loadUserData(): Promise<void> {
    try {
      this.isLoading = true;
      
      if (!this.authService.isAuthenticated || !this.authService.uid) {
        console.log('[DASHBOARD] Usuario no autenticado');
        this.userName = 'Usuario';
        return;
      }

      console.log('[DASHBOARD] 📡 Obteniendo datos del usuario con UID:', this.authService.uid);
      const userData = await this.apiService.getUserByUid(this.authService.uid);
      
      console.log('[DASHBOARD] 📦 Datos recibidos del servidor:');
      console.log('[DASHBOARD] - Raw userData:', JSON.stringify(userData, null, 2));
      
      // Verificar si los datos están anidados en una propiedad 'data' (misma lógica que profile page)
      const actualData = userData['data'] || userData;
      
      console.log('[DASHBOARD] - Datos extraídos:', JSON.stringify(actualData, null, 2));
      console.log('[DASHBOARD] - actualData.name:', actualData['name']);
      console.log('[DASHBOARD] - actualData.displayName:', actualData['displayName']);
      
      // Múltiples fallbacks para obtener el nombre (misma lógica que profile page)
      if (actualData && (actualData['name'] || actualData['displayName'])) {
        this.userName = actualData['name'] || actualData['displayName'] || 'Usuario';
        console.log('[DASHBOARD] ✅ Nombre de usuario cargado:', this.userName);
      } else {
        this.userName = 'Usuario';
        console.log('[DASHBOARD] ⚠️ No se encontró el nombre del usuario, usando valor por defecto');
      }
    } catch (error) {
      console.error('[DASHBOARD] ❌ Error cargando datos del usuario:', error);
      this.userName = 'Usuario';
    } finally {
      this.isLoading = false;
    }
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
