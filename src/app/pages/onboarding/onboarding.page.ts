import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonCard, IonCardContent, IonIcon, IonButton, IonInput, IonSelect, IonSelectOption, IonLabel } from '@ionic/angular/standalone';
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

interface BusinessData {
  nombreNegocio: string;
  descripcion: string;
  sector: string;
  capitalInicial: number | null;
}

interface InitialInventoryProduct {
  nombreProducto: string;
  precioVenta: number | null;
  costoProduccion: number | null;
  stock: number | null;
}

@Component({
  selector: 'app-onboarding',
  templateUrl: './onboarding.page.html',
  styleUrls: ['./onboarding.page.scss'],
  standalone: true,
  imports: [IonContent, IonCard, IonCardContent, IonIcon, IonButton, IonInput, IonSelect, IonSelectOption, IonLabel, CommonModule, FormsModule]
})
export class OnboardingPage implements OnInit {

  // State
  currentStep: number = 0;
  totalSteps: number = 7; // Incluye inventario inicial + 3 pasos de features

  // User Data
  userData: UserData = {
    name: '',
    birthday: null,
    phone: ''
  };

  // Business Data
  businessData: BusinessData = {
    nombreNegocio: '',
    descripcion: '',
    sector: '',
    capitalInicial: null
  };

  // Initial Inventory (stock previo, no afecta balance)
  initialInventoryProducts: InitialInventoryProduct[] = [];
  newInitialInventoryProduct: InitialInventoryProduct = {
    nombreProducto: '',
    precioVenta: null,
    costoProduccion: null,
    stock: null
  };
  initialInventoryError: string = '';

  // Validation Errors
  nameError: string = '';
  birthdayError: string = '';
  phoneError: string = '';
  businessNameError: string = '';
  businessDescriptionError: string = '';
  businessSectorError: string = '';
  businessCapitalError: string = '';

  // Business Sectors
  businessSectors: string[] = [
    'Tecnología',
    'Retail/Comercio',
    'Alimentación',
    'Salud y Bienestar',
    'Educación',
    'Servicios Financieros',
    'Construcción',
    'Turismo y Hospitalidad',
    'Transporte',
    'Entretenimiento',
    'Manufactura',
    'Agricultura',
    'Consultoría',
    'Otros'
  ];

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
    console.log('🎬 [ONBOARDING] Componente inicializado');
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
        // En el último paso (paso 5, que es el índice del último feature), completar
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
        return this.validateBusinessData();
      case 3:
        return this.validateInitialInventoryStep();
      case 4:
      case 5:
      case 6:
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

  validateBusinessData(): boolean {
    let isValid = true;

    if (!this.businessData.nombreNegocio || this.businessData.nombreNegocio.trim().length === 0) {
      this.businessNameError = 'Ingresa el nombre de tu negocio';
      isValid = false;
    }

    if (!this.businessData.descripcion || this.businessData.descripcion.trim().length === 0) {
      this.businessDescriptionError = 'Describe tu negocio';
      isValid = false;
    }

    if (!this.businessData.sector || this.businessData.sector.trim().length === 0) {
      this.businessSectorError = 'Selecciona el sector de tu negocio';
      isValid = false;
    }

    if (!this.businessData.capitalInicial || this.businessData.capitalInicial <= 0) {
      this.businessCapitalError = 'Ingresa el capital inicial';
      isValid = false;
    }

    return isValid;
  }

