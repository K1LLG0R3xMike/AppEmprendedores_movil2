import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, 
  IonCard, 
  IonCardContent, 
  IonIcon, 
  IonButton, 
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonDatetime,
  LoadingController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  business, 
  pencil, 
  save, 
  trash, 
  calendarOutline, refresh, add } from 'ionicons/icons';
import { ApiService } from '../../services/api-service';
import { AuthService } from '../../services/auth';

interface BusinessData {
  id?: string;
  idNegocio?: string;
  uid?: string;
  name?: string;
  nombreNegocio?: string;
  type?: string;
  sector?: string;
  descripcion?: string;
  description?: string;
  capitalInicial?: number;
  capital?: number;
  startDate?: string;
  fechaInicio?: string;
  [key: string]: any; // Allow for flexible backend data structure
}

interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-business',
  templateUrl: './business.page.html',
  styleUrls: ['./business.page.scss'],
  standalone: true,
  imports: [
    IonContent, 
    IonCard, 
    IonCardContent, 
    IonIcon, 
    IonButton, 
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonDatetime,
    CommonModule, 
    FormsModule
  ]
})
export class BusinessPage implements OnInit {
  isEditing = false;
  isLoading = false;
  
  businessData: BusinessData = {
    name: '',
    nombreNegocio: '',
    type: '',
    sector: '',
    descripcion: '',
    capitalInicial: 0,
    startDate: ''
  };

  originalBusinessData: BusinessData = {};
  businessList: BusinessData[] = [];

  businessTypes: SelectOption[] = [
    { value: 'ecommerce', label: 'E-commerce' },
    { value: 'retail', label: 'Retail' },
    { value: 'services', label: 'Servicios' },
    { value: 'restaurant', label: 'Restaurante' },
    { value: 'consulting', label: 'Consultoría' }
  ];

