import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { 
  IonContent, 
  IonCard, 
  IonCardHeader, 
  IonCardTitle, 
  IonCardContent, 
  IonLabel, 
  IonInput, 
  IonButton, 
  IonIcon, 
  IonSpinner,
  ToastController 
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { phonePortraitOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    IonContent, 
    IonCard, 
    IonCardHeader, 
    IonCardTitle, 
    IonCardContent, 
    IonLabel, 
    IonInput, 
    IonButton, 
    IonIcon, 
    IonSpinner,
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule
  ],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss']
})
export class LoginPage {
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  loading = signal(false);
  showPassword = signal(false);
  errorMessage = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private toastCtrl: ToastController,
    private authService: AuthService
  ) {
    addIcons({ phonePortraitOutline, eyeOutline, eyeOffOutline });
  }

  async handleLogin() {
    if (this.loading()) return;
    if (this.form.invalid) {
      this.errorMessage.set('Completa los campos');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      const email = this.form.value.email!;
      const password = this.form.value.password!;

      // Usar el AuthService para login
      await this.authService.login(email, password);
      
      const toast = await this.toastCtrl.create({
        message: 'Login exitoso',
        duration: 2000,
        color: 'success'
      });
      await toast.present();

      // Navegar a la aplicación principal
      this.router.navigate(['/tabs/dashboard']);
    } catch (error: any) {
      const msg = error.message || 'Error al iniciar sesión';
      this.errorMessage.set(msg);

      const toast = await this.toastCtrl.create({
        message: msg,
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      this.loading.set(false);
    }
  }

  goRegister() {
    this.router.navigate(['/register']);
  }
}
