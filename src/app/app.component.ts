import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { AuthService } from './services/auth';
import { ApiService } from './services/api-service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private apiService: ApiService
  ) {}

  async ngOnInit() {
    // Inicializar el estado de autenticación al cargar la app
    await this.authService.initAuth();

    // Inicia scheduler semanal para sincronizar snapshot de balance con Firebase
    this.apiService.startWeeklyDashboardSyncScheduler();
    
    // Opcional: Suscribirse a cambios en el estado de autenticación
    this.authService.isAuthenticated$.subscribe(isAuth => {
      console.log('Estado de autenticación cambió:', isAuth);
      if (isAuth) {
        this.apiService.runWeeklyDashboardSyncIfNeeded().catch((error) => {
          console.warn('[APP] Weekly sync check after auth failed:', error);
        });
      }
      // Aquí podrías manejar redirecciones globales si es necesario
    });
  }
}
