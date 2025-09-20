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
  checkmark
} from 'ionicons/icons';

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

  constructor(private router: Router) {
    addIcons({ 
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
      checkmark
    });
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
      // Simulate API call to fetch user profile
      await this.simulateApiCall(1500);
      
      // Mock data - replace with actual API call
      this.profileData = {
        name: 'Juan Carlos Pérez',
        email: 'juan.perez@empresa.com',
        phone: '+57 300 123 4567',
        business: 'Tienda Virtual JCP'
      };

      this.backupProfileData();
      this.isLoading = false;
    } catch (error) {
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

    this.isSaving = true;

    try {
      // Simulate API call to save profile
      await this.simulateApiCall(2000);
      
      console.log('Profile saved:', this.profileData);
      this.isEditing = false;
      this.backupProfileData(); // Update backup after successful save
      
      // Show success message (you could use a toast here)
      
    } catch (error) {
      console.error('Error saving profile:', error);
      // Show error message
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
    this.isLoggingOut = true;

    try {
      // Simulate logout API call
      await this.simulateApiCall(1500);
      
      // Clear any stored authentication data
      localStorage.removeItem('authToken');
      localStorage.removeItem('userId');
      
      // Navigate to login page
      this.router.navigate(['/login']);
      
    } catch (error) {
      console.error('Error during logout:', error);
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
}
