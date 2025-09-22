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
    console.log('[SETTINGS] 🚀 ngOnInit started');
    
    // Initialize dark mode from theme service
    this.darkMode = this.themeService.getDarkMode();
    console.log('[SETTINGS] 🌙 Dark mode initialized:', this.darkMode);
    
    // Load user data
    console.log('[SETTINGS] 📊 Starting to load user data...');
    this.loadUserData();
  }

  // Load user data from backend
  async loadUserData(): Promise<void> {
    console.log('[SETTINGS] 🚀 Starting loadUserData...');
    this.isLoadingUserData = true;
    
    try {
      // Check if user is authenticated using AuthService like in profile page
      console.log('[SETTINGS] 🔍 Checking authentication...');
      console.log('[SETTINGS] - AuthService.isAuthenticated:', this.authService.isAuthenticated);
      console.log('[SETTINGS] - AuthService.uid:', this.authService.uid);
      
      if (!this.authService.isAuthenticated || !this.authService.uid) {
        console.log('[SETTINGS] ❌ User not authenticated');
        this.userData.name = 'Usuario no identificado';
        this.userData.email = 'Sin correo';
        return;
      }

      const uid = this.authService.uid;
      console.log('[SETTINGS] 📡 Loading user data for UID:', uid);

      // Get user data from backend using the same pattern as profile page
      try {
        const userResponse = await this.apiService.getUserByUid(uid);
        console.log('[SETTINGS] 👤 User data response:', userResponse);

        // Check if data is nested in 'data' property like in profile page
        const actualData = userResponse['data'] || userResponse;
        console.log('[SETTINGS] - Extracted data:', actualData);

        if (actualData && actualData['name']) {
          this.userData.name = actualData['name'];
          console.log('[SETTINGS] ✅ Name loaded:', this.userData.name);
        } else {
          console.log('[SETTINGS] ⚠️ No name found in response');
          this.userData.name = 'Sin nombre';
        }
      } catch (userError) {
        console.error('[SETTINGS] ❌ Error loading user data:', userError);
        this.userData.name = 'Error al cargar nombre';
      }

      // Get email from Firebase Auth like in profile page
      try {
        const email = await this.apiService.getUserEmail(uid);
        console.log('[SETTINGS] 📧 User email:', email);
        
        if (email) {
          this.userData.email = email;
          console.log('[SETTINGS] ✅ Email loaded:', this.userData.email);
        } else {
          console.log('[SETTINGS] ⚠️ No email found');
          this.userData.email = 'Sin correo';
        }
      } catch (emailError) {
        console.error('[SETTINGS] ❌ Error loading email:', emailError);
        this.userData.email = 'Error al cargar email';
      }

      console.log('[SETTINGS] 🎯 Final user data:', this.userData);

    } catch (error: any) {
      console.error('[SETTINGS] ❌ General error loading user data:', error);
      this.userData.name = 'Error al cargar';
      this.userData.email = 'Error al cargar';
    } finally {
      this.isLoadingUserData = false;
      console.log('[SETTINGS] ✅ loadUserData completed');
    }
  }

  // Refresh user data
  async refreshUserData(): Promise<void> {
    console.log('[SETTINGS] Refreshing user data...');
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
    console.log('Dark mode toggled:', this.darkMode);
    
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
    console.log('Change password clicked');
    // TODO: Navigate to change password page or show modal
  }

  twoFactorAuth(): void {
    console.log('Two factor auth clicked');
    // TODO: Navigate to 2FA settings
  }

  connectedDevices(): void {
    console.log('Connected devices clicked');
    // TODO: Show connected devices page
  }

  // Help & Support methods
  helpCenter(): void {
    console.log('Help center clicked');
    // TODO: Navigate to help center or open external link
  }

  contactSupport(): void {
    console.log('Contact support clicked');
    // TODO: Open support chat or email
  }

  termsConditions(): void {
    console.log('Terms and conditions clicked');
    // TODO: Show terms and conditions
  }

  privacyPolicy(): void {
    console.log('Privacy policy clicked');
    // TODO: Show privacy policy
  }

  // Language change handler
  onLanguageChange(): void {
    console.log('Language changed to:', this.language);
    // TODO: Implement language change functionality
  }

  // Notification toggles handlers
  onNotificationsChange(): void {
    console.log('General notifications:', this.notifications);
    // TODO: Update notification preferences
  }

  onEmailNotificationsChange(): void {
    console.log('Email notifications:', this.emailNotifications);
    // TODO: Update email notification preferences
  }

  onPushNotificationsChange(): void {
    console.log('Push notifications:', this.pushNotifications);
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
