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
    ToastController,
    CommonModule, 
    FormsModule
  ]
})
export class RegisterPage implements OnInit {
  // Form fields
  email: string = '';
  password: string = '';
  confirmPassword: string = '';

  // UI state
  loading: boolean = false;
  errorMessage: string = '';
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

  isDarkMode(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // Validation getters
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

  // Form validation
  isFormValid(): boolean {
    return this.emailValid && this.passwordValid && this.passwordsMatch;
  }

  // Event handlers
  onEmailChange(): void {
    // Clear error message when user starts typing
    if (this.errorMessage) {
      this.errorMessage = '';
    }
  }

  onPasswordChange(): void {
    // Clear error message when user starts typing
    if (this.errorMessage) {
      this.errorMessage = '';
    }
  }

  onConfirmPasswordChange(): void {
    // Clear error message when user starts typing
    if (this.errorMessage) {
      this.errorMessage = '';
    }
  }

  // Toggle password visibility
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // Registration logic
  async onRegister(): Promise<void> {
    if (!this.isFormValid()) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      // Usar el AuthService para registro
      await this.authService.register(this.email, this.password);
      
      const toast = await this.toastCtrl.create({
        message: 'Registro exitoso',
        duration: 2000,
        color: 'success'
      });
      await toast.present();

      // Navigate to dashboard on success
      this.router.navigate(['/tabs/dashboard']);
      
    } catch (error: any) {
      const msg = error.message || 'Error en el registro';
      this.errorMessage = msg;
      
      const toast = await this.toastCtrl.create({
        message: msg,
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
      
      console.error('Registration error:', error);
    } finally {
      this.loading = false;
    }
  }

  // Simulate registration API call
  private async registerUser(email: string, password: string): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate different scenarios
        if (email === 'test@error.com') {
          reject(new Error('Este email ya está registrado'));
        } else if (password === 'weakpass') {
          reject(new Error('La contraseña no cumple con los requisitos de seguridad'));
        } else {
          console.log('User registered successfully:', { email });
          resolve();
        }
      }, 2000); // Simulate network delay
    });
  }

  // Navigation
  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  // Handle registration success (callback for parent component if needed)
  onRegisterSuccess(): void {
    console.log('Registration successful');
    // Could emit event or call parent callback here
  }
}
