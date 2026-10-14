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
  IonToggle,
  IonSelect,
  IonSelectOption,
  ToastController,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  settings,
  person,
  moon,
  sunny,
  language,
  notifications,
  shieldCheckmark,
  helpCircleOutline,
  logOutOutline,
  business,
  arrowForward, refresh } from 'ionicons/icons';
import { AuthService } from '../../services/auth';
import { ThemeService } from '../../services/theme.service';
import { ApiService } from '../../services/api-service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,
  imports: [IonContent, IonCard, IonCardContent, IonIcon, IonButton, IonToggle,IonSelect,IonSelectOption,CommonModule, FormsModule]
})
export class SettingsPage implements OnInit {
  // Settings state
  darkMode: boolean = false;
  language: string = 'es';
  notifications: boolean = true;
  emailNotifications: boolean = true;
  pushNotifications: boolean = false;

  // User data
  userData = {
    name: 'Cargando...',
    email: 'Cargando...'
  };
  isLoadingUserData = true;

  constructor(
    private router: Router,
    private authService: AuthService,
    private themeService: ThemeService,
    private apiService: ApiService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {
    addIcons({settings,person,refresh,business,arrowForward,language,notifications,shieldCheckmark,helpCircleOutline,moon,sunny,logOutOutline});
  }

  ngOnInit() {
    
    // Initialize dark mode from theme service
    this.darkMode = this.themeService.getDarkMode();
    
    // Load user data
    this.loadUserData();
  }

  // Load user data from backend
  async loadUserData(): Promise<void> {
    this.isLoadingUserData = true;
    
    try {
      // Check if user is authenticated using AuthService like in profile page
      
      if (!this.authService.isAuthenticated || !this.authService.uid) {
        this.userData.name = 'Usuario no identificado';
        this.userData.email = 'Sin correo';
        return;
      }

      const uid = this.authService.uid;

      // Get user data from backend using the same pattern as profile page
      try {
        const userResponse = await this.apiService.getUserByUid(uid);

        // Check if data is nested in 'data' property like in profile page
        const actualData = userResponse['data'] || userResponse;

        if (actualData && actualData['name']) {
          this.userData.name = actualData['name'];
        } else {
          this.userData.name = 'Sin nombre';
        }
      } catch (userError) {
        console.error('[SETTINGS] ❌ Error loading user data:', userError);
        this.userData.name = 'Error al cargar nombre';
      }

      // Get email from Firebase Auth like in profile page
      try {
        const email = await this.apiService.getUserEmail(uid);
        
        if (email) {
          this.userData.email = email;
        } else {
          this.userData.email = 'Sin correo';
        }
      } catch (emailError) {
        console.error('[SETTINGS] ❌ Error loading email:', emailError);
        this.userData.email = 'Error al cargar email';
      }


    } catch (error: any) {
      console.error('[SETTINGS] ❌ General error loading user data:', error);
      this.userData.name = 'Error al cargar';
      this.userData.email = 'Error al cargar';
    } finally {
      this.isLoadingUserData = false;
    }
  }

  // Refresh user data
  async refreshUserData(): Promise<void> {
    await this.loadUserData();
    
    const toast = await this.toastCtrl.create({
      message: 'Datos actualizados',
      duration: 2000,
      color: 'success'
    });
    await toast.present();
  }

  isDarkMode(): boolean {
    return this.themeService.getDarkMode();
  }

  async toggleDarkMode(): Promise<void> {
    
    try {
      await this.themeService.setDarkMode(this.darkMode);
      
      
      
    } catch (error) {
      console.error('Error toggling dark mode:', error);
      
      
      // Revertir el toggle en caso de error
      this.darkMode = !this.darkMode;
    }
  }

  // Navigation methods
  goToProfile(): void {
    this.router.navigate(['/tabs/profile']);
  }

  goToBusiness(): void {
    this.router.navigate(['tabs/business']);
  }

  // Security methods
  changePassword(): void {
    // TODO: Navigate to change password page or show modal
  }

  twoFactorAuth(): void {
    // TODO: Navigate to 2FA settings
  }

  connectedDevices(): void {
    // TODO: Show connected devices page
  }

  // Help & Support methods
  helpCenter(): void {
    // TODO: Navigate to help center or open external link
  }

  contactSupport(): void {
    // TODO: Open support chat or email
  }

  termsConditions(): void {
    // TODO: Show terms and conditions
  }

  privacyPolicy(): void {
    // TODO: Show privacy policy
  }

  // Language change handler
  onLanguageChange(): void {
    // TODO: Implement language change functionality
  }

  // Notification toggles handlers
  onNotificationsChange(): void {
    // TODO: Update notification preferences
  }

  onEmailNotificationsChange(): void {
    // TODO: Update email notification preferences
  }

  onPushNotificationsChange(): void {
    // TODO: Update push notification preferences
  }

  // Logout functionality
  async logout(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que quieres cerrar sesión?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Cerrar Sesión',
          role: 'destructive',
          handler: async () => {
            try {
              await this.authService.logout();
              
              const toast = await this.toastCtrl.create({
                message: 'Sesión cerrada correctamente',
                duration: 2000,
                color: 'success'
              });
              await toast.present();

              // Redirigir al login
              this.router.navigate(['/login']);
            } catch (error: any) {
              const toast = await this.toastCtrl.create({
                message: error.message || 'Error al cerrar sesión',
                duration: 3000,
                color: 'danger'
              });
              await toast.present();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  // Get user info
  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated;
  }

  get userUid(): string | null {
    return this.authService.uid;
  }
}
