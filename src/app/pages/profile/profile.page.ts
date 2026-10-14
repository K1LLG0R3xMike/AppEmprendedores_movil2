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
  IonLabel,
  IonInput,
  IonSpinner
} from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth';
import { ApiService } from '../../services/api-service';
import { addIcons } from 'ionicons';
import { 
  arrowBack,
  camera,
  create,
  save,
  close,
  eye,
  eyeOff,
  key,
  logOut,
  alertCircle,
  refresh,
  checkmark, business } from 'ionicons/icons';

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  business: string;
}

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    IonContent, 
    IonCard, 
    IonCardContent, 
    IonIcon, 
    IonButton, 
    IonLabel,
    IonInput,
    IonSpinner,
    CommonModule, 
    FormsModule
  ]
})
export class ProfilePage implements OnInit {
  // Profile data
  profileData: ProfileData = {
    name: '',
    email: '',
    phone: '',
    business: ''
  };

  // UI state
  isLoading: boolean = true;
  errorMsg: string = '';
  isEditing: boolean = false;
  isSaving: boolean = false;
  isLoggingOut: boolean = false;

  // Password fields
  currentPassword: string = '';
  newPassword: string = '';
  confirmNewPassword: string = '';
  isUpdatingPassword: boolean = false;
  passwordError: string = '';

  // Password visibility toggles
  showCurrentPassword: boolean = false;
  showNewPassword: boolean = false;
  showConfirmPassword: boolean = false;

  // Backup for cancel functionality
  private originalProfileData: ProfileData = {
    name: '',
    email: '',
    phone: '',
    business: ''
  };

  constructor(
    private router: Router,
    public authService: AuthService,
    private apiService: ApiService
  ) {
    
    addIcons({alertCircle,refresh,arrowBack,camera,create,business,save,close,key,logOut,eye,eyeOff,checkmark});
    
  }

  ngOnInit() {
    
    this.fetchUserProfile();
  }

