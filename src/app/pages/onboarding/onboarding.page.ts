import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonCard, IonCardContent, IonIcon, IonButton, IonButtons,IonHeader,IonToolbar,IonTitle,IonInput,IonModal,IonDatetime} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBack, chevronForward, checkmark, checkmarkCircle, alertCircle, calendarOutline, close, trendingUp, analytics, pieChartOutline, person, calendar, call } from 'ionicons/icons';
import { ApiService } from '../../services/api-service';

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
  imports: [IonContent, IonCard, IonCardContent, IonIcon, IonButton,IonButtons,IonHeader,IonToolbar,IonTitle,IonInput,IonModal,IonDatetime,CommonModule, FormsModule]
})
export class OnboardingPage implements OnInit {

  // State
  currentStep: number = 0;
  totalSteps: number = 5; // Cambiado de 6 a 5 para coincidir con Flutter
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
      color: '#2196F3' // Colors.blue en Flutter
    },
    {
      icon: 'analytics', // Cambiado para representar smart_toy/IA
      title: 'IA que te Asiste',
      description: 'Recibe recomendaciones inteligentes y predicciones para optimizar tu negocio.',
      color: '#ff9500' // Colors.orange en Flutter
    },
    {
      icon: 'pie-chart-outline', // Cambiado para representar pie_chart
      title: 'Análisis Avanzados',
      description: 'Visualiza el rendimiento de tu negocio con gráficos y métricas detalladas.',
      color: '#4CAF50' // Colors.green en Flutter
    }
  ];

  constructor(private router: Router, private apiService: ApiService) {
    addIcons({ 
      chevronBack,
      chevronForward,
      checkmark,
      checkmarkCircle,
      alertCircle,
      calendarOutline,
      close,
      trendingUp,
      analytics,
      'pie-chart-outline': pieChartOutline,
      person,
      calendar,
      call
    });
  }

  ngOnInit() {
    // Set default selected date to a reasonable birth year (hace 25 años)
    const defaultYear = new Date().getFullYear() - 25;
    this.selectedDate = new Date(defaultYear, 0, 1).toISOString();
    console.log('🎬 [ONBOARDING] Componente inicializado');
    console.log('📅 [ONBOARDING] Fecha predeterminada:', this.selectedDate);
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
        // En el último paso (paso 4, que es el índice del último feature), completar
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
        return true; // Feature introduction steps don't need validation
      default:
        return true;
    }
  }

  validateNameAndBirthday(): boolean {
    let isValid = true;

    // Validación exacta como en Flutter
    if (!this.userData.name || this.userData.name.trim().length === 0) {
      this.nameError = 'Ingresa tu nombre'; // Texto exacto de Flutter
      isValid = false;
    }

    if (!this.userData.birthday) {
      this.birthdayError = 'Selecciona tu cumpleaños'; // Texto exacto de Flutter
      isValid = false;
    }

    return isValid;
  }

  validatePhone(): boolean {
    // Validación exacta como en Flutter
    if (!this.userData.phone || this.userData.phone.trim().length === 0) {
      this.phoneError = 'Ingresa tu número de teléfono'; // Texto exacto de Flutter
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
    console.log('📅 [DATE_PICKER] Abriendo selector de fecha...');
    console.log('📅 [DATE_PICKER] Estado actual showDatePicker:', this.showDatePicker);
    console.log('📅 [DATE_PICKER] selectedDate actual:', this.selectedDate);
    this.showDatePicker = true;
    console.log('📅 [DATE_PICKER] Estado después showDatePicker:', this.showDatePicker);
  }

  closeDatePicker(): void {
    console.log('📅 [DATE_PICKER] Cerrando selector de fecha...');
    this.showDatePicker = false;
  }

  onDateChange(event: any): void {
    console.log('📅 [DATE_PICKER] Fecha cambiada:', event.detail.value);
    this.selectedDate = event.detail.value;
  }

  confirmDate(): void {
    console.log('📅 [DATE_PICKER] Confirmando fecha:', this.selectedDate);
    if (this.selectedDate) {
      this.userData.birthday = new Date(this.selectedDate);
      this.clearBirthdayError();
      console.log('📅 [DATE_PICKER] Fecha guardada:', this.userData.birthday);
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
      console.log('🚀 [ONBOARDING] Iniciando proceso de completar onboarding...');
      
      // Preparar datos para el backend (formato exacto que espera el backend)
      const backendUserData = {
        name: this.userData.name.trim(),
        birthdate: this.userData.birthday?.toISOString().split('T')[0] || '', // YYYY-MM-DD format
        numeroDeTelefono: this.userData.phone.trim()
      };

      // Validar que todos los campos requeridos estén presentes
      if (!backendUserData.name || !backendUserData.birthdate || !backendUserData.numeroDeTelefono) {
        throw new Error('Faltan datos requeridos para crear el usuario');
      }

      console.log('📤 [ONBOARDING] Datos preparados para backend:', backendUserData);

      // Enviar datos al backend para crear usuario en Firestore
      await this.apiService.createUser(backendUserData);
      console.log('✅ [ONBOARDING] Usuario creado en backend exitosamente');

      // Guardar datos en localStorage para uso local (como backup)
      const localStorageData = {
        name: this.userData.name.trim(),
        birthday: this.userData.birthday?.toISOString(),
        phone: this.userData.phone.trim(),
        completedAt: new Date().toISOString()
      };

      localStorage.setItem('onboardingData', JSON.stringify(localStorageData));
      localStorage.setItem('onboardingCompleted', 'true');
      console.log('💾 [ONBOARDING] Datos guardados en localStorage como backup');

      // Navigate to dashboard (como en Flutter que llama onComplete)
      console.log('🏠 [ONBOARDING] Navegando a dashboard...');
      this.router.navigate(['/tabs/dashboard']);

    } catch (error) {
      console.error('❌ [ONBOARDING] Error completando onboarding:', error);
      
      // En caso de error, mostrar mensaje pero permitir continuar
      // (podrías mostrar un toast aquí si tienes configurado)
      
      // Guardar solo en localStorage y continuar
      const fallbackData = {
        name: this.userData.name.trim(),
        birthday: this.userData.birthday?.toISOString(),
        phone: this.userData.phone.trim(),
        completedAt: new Date().toISOString(),
        syncPending: true // Marcar para sincronizar después
      };

      localStorage.setItem('onboardingData', JSON.stringify(fallbackData));
      localStorage.setItem('onboardingCompleted', 'true');
      
      console.log('⚠️ [ONBOARDING] Datos guardados solo localmente debido a error en backend');
      console.log('🏠 [ONBOARDING] Navegando a dashboard a pesar del error...');
      
      // Aún así navegar al dashboard
      this.router.navigate(['/tabs/dashboard']);
    }
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
