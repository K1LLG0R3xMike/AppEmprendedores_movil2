import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, 
  IonCard, 
  IonCardContent, 
  IonIcon, 
  IonButton, 
  IonButtons,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonInput,
  IonModal,
  IonDatetime
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  chevronBack,
  chevronForward,
  checkmark,
  checkmarkCircle,
  alertCircle,
  calendarOutline,
  close,
  trendingUp,
  barChart,
  analytics,
  person,
  calendar,
  call
} from 'ionicons/icons';

interface OnboardingFeature {
  icon: string;
  title: string;
  description: string;
  color: string;
}

interface UserData {
  name: string;
  birthday: Date | null;
  phone: string;
}

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss'],
  standalone: true,
  imports: [
    IonContent, 
    IonCard, 
    IonCardContent, 
    IonIcon, 
    IonButton,
    IonButtons,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonInput,
    IonModal,
    IonDatetime,
    CommonModule, 
    FormsModule
  ]
})
export class OnboardingPage implements OnInit {
  @ViewChild('dateModal', { static: false }) dateModal!: IonModal;

  // State
  currentStep: number = 0;
  totalSteps: number = 6;
  showDatePicker: boolean = false;
  selectedDate: string = '';

  // User Data
  userData: UserData = {
    name: '',
    birthday: null,
    phone: ''
  };

  // Validation Errors
  nameError: string = '';
  birthdayError: string = '';
  phoneError: string = '';

  // Date constraints
  maxDate: string = new Date().toISOString();
  minDate: string = new Date(1900, 0, 1).toISOString();

  // Onboarding Features
  onboardingFeatures: OnboardingFeature[] = [
    {
      icon: 'trending-up',
      title: 'Gestiona tus Finanzas',
      description: 'Controla ingresos, gastos y ganancias de tu negocio de manera simple y efectiva.',
      color: '#2196F3'
    },
    {
      icon: 'bar-chart',
      title: 'IA que te Asiste',
      description: 'Recibe recomendaciones inteligentes y predicciones para optimizar tu negocio.',
      color: '#ff9500'
    },
    {
      icon: 'analytics',
      title: 'Análisis Avanzados',
      description: 'Visualiza el rendimiento de tu negocio con gráficos y métricas detalladas.',
      color: '#4CAF50'
    }
  ];

  constructor(private router: Router) {
    addIcons({ 
      chevronBack,
      chevronForward,
      checkmark,
      checkmarkCircle,
      alertCircle,
      calendarOutline,
      close,
      trendingUp,
      barChart,
      analytics,
      person,
      calendar,
      call
    });
  }

  ngOnInit() {
    // Set default selected date to a reasonable birth year
    this.selectedDate = new Date(2000, 0, 1).toISOString();
  }

  isDarkMode(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // Navigation Methods
  nextStep(): void {
    if (this.validateCurrentStep()) {
      if (this.currentStep < this.totalSteps - 1) {
        this.currentStep++;
      } else {
        this.completeOnboarding();
      }
    }
  }

  prevStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  isNextDisabled(): boolean {
    // Don't disable the button, let validation handle it in nextStep()
    return false;
  }

  // Validation
  validateCurrentStep(): boolean {
    this.clearErrors();

    switch (this.currentStep) {
      case 0:
        return this.validateNameAndBirthday();
      case 1:
        return this.validatePhone();
      case 2:
      case 3:
      case 4:
      case 5:
        return true; // Feature introduction steps don't need validation
      default:
        return true;
    }
  }

  validateNameAndBirthday(): boolean {
    let isValid = true;

    if (!this.userData.name || this.userData.name.trim().length < 2) {
      this.nameError = 'Ingresa tu nombre completo';
      isValid = false;
    }

    if (!this.userData.birthday) {
      this.birthdayError = 'Selecciona tu cumpleaños';
      isValid = false;
    }

    return isValid;
  }

  validatePhone(): boolean {
    if (!this.userData.phone || this.userData.phone.trim().length < 10) {
      this.phoneError = 'Ingresa un número de teléfono válido';
      return false;
    }

    // Basic phone validation (digits, spaces, +, -, parentheses)
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(this.userData.phone.trim())) {
      this.phoneError = 'Formato de teléfono inválido';
      return false;
    }

    return true;
  }

  clearErrors(): void {
    this.nameError = '';
    this.birthdayError = '';
    this.phoneError = '';
  }

  clearNameError(): void {
    this.nameError = '';
  }

  clearBirthdayError(): void {
    this.birthdayError = '';
  }

  clearPhoneError(): void {
    this.phoneError = '';
  }

  // Date Picker Methods
  openDatePicker(): void {
    this.showDatePicker = true;
  }

  closeDatePicker(): void {
    this.showDatePicker = false;
  }

  onDateChange(event: any): void {
    this.selectedDate = event.detail.value;
  }

  confirmDate(): void {
    if (this.selectedDate) {
      this.userData.birthday = new Date(this.selectedDate);
      this.clearBirthdayError();
    }
    this.closeDatePicker();
  }

  getFormattedDate(): string {
    if (!this.userData.birthday) {
      return '';
    }

    const date = this.userData.birthday;
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

  // Feature Methods
  getCurrentFeature(): OnboardingFeature | null {
    const featureIndex = this.currentStep - 2;
    if (featureIndex >= 0 && featureIndex < this.onboardingFeatures.length) {
      return this.onboardingFeatures[featureIndex];
    }
    return null;
  }

  // Progress Methods
  getProgressPercentage(): number {
    return ((this.currentStep + 1) / this.totalSteps) * 100;
  }

  // Completion
  async completeOnboarding(): Promise<void> {
    try {
      // Save user data to local storage or send to API
      const onboardingData = {
        name: this.userData.name.trim(),
        birthday: this.userData.birthday?.toISOString(),
        phone: this.userData.phone.trim(),
        completedAt: new Date().toISOString()
      };

      localStorage.setItem('onboardingData', JSON.stringify(onboardingData));
      localStorage.setItem('onboardingCompleted', 'true');

      // Simulate API call
      await this.simulateApiCall(1500);

      // Navigate to dashboard or login
      this.router.navigate(['/tabs/dashboard']);

    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Show error message but still proceed
      this.router.navigate(['/tabs/dashboard']);
    }
  }

  // Utility Methods
  private async simulateApiCall(delay: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Onboarding data saved:', this.userData);
        resolve();
      }, delay);
    });
  }

  // Event Handlers
  onNameInput(): void {
    if (this.nameError) {
      this.clearNameError();
    }
  }

  onPhoneInput(): void {
    if (this.phoneError) {
      this.clearPhoneError();
    }
  }
}
