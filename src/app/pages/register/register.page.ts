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
  IonSpinner,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  phonePortrait,
  checkmark,
  close,
  eye,
  eyeOff
} from 'ionicons/icons';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
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
export class RegisterPage implements OnInit {
  // Form fields - exactos como en Flutter
  email: string = '';
  password: string = '';
  confirmPassword: string = '';

  // UI state - exactos como en Flutter
  loading: boolean = false; // _loading en Flutter
  errorMessage: string | null = null; // _errorMessage en Flutter (puede ser null)
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastCtrl: ToastController
  ) {
    addIcons({ 
      phonePortrait,
      checkmark,
      close,
      eye,
      eyeOff
    });
  }

  ngOnInit() {
  }

  // Validation getters - exactos como en Flutter
  get emailValid(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.email);
  }

  get passwordValid(): boolean {
    return this.password.length >= 8;
  }

  get passwordsMatch(): boolean {
    return this.password === this.confirmPassword && this.confirmPassword.length > 0;
  }

  // Form validation - lógica exacta de Flutter
  isFormValid(): boolean {
    return this.emailValid && this.passwordValid && this.passwordsMatch;
  }

  // Event handlers - simplificados como Flutter
  onEmailChange(): void {
    // Solo clear error message como en Flutter
    if (this.errorMessage) {
      this.errorMessage = null;
    }
  }

  onPasswordChange(): void {
    if (this.errorMessage) {
      this.errorMessage = null;
    }
  }

  onConfirmPasswordChange(): void {
    if (this.errorMessage) {
      this.errorMessage = null;
    }
  }

  // Toggle password visibility - exacto como Flutter
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // Registration logic - exacta como Flutter
  async onRegister(): Promise<void> {
    if (!this.isFormValid()) {
      return;
    }

    this.loading = true;
    this.errorMessage = null;

    try {
      // Solo registrar en Firebase Auth y backend usando AuthService.register
      await this.authService.register(this.email, this.password);
      
      // Llamar onRegister callback (como en Flutter widget.onRegister())
      this.onRegisterSuccess();
      
    } catch (error: any) {
      this.errorMessage = error.toString();
      
      // Mostrar SnackBar como en Flutter
      const toast = await this.toastCtrl.create({
        message: this.errorMessage || 'Error desconocido',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
      
    } finally {
      this.loading = false;
    }
  }

  // Navigation - como Flutter widget.onGoToLogin()
  goToLogin(): void {
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  // Handle registration success - como callback en Flutter
  onRegisterSuccess(): void {
    console.log('Registration successful');
    // Navigate to onboarding for new users (corrección del flujo)
    this.router.navigate(['/onboarding'], { replaceUrl: true });
  }
}
