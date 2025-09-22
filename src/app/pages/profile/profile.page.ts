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
    console.log('[PROFILE] 🏗️ ProfilePage constructor ejecutado');
    console.log('[PROFILE] - Servicios inyectados correctamente');
    
    addIcons({alertCircle,refresh,arrowBack,camera,create,business,save,close,key,logOut,eye,eyeOff,checkmark});
    
    console.log('[PROFILE] - Iconos registrados');
  }

  ngOnInit() {
    console.log('[PROFILE] 🎬 ProfilePage iniciado');
    console.log('[PROFILE] - Verificando estado inicial del AuthService...');
    console.log('[PROFILE] - isAuthenticated:', this.authService.isAuthenticated);
    console.log('[PROFILE] - uid:', this.authService.uid);
    console.log('[PROFILE] - token:', this.authService.token ? 'Token presente' : 'No token');
    
    this.fetchUserProfile();
  }

  isDarkMode(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  async fetchUserProfile(): Promise<void> {
    console.log('[PROFILE] 🚀 Iniciando carga de perfil de usuario...');
    this.isLoading = true;
    this.errorMsg = '';

    try {
      // Verificar si el usuario está autenticado
      console.log('[PROFILE] 🔍 Verificando autenticación...');
      console.log('[PROFILE] - AuthService.isAuthenticated:', this.authService.isAuthenticated);
      console.log('[PROFILE] - AuthService.uid:', this.authService.uid);
      
      if (!this.authService.isAuthenticated || !this.authService.uid) {
        console.log('[PROFILE] ❌ Usuario no autenticado, redirigiendo al login');
        throw new Error('Usuario no autenticado');
      }

      console.log('[PROFILE] ✅ Usuario autenticado, obteniendo datos...');
      console.log('[PROFILE] - UID del usuario:', this.authService.uid);

      // Obtener los datos del usuario usando getUserByUid
      console.log('[PROFILE] 📡 Llamando a getUserByUid...');
      const userData = await this.apiService.getUserByUid(this.authService.uid);
      
      console.log('[PROFILE] 📦 Datos recibidos del servidor:');
      console.log('[PROFILE] - Raw userData:', JSON.stringify(userData, null, 2));
      
      // Verificar si los datos están anidados en una propiedad 'data'
      const actualData = userData['data'] || userData;
      
      console.log('[PROFILE] - Datos extraídos:', JSON.stringify(actualData, null, 2));
      console.log('[PROFILE] - actualData.name:', actualData['name']);
      console.log('[PROFILE] - actualData.email:', actualData['email']);
      console.log('[PROFILE] - actualData.numeroDeTelefono:', actualData['numeroDeTelefono']);
      console.log('[PROFILE] - actualData.phone:', actualData['phone']);
      console.log('[PROFILE] - actualData.business:', actualData['business']);

      // 🔹 Cargar datos del negocio usando la misma lógica que business.page.ts
      console.log('[PROFILE] 🏢 Cargando datos del negocio...');
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
        console.log('[PROFILE] 📧 Email no encontrado en datos, obteniendo desde Firebase Auth...');
        try {
          const emailFromAuth = await this.apiService.getUserEmail(this.authService.uid);
          if (emailFromAuth) {
            this.profileData.email = emailFromAuth;
            console.log('[PROFILE] ✅ Email obtenido desde Firebase Auth:', emailFromAuth);
          } else {
            console.log('[PROFILE] ⚠️ No se pudo obtener email desde Firebase Auth');
          }
        } catch (error) {
          console.log('[PROFILE] ❌ Error obteniendo email desde Firebase Auth:', error);
          // No hacer nada, continuar sin email
        }
      }

      console.log('[PROFILE] 🎯 Datos mapeados al perfil:');
      console.log('[PROFILE] - profileData.name:', this.profileData.name);
      console.log('[PROFILE] - profileData.email:', this.profileData.email);
      console.log('[PROFILE] - profileData.phone:', this.profileData.phone);
      console.log('[PROFILE] - profileData.business:', this.profileData.business);

      this.backupProfileData();
      this.isLoading = false;
      console.log('[PROFILE] ✅ Perfil cargado exitosamente con negocio:', this.profileData.business);
    } catch (error) {
      console.error('[PROFILE] ❌ Error cargando perfil de usuario:', error);
      console.log('[PROFILE] - Error type:', typeof error);
      console.log('[PROFILE] - Error instanceof Error:', error instanceof Error);
      
      if (error instanceof Error) {
        console.log('[PROFILE] - Error message:', error.message);
        console.log('[PROFILE] - Error stack:', error.stack);
      }
      
      if (error instanceof Error && error.message === 'Usuario no autenticado') {
        console.log('[PROFILE] 🔄 Redirigiendo al login...');
        // Redirigir al login si no está autenticado
        this.router.navigate(['/login']);
        return;
      }
      
      this.errorMsg = 'Error al cargar perfil: ' + (error instanceof Error ? error.message : 'Error desconocido');
      this.isLoading = false;
      console.log('[PROFILE] - Error final mostrado al usuario:', this.errorMsg);
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
    console.log('[PROFILE] 💾 Iniciando guardado de cambios...');
    console.log('[PROFILE] - Datos actuales del perfil:', JSON.stringify(this.profileData, null, 2));
    
    if (!this.isProfileFormValid()) {
      console.log('[PROFILE] ❌ Formulario no válido, cancelando guardado');
      return;
    }

    console.log('[PROFILE] ✅ Formulario válido, verificando autenticación...');
    if (!this.authService.isAuthenticated || !this.authService.uid) {
      console.log('[PROFILE] ❌ Usuario no autenticado, redirigiendo al login');
      this.router.navigate(['/login']);
      return;
    }

    console.log('[PROFILE] 🔄 Iniciando proceso de guardado...');
    this.isSaving = true;

    try {
      // Preparar los datos del usuario para enviar al backend
      const userData = {
        name: this.profileData.name.trim(),
        email: this.profileData.email.trim(),
        phone: this.profileData.phone.trim(),
        business: this.profileData.business.trim()
      };

      console.log('[PROFILE] 📤 Datos preparados para enviar:');
      console.log('[PROFILE] - userData:', JSON.stringify(userData, null, 2));
      console.log('[PROFILE] - UID del usuario:', this.authService.uid);

      // Llamar al API para actualizar el usuario
      console.log('[PROFILE] 📡 Llamando a updateUser...');
      const response = await this.apiService.updateUser(this.authService.uid, userData);
      console.log('[PROFILE] 📦 Respuesta del servidor:', response);
      
      console.log('[PROFILE] ✅ Perfil guardado exitosamente');
      this.isEditing = false;
      this.backupProfileData(); // Update backup after successful save
      
      // TODO: Show success toast message
      console.log('[PROFILE] 🎉 Perfil actualizado correctamente');
      
    } catch (error) {
      console.error('[PROFILE] ❌ Error guardando perfil:', error);
      console.log('[PROFILE] - Error type:', typeof error);
      
      if (error instanceof Error) {
        console.log('[PROFILE] - Error message:', error.message);
        console.log('[PROFILE] - Error stack:', error.stack);
      }
      
      this.errorMsg = 'Error al guardar perfil: ' + (error instanceof Error ? error.message : 'Error desconocido');
      console.log('[PROFILE] - Error mostrado al usuario:', this.errorMsg);
    } finally {
      this.isSaving = false;
      console.log('[PROFILE] 🏁 Proceso de guardado finalizado');
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

      console.log('Password updated successfully');
      
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
    console.log('Change profile picture');
  }

  // Navigation methods
  goBack(): void {
    this.router.navigate(['/tabs/settings']);
  }

  async logout(): Promise<void> {
    console.log('[PROFILE] 🚪 Iniciando proceso de logout...');
    this.isLoggingOut = true;

    try {
      console.log('[PROFILE] 📡 Llamando a AuthService.logout()...');
      // Usar el método logout del AuthService
      await this.authService.logout();
      
      console.log('[PROFILE] ✅ Logout exitoso');
      console.log('[PROFILE] 🔄 Navegando al login...');
      
      // Navigate to login page
      this.router.navigate(['/login']);
      
    } catch (error) {
      console.error('[PROFILE] ❌ Error durante el logout:', error);
      console.log('[PROFILE] 🔄 Navegando al login de todas formas...');
      // Show error message but still navigate to login
      this.router.navigate(['/login']);
    } finally {
      this.isLoggingOut = false;
      console.log('[PROFILE] 🏁 Proceso de logout finalizado');
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
    console.log('[PROFILE DEBUG] 🔍 Estado actual del ProfilePage:');
    console.log('[PROFILE DEBUG] ==========================================');
    console.log('[PROFILE DEBUG] 🔐 Estado de Autenticación:');
    console.log('[PROFILE DEBUG] - isAuthenticated:', this.authService.isAuthenticated);
    console.log('[PROFILE DEBUG] - uid:', this.authService.uid);
    console.log('[PROFILE DEBUG] - token presente:', this.authService.token ? 'Sí' : 'No');
    console.log('[PROFILE DEBUG] ');
    console.log('[PROFILE DEBUG] 📊 Estado de la UI:');
    console.log('[PROFILE DEBUG] - isLoading:', this.isLoading);
    console.log('[PROFILE DEBUG] - errorMsg:', this.errorMsg);
    console.log('[PROFILE DEBUG] - isEditing:', this.isEditing);
    console.log('[PROFILE DEBUG] - isSaving:', this.isSaving);
    console.log('[PROFILE DEBUG] ');
    console.log('[PROFILE DEBUG] 👤 Datos del Perfil:');
    console.log('[PROFILE DEBUG] - profileData:', JSON.stringify(this.profileData, null, 2));
    console.log('[PROFILE DEBUG] - originalProfileData:', JSON.stringify(this.originalProfileData, null, 2));
    console.log('[PROFILE DEBUG] ==========================================');
  }

  // 🔄 Método para forzar recarga de datos (útil para debugging)
  async forceReload(): Promise<void> {
    console.log('[PROFILE] 🔄 Forzando recarga de datos...');
    this.debugCurrentState();
    await this.fetchUserProfile();
  }

  // 🏢 Método para cargar solo los datos del negocio
  private async loadBusinessData(): Promise<string> {
    try {
      if (!this.authService.uid) {
        console.log('[PROFILE] ❌ No hay UID para cargar negocio');
        return 'Sin negocio';
      }

      console.log('[PROFILE] 🏢 Cargando datos del negocio para UID:', this.authService.uid);
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
        console.log('[PROFILE] ✅ Negocio encontrado:', businessName);
        return businessName;
      } else {
        console.log('[PROFILE] ℹ️ No se encontraron negocios');
        return 'Sin negocio';
      }
    } catch (error) {
      console.log('[PROFILE] ⚠️ Error cargando negocio:', error);
      return 'Sin negocio';
    }
  }

  // 🔄 Método para refrescar solo el negocio
  async refreshBusinessData(): Promise<void> {
    console.log('[PROFILE] 🔄 Refrescando datos del negocio...');
    const businessName = await this.loadBusinessData();
    this.profileData.business = businessName;
    console.log('[PROFILE] ✅ Negocio actualizado:', businessName);
  }
}
