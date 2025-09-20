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
  logOutOutline
} from 'ionicons/icons';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,
  imports: [
    IonContent, 
    IonCard, 
    IonCardContent, 
    IonIcon, 
    IonButton, 
    IonToggle,
    IonSelect,
    IonSelectOption,
    ToastController,
    AlertController,
    CommonModule, 
    FormsModule
  ]
})
export class SettingsPage implements OnInit {
  // Settings state
  darkMode: boolean = false;
  language: string = 'es';
  notifications: boolean = true;
  emailNotifications: boolean = true;
  pushNotifications: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {
    addIcons({ 
      settings,
      person,
      moon,
      sunny,
      language,
      notifications,
      shieldCheckmark,
      helpCircleOutline,
      logOutOutline
    });
  }

  ngOnInit() {
    // Initialize dark mode from system preference
    this.darkMode = this.isDarkMode();
  }

  isDarkMode(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  toggleDarkMode(): void {
    // Toggle dark mode
    console.log('Dark mode toggled:', this.darkMode);
    // TODO: Implement actual dark mode toggle functionality
    // This would typically involve updating a global theme service
  }

  // Navigation methods
  goToProfile(): void {
    this.router.navigate(['/profile']);
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