  sectors: SelectOption[] = [
    { value: 'Tecnología', label: 'Tecnología' },
    { value: 'Retail/Comercio', label: 'Retail/Comercio' },
    { value: 'Alimentación', label: 'Alimentación' },
    { value: 'Salud y Bienestar', label: 'Salud y Bienestar' },
    { value: 'Educación', label: 'Educación' },
    { value: 'Servicios Financieros', label: 'Servicios Financieros' },
    { value: 'Construcción', label: 'Construcción' },
    { value: 'Turismo y Hospitalidad', label: 'Turismo y Hospitalidad' },
    { value: 'Transporte', label: 'Transporte' },
    { value: 'Entretenimiento', label: 'Entretenimiento' },
    { value: 'Manufactura', label: 'Manufactura' },
    { value: 'Agricultura', label: 'Agricultura' },
    { value: 'Consultoría', label: 'Consultoría' },
    { value: 'Otros', label: 'Otros' }
  ];

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    addIcons({refresh,business,add,pencil,calendarOutline,save,trash});
  }

  ngOnInit() {
    this.debugAuthState();
    this.loadBusinessData();
  }

  private async debugAuthState(): Promise<void> {
    console.log('🔍 [BUSINESS] Estado de autenticación:');
    console.log('- isAuthenticated:', this.authService.isAuthenticated);
    console.log('- UID:', this.authService.uid);
    console.log('- Token exists:', !!(await this.authService.authState$.pipe().toPromise()));
    
    // También verificar el token directamente
    const token = await this.apiService.getToken();
    console.log('- Token directo:', token ? 'Existe' : 'No existe');
    
    // Verificar si el token es válido
    if (token) {
      console.log('- Token preview:', token.substring(0, 20) + '...');
      const isValid = await this.apiService.isTokenValid();
      console.log('- Token is valid:', isValid);
    }
  }

  async loadBusinessData(): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Cargando datos del negocio...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const uid = this.authService.uid;
      if (!uid) {
        await this.showToast('Usuario no autenticado', 'warning');
        return;
      }

      console.log('🔍 [BUSINESS] Cargando negocios para UID:', uid);
      console.log('🔍 [BUSINESS] URL que se va a consultar: http://192.168.1.2:3000/api/business/user/' + uid);
      
      const response: any = await this.apiService.getBusinessByUserId(uid);
      console.log('🔍 [BUSINESS] Respuesta completa del API:', response);
      console.log('🔍 [BUSINESS] Tipo de respuesta:', typeof response);
      console.log('🔍 [BUSINESS] Es array?:', Array.isArray(response));
      
      // Handle different response formats
      let businessList: any[] = [];
      
      if (Array.isArray(response)) {
        businessList = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        businessList = response.data;
      } else if (response) {
        businessList = [response];
      }
      
      console.log('🔍 [BUSINESS] Lista de negocios procesada:', businessList);
      
      if (businessList && businessList.length > 0) {
        // Cargar el primer negocio encontrado
        const business = businessList[0];
        console.log('🔍 [BUSINESS] Datos del negocio individual:', business);
        
        this.businessData = {
          id: business.idNegocio || business.id || '',
          uid: business.uid || uid,
          name: business.nombreNegocio || business.name || '',
          nombreNegocio: business.nombreNegocio || business.name || '',
          sector: business.sector || '',
          descripcion: business.descripcion || business.description || '',
          capitalInicial: Number(business.capitalInicial || business.capital || 0),
          type: business.type || 'ecommerce',
          startDate: business.startDate || business.fechaInicio || new Date().toISOString().split('T')[0]
        };
        
        // Guardar una copia para cancelar cambios
        this.originalBusinessData = { ...this.businessData };
        
        console.log('✅ [BUSINESS] Datos del negocio procesados:', this.businessData);
      } else {
        console.log('ℹ️ [BUSINESS] No se encontraron negocios para este usuario');
        await this.showToast('No se encontraron negocios asociados a tu cuenta. Ve a configuración para crear uno.', 'primary');
      }
    } catch (error) {
      console.error('❌ [BUSINESS] Error cargando datos del negocio:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        console.error('❌ [BUSINESS] Error message:', error.message);
        if (error.message.includes('404') || error.message.includes('not found')) {
          await this.showToast('No tienes negocios registrados. Ve a configuración para crear uno.', 'warning');
        } else if (error.message.includes('403') || error.message.includes('unauthorized')) {
          await this.showToast('No tienes permisos para acceder a esta información', 'danger');
        } else {
          await this.showToast('Error al cargar los datos del negocio', 'danger');
        }
      } else {
        await this.showToast('Error inesperado al cargar los datos', 'danger');
      }
    } finally {
      await loading.dismiss();
    }
  }

  toggleEdit(): void {
    this.isEditing = true;
  }

  async handleSave(): Promise<void> {
    if (this.isLoading) return;
    
    // Validar datos antes de enviar
    if (!this.validateBusinessData()) {
      return;
    }

    // Verificar si hay cambios
    if (!this.hasUnsavedChanges()) {
      await this.showToast('No hay cambios para guardar', 'primary');
      this.isEditing = false;
      return;
    }

    // Validar que tenemos un ID de negocio
    const businessId = this.businessData.id || this.businessData.idNegocio;
    if (!businessId) {
      await this.showToast('Error: No se encontró ID del negocio', 'danger');
      return;
    }

    // Verificar autenticación antes de continuar
    const isTokenValid = await this.apiService.isTokenValid();
    if (!isTokenValid) {
      await this.showToast('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', 'warning');
      // Redirigir a login o mostrar modal de login
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Guardando cambios...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Preparar datos para enviar al backend
      const updateData = {
        nombreNegocio: this.businessData.nombreNegocio!.trim(),
        descripcion: this.businessData.descripcion?.trim() || '',
        sector: this.businessData.sector || '',
        capitalInicial: Number(this.businessData.capitalInicial) || 0
      };

      console.log('💾 [BUSINESS] Enviando datos de actualización:', updateData);
      console.log('💾 [BUSINESS] ID del negocio:', businessId);

      // Llamar al API para actualizar
      const response = await this.apiService.updateBusiness(businessId, updateData);
      
      console.log('✅ [BUSINESS] Respuesta del servidor:', response);

      // Actualizar datos locales con la respuesta del servidor
      if (response.data) {
        this.businessData = {
          ...this.businessData,
          ...response.data
        };
      }

      // Guardar copia actualizada
      this.originalBusinessData = { ...this.businessData };
      
      this.isEditing = false;
      await this.showToast('Cambios guardados exitosamente', 'success');
      
    } catch (error: any) {
      console.error('❌ [BUSINESS] Error guardando cambios:', error);
      
      let errorMessage = 'Error al guardar los cambios';
      
      if (error.message) {
        if (error.message.includes('sesión ha expirado') || error.message.includes('inicia sesión')) {
          errorMessage = error.message;
          // Aquí podrías redirigir al login o mostrar un modal
        } else if (error.message.includes('404')) {
          errorMessage = 'Negocio no encontrado';
        } else if (error.message.includes('403')) {
          errorMessage = 'No tienes permisos para modificar este negocio';
        } else if (error.message.includes('400')) {
          errorMessage = 'Datos inválidos. Verifica la información ingresada';
        } else {
          errorMessage = error.message;
        }
      }
      
      await this.showToast(errorMessage, 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  handleCancel(): void {
    // Restaurar datos originales
    this.businessData = { ...this.originalBusinessData };
    this.isEditing = false;
  }

  // 🔹 Validar datos del negocio antes de guardar
  private validateBusinessData(): boolean {
    if (!this.businessData.nombreNegocio?.trim()) {
      this.showToast('El nombre del negocio es requerido', 'warning');
      return false;
    }

    if (this.businessData.nombreNegocio.trim().length < 2) {
      this.showToast('El nombre del negocio debe tener al menos 2 caracteres', 'warning');
      return false;
    }

    if (this.businessData.capitalInicial !== undefined && this.businessData.capitalInicial < 0) {
      this.showToast('El capital inicial no puede ser negativo', 'warning');
      return false;
    }

    return true;
  }

  // 🔹 Verificar si hay cambios pendientes
  hasUnsavedChanges(): boolean {
    return JSON.stringify(this.businessData) !== JSON.stringify(this.originalBusinessData);
  }

  async handleDelete(): Promise<void> {
    // TODO: Implement delete logic with confirmation
    console.log('🗑️ [BUSINESS] Eliminar negocio');
    await this.showToast('Función de eliminar en desarrollo', 'warning');
  }

  private async showToast(message: string, color: string = 'primary'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 5000, // Increased duration for better visibility
      color,
      position: 'top', // Changed to top for better visibility
      buttons: [{
        text: 'Cerrar',
        role: 'cancel'
      }]
    });
    await toast.present();
  }

  // Method to manually refresh data
  async refreshData(): Promise<void> {
    console.log('🔄 [BUSINESS] Refrescando datos manualmente...');
    await this.loadBusinessData();
  }
}