  clearErrors(): void {
    this.nameError = '';
    this.birthdayError = '';
    this.phoneError = '';
    this.businessNameError = '';
    this.businessDescriptionError = '';
    this.businessSectorError = '';
    this.businessCapitalError = '';
    this.initialInventoryError = '';
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

  clearBusinessNameError(): void {
    this.businessNameError = '';
  }

  clearBusinessDescriptionError(): void {
    this.businessDescriptionError = '';
  }

  clearBusinessSectorError(): void {
    this.businessSectorError = '';
  }

  clearBusinessCapitalError(): void {
    this.businessCapitalError = '';
  }

  validateInitialInventoryStep(): boolean {
    this.initialInventoryError = '';
    return true;
  }

  clearInitialInventoryError(): void {
    this.initialInventoryError = '';
  }

  isInitialInventoryNameValid(): boolean {
    return !!(this.newInitialInventoryProduct.nombreProducto && this.newInitialInventoryProduct.nombreProducto.trim().length >= 2);
  }

  isInitialInventoryPriceValid(): boolean {
    return !!(this.newInitialInventoryProduct.precioVenta && this.newInitialInventoryProduct.precioVenta > 0);
  }

  isInitialInventoryCostValid(): boolean {
    return !!(this.newInitialInventoryProduct.costoProduccion !== null && this.newInitialInventoryProduct.costoProduccion >= 0);
  }

  isInitialInventoryStockValid(): boolean {
    return !!(this.newInitialInventoryProduct.stock !== null && this.newInitialInventoryProduct.stock >= 0);
  }

  isInitialInventoryFormValid(): boolean {
    return this.isInitialInventoryNameValid() &&
      this.isInitialInventoryPriceValid() &&
      this.isInitialInventoryCostValid() &&
      this.isInitialInventoryStockValid();
  }

  addInitialInventoryProduct(): void {
    this.clearInitialInventoryError();

    const nombreProducto = (this.newInitialInventoryProduct.nombreProducto || '').trim();
    const precioVenta = Number(this.newInitialInventoryProduct.precioVenta);
    const costoProduccion = Number(this.newInitialInventoryProduct.costoProduccion);
    const stock = Number(this.newInitialInventoryProduct.stock);

    if (!this.isInitialInventoryNameValid()) {
      this.initialInventoryError = 'Ingresa un nombre valido (minimo 2 caracteres).';
      return;
    }

    if (!this.isInitialInventoryPriceValid() || !Number.isFinite(precioVenta)) {
      this.initialInventoryError = 'Ingresa un precio de venta valido (> 0).';
      return;
    }

    if (!this.isInitialInventoryCostValid() || !Number.isFinite(costoProduccion)) {
      this.initialInventoryError = 'Ingresa un costo de produccion valido (>= 0).';
      return;
    }

    if (!this.isInitialInventoryStockValid() || !Number.isFinite(stock)) {
      this.initialInventoryError = 'Ingresa un stock valido (>= 0).';
      return;
    }

    this.initialInventoryProducts.push({
      nombreProducto,
      precioVenta,
      costoProduccion,
      stock
    });

    this.newInitialInventoryProduct = {
      nombreProducto: '',
      precioVenta: null,
      costoProduccion: null,
      stock: null
    };
  }

  removeInitialInventoryProduct(index: number): void {
    if (index < 0 || index >= this.initialInventoryProducts.length) return;
    this.initialInventoryProducts.splice(index, 1);
  }

  private async resolveCreatedBusinessId(createdBusiness: any): Promise<string> {
    const directId = createdBusiness?.idNegocio || createdBusiness?.id || '';
    if (directId) return directId;

    try {
      const uid = await this.apiService.getUid();
      if (!uid) return '';

      const businesses: any[] = await this.apiService.getBusinessByUserId(uid);
      if (!businesses || businesses.length === 0) return '';

      const byName = businesses.find((b: any) =>
        (b?.nombreNegocio || '').trim().toLowerCase() === (this.businessData.nombreNegocio || '').trim().toLowerCase()
      );
      const sortedByDate = [...businesses].sort((a: any, b: any) => {
        const da = new Date(a?.fechaCreacion || a?.createdAt || 0).getTime();
        const db = new Date(b?.fechaCreacion || b?.createdAt || 0).getTime();
        return db - da;
      });
      const candidate = byName || sortedByDate[0];
      return candidate?.idNegocio || candidate?.id || '';
    } catch (error) {
      console.error('[ONBOARDING] Error resolving business id for initial inventory:', error);
      return '';
    }
  }

  // Date Picker Methods - Native HTML date input
  onNativeDateChange(event: any): void {
    const dateValue = event.target.value; // formato YYYY-MM-DD
    console.log('📅 [DATE_PICKER] Fecha seleccionada (nativa):', dateValue);
    
    if (dateValue) {
      this.userData.birthday = new Date(dateValue);
      this.clearBirthdayError();
      console.log('📅 [DATE_PICKER] Fecha guardada:', this.userData.birthday);
    }
  }

  getDateInputValue(): string {
    if (!this.userData.birthday) {
      return '';
    }
    // Convertir Date a formato YYYY-MM-DD para input type="date"
    const date = this.userData.birthday;
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getMaxDateString(): string {
    // Hoy es la fecha máxima
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getMinDateString(): string {
    // 1900 es la fecha mínima
    return '1900-01-01';
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
    const featureIndex = this.currentStep - 4; // Las features empiezan en step 4
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

      // Preparar datos del negocio para el backend
      const backendBusinessData = {
        nombreNegocio: this.businessData.nombreNegocio.trim(),
        descripcion: this.businessData.descripcion.trim(),
        sector: this.businessData.sector.trim(),
        capitalInicial: this.businessData.capitalInicial || 0
      };

      console.log('📤 [ONBOARDING] Datos del negocio preparados para backend:', backendBusinessData);

      // Enviar datos del negocio al backend
      const businessResponse = await this.apiService.createBusiness(backendBusinessData);
      console.log('✅ [ONBOARDING] Negocio creado en backend exitosamente');

      const createdBusiness: any = (businessResponse as any)?.data || businessResponse;
      const idNegocio = await this.resolveCreatedBusinessId(createdBusiness);
      let inventorySyncPending = false;

      if (idNegocio && this.initialInventoryProducts.length > 0) {
        try {
          await Promise.all(
            this.initialInventoryProducts.map((product) =>
              this.apiService.createProduct({
                idNegocio,
                nombreProducto: product.nombreProducto.trim(),
                precioVenta: Number(product.precioVenta) || 0,
                costoProduccion: Number(product.costoProduccion) || 0,
                stock: Number(product.stock) || 0
              })
            )
          );
          console.log('✅ [ONBOARDING] Inventario inicial guardado en backend');
        } catch (inventoryError) {
          inventorySyncPending = true;
          console.error('❌ [ONBOARDING] Error guardando inventario inicial:', inventoryError);
        }
      } else if (this.initialInventoryProducts.length > 0) {
        inventorySyncPending = true;
      }

      // Guardar datos en localStorage para uso local (como backup)
      const localStorageData = {
        name: this.userData.name.trim(),
        birthday: this.userData.birthday?.toISOString(),
        phone: this.userData.phone.trim(),
        business: {
          nombreNegocio: this.businessData.nombreNegocio.trim(),
          descripcion: this.businessData.descripcion.trim(),
          sector: this.businessData.sector.trim(),
          capitalInicial: this.businessData.capitalInicial || 0
        },
        initialInventory: this.initialInventoryProducts,
        inventorySyncPending,
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
        business: {
          nombreNegocio: this.businessData.nombreNegocio.trim(),
          descripcion: this.businessData.descripcion.trim(),
          sector: this.businessData.sector.trim(),
          capitalInicial: this.businessData.capitalInicial || 0
        },
        initialInventory: this.initialInventoryProducts,
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

  onBusinessNameInput(): void {
    if (this.businessNameError) {
      this.clearBusinessNameError();
    }
  }

  onBusinessDescriptionInput(): void {
    if (this.businessDescriptionError) {
      this.clearBusinessDescriptionError();
    }
  }

  onBusinessCapitalInput(): void {
    if (this.businessCapitalError) {
      this.clearBusinessCapitalError();
    }
  }
}