  isDarkMode(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  async fetchUserProfile(): Promise<void> {
    this.isLoading = true;
    this.errorMsg = '';

    try {
      // Verificar si el usuario está autenticado
      
      if (!this.authService.isAuthenticated || !this.authService.uid) {
        throw new Error('Usuario no autenticado');
      }


      // Obtener los datos del usuario usando getUserByUid
      const userData = await this.apiService.getUserByUid(this.authService.uid);
      
      
      // Verificar si los datos están anidados en una propiedad 'data'
      const actualData = userData['data'] || userData;
      

      // 🔹 Cargar datos del negocio usando la misma lógica que business.page.ts
      const businessName = await this.loadBusinessData();
      
      // Mapear los datos del usuario al formato del perfil
      this.profileData = {
        name: actualData['name'] || actualData['displayName'] || 'Usuario',
        email: actualData['email'] || '',
        phone: actualData['phone'] || actualData['phoneNumber'] || actualData['numeroDeTelefono'] || '',
        business: businessName || actualData['business'] || actualData['businessName'] || 'Sin negocio'
      };

      // Si no hay email en los datos del usuario, intentar obtenerlo desde Firebase Auth
      if (!this.profileData.email && this.authService.uid) {
        try {
          const emailFromAuth = await this.apiService.getUserEmail(this.authService.uid);
          if (emailFromAuth) {
            this.profileData.email = emailFromAuth;
          } else {
          }
        } catch (error) {
          // No hacer nada, continuar sin email
        }
      }


      this.backupProfileData();
      this.isLoading = false;
    } catch (error) {
      console.error('[PROFILE] ❌ Error cargando perfil de usuario:', error);
      
      if (error instanceof Error) {
      }
      
      if (error instanceof Error && error.message === 'Usuario no autenticado') {
        // Redirigir al login si no está autenticado
        this.router.navigate(['/login']);
        return;
      }
      
      this.errorMsg = 'Error al cargar perfil: ' + (error instanceof Error ? error.message : 'Error desconocido');
      this.isLoading = false;
    }
  }

  getInitials(): string {
    if (!this.profileData.name) return '';
    return this.profileData.name
      .split(' ')
      .map(word => word.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  // Profile editing methods
  startEditing(): void {
    this.isEditing = true;
    this.backupProfileData();
  }

  async saveChanges(): Promise<void> {
    
    if (!this.isProfileFormValid()) {
      return;
    }

    if (!this.authService.isAuthenticated || !this.authService.uid) {
      this.router.navigate(['/login']);
      return;
    }

    this.isSaving = true;

    try {
      // Preparar los datos del usuario para enviar al backend
      const userData = {
        name: this.profileData.name.trim(),
        email: this.profileData.email.trim(),
        phone: this.profileData.phone.trim(),
        business: this.profileData.business.trim()
      };


      // Llamar al API para actualizar el usuario
      const response = await this.apiService.updateUser(this.authService.uid, userData);
      
      this.isEditing = false;
      this.backupProfileData(); // Update backup after successful save
      
      // TODO: Show success toast message
      
    } catch (error) {
      console.error('[PROFILE] ❌ Error guardando perfil:', error);
      
      if (error instanceof Error) {
      }
      
      this.errorMsg = 'Error al guardar perfil: ' + (error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      this.isSaving = false;
    }
  }

  cancelEditing(): void {
    this.profileData = { ...this.originalProfileData };
    this.isEditing = false;
  }

  private backupProfileData(): void {
    this.originalProfileData = { ...this.profileData };
  }

  private isProfileFormValid(): boolean {
    return !!(this.profileData.name?.trim() && 
              this.profileData.email?.trim() && 
              this.isValidEmail(this.profileData.email));
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Password management methods
  toggleCurrentPassword(): void {
    this.showCurrentPassword = !this.showCurrentPassword;
  }

  toggleNewPassword(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  isPasswordFormValid(): boolean {
    if (!this.currentPassword || !this.newPassword || !this.confirmNewPassword) {
      return false;
    }

    if (this.newPassword.length < 8) {
      this.passwordError = 'La nueva contraseña debe tener al menos 8 caracteres';
      return false;
    }

    if (this.newPassword !== this.confirmNewPassword) {
      this.passwordError = 'Las contraseñas no coinciden';
      return false;
    }

    this.passwordError = '';
    return true;
  }

  async updatePassword(): Promise<void> {
    if (!this.isPasswordFormValid()) {
      return;
    }

    this.isUpdatingPassword = true;
    this.passwordError = '';

    try {
      // Simulate API call to update password
      await this.simulateApiCall(2000);
      
      // Validate current password (simulate)
      if (this.currentPassword !== 'currentpass') {
        throw new Error('La contraseña actual es incorrecta');
      }

      
      // Clear password fields
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmNewPassword = '';
      
      // Show success message (you could use a toast here)
      
    } catch (error) {
      this.passwordError = error instanceof Error ? error.message : 'Error al actualizar contraseña';
      console.error('Error updating password:', error);
    } finally {
      this.isUpdatingPassword = false;
    }
  }

  // Profile picture methods
  changeProfilePicture(): void {
    // Implement photo picker/camera functionality
  }

  // Navigation methods
  goBack(): void {
    this.router.navigate(['/tabs/settings']);
  }

  async logout(): Promise<void> {
    this.isLoggingOut = true;

    try {
      // Usar el método logout del AuthService
      await this.authService.logout();
      
      
      // Navigate to login page
      this.router.navigate(['/login']);
      
    } catch (error) {
      console.error('[PROFILE] ❌ Error durante el logout:', error);
      // Show error message but still navigate to login
      this.router.navigate(['/login']);
    } finally {
      this.isLoggingOut = false;
    }
  }

  // Utility methods
  private async simulateApiCall(delay: number): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate random failures for testing
        if (Math.random() < 0.1) { // 10% chance of failure
          reject(new Error('Error de conexión'));
        } else {
          resolve();
        }
      }, delay);
    });
  }

  // Event handlers for form validation
  onProfileDataChange(): void {
    // Clear any error messages when user starts typing
    if (this.errorMsg) {
      this.errorMsg = '';
    }
  }

  onPasswordChange(): void {
    // Clear password error when user starts typing
    if (this.passwordError) {
      this.passwordError = '';
    }
  }

  // 🔍 Método de debugging para verificar el estado actual
  debugCurrentState(): void {
  }

  // 🔄 Método para forzar recarga de datos (útil para debugging)
  async forceReload(): Promise<void> {
    this.debugCurrentState();
    await this.fetchUserProfile();
  }

  // 🏢 Método para cargar solo los datos del negocio
  private async loadBusinessData(): Promise<string> {
    try {
      if (!this.authService.uid) {
        return 'Sin negocio';
      }

      const businessResponse: any = await this.apiService.getBusinessByUserId(this.authService.uid);
      
      // Handle different response formats (same logic as business page)
      let businessList: any[] = [];
      
      if (Array.isArray(businessResponse)) {
        businessList = businessResponse;
      } else if (businessResponse && businessResponse.data && Array.isArray(businessResponse.data)) {
        businessList = businessResponse.data;
      } else if (businessResponse) {
        businessList = [businessResponse];
      }
      
      if (businessList && businessList.length > 0) {
        const business = businessList[0];
        const businessName = business.nombreNegocio || business.name || '';
        return businessName;
      } else {
        return 'Sin negocio';
      }
    } catch (error) {
      return 'Sin negocio';
    }
  }

  // 🔄 Método para refrescar solo el negocio
  async refreshBusinessData(): Promise<void> {
    const businessName = await this.loadBusinessData();
    this.profileData.business = businessName;
  }
}
