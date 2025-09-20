import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { AuthService } from './services/auth';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  constructor(private authService: AuthService) {}

  async ngOnInit() {
    // Inicializar el estado de autenticación al cargar la app
    await this.authService.initAuth();
    
    // Opcional: Suscribirse a cambios en el estado de autenticación
    this.authService.isAuthenticated$.subscribe(isAuth => {
      console.log('Estado de autenticación cambió:', isAuth);
      // Aquí podrías manejar redirecciones globales si es necesario
    });
  }
}
