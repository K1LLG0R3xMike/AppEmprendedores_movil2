import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ApiService } from '../../services/api-service';
import { ToastController, LoadingController } from '@ionic/angular';

interface Transaction {
  id: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  date: string;
  method: string;
  status: 'completed' | 'pending' | 'cancelled';
}

interface GastoFijo {
  idGasto: string;
  idNegocio: string;
  nombreGasto: string;
  costoGasto: number;
  descripcion: string;
  recurrencia: string;
  fechasEjecucion: string[];
  pagado: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-finance',
  templateUrl: './finance.page.html',
  styleUrls: ['./finance.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    IonicModule,
  ]
})

export class FinancePage implements OnInit {
  
  filterType: 'all' | 'income' | 'expense' | 'pending' | 'completed' | 'cancelled' = 'all';
  filterCategory: string = 'all';
  searchTerm: string = '';
  showAddForm: boolean = false;
  showAddGastoFijoForm: boolean = false;
  showActionModal: boolean = false;
  isLoading: boolean = false;
  businessId: string = ''; // ID del negocio actual

  newTransaction: Partial<Transaction> = {
    type: 'income',
    category: '',
    description: '',
    amount: 0,
    method: '',
    status: 'completed'
  };

  newGastoFijo: Partial<GastoFijo> = {
    nombreGasto: '',
    costoGasto: 0,
    descripcion: '',
    recurrencia: '',
    fechasEjecucion: [],
    pagado: false
  };

  transactions: Transaction[] = [];
  gastosFijos: GastoFijo[] = [];

  private apiService = inject(ApiService);
  private toastController = inject(ToastController);
  private loadingController = inject(LoadingController);

  async ngOnInit() {
    await this.loadBusinessId();
    await this.loadGastosFijos();
    await this.loadTransactions();
  }

  // 🔹 Cargar ID del negocio desde el storage o contexto
  private async loadBusinessId(): Promise<void> {
    try {
      // Aquí puedes obtener el ID del negocio de diferentes maneras:
      // 1. Desde el localStorage/Preferences
      // 2. Desde un servicio de estado global
      // 3. Como parámetro de navegación
      
      // Por ahora, vamos a asumir que tienes un método para obtenerlo
      const uid = await this.apiService.getUid();
      if (uid) {
        const businesses = await this.apiService.getBusinessByUserId(uid);
        if (businesses && businesses.length > 0) {
          this.businessId = businesses[0]['idNegocio'] || businesses[0]['id'];
          console.log('[FINANCE] Business ID loaded:', this.businessId);
        }
      }
    } catch (error) {
      console.error('[FINANCE] Error loading business ID:', error);
      await this.presentToast('Error al cargar información del negocio', 'danger');
    }
  }

  // 🔹 Cargar transacciones del negocio
  private async loadTransactions(): Promise<void> {
    if (!this.businessId) {
      console.log('[FINANCE] No business ID available, skipping transaction load');
      return;
    }

    try {
      console.log('[FINANCE] 📋 Loading transactions for business:', this.businessId);
      const transactions = await this.apiService.getTransactionsByBusiness(this.businessId);
      this.transactions = transactions || [];
      console.log('[FINANCE] ✅ Transactions loaded:', this.transactions.length);
    } catch (error) {
      console.error('[FINANCE] ❌ Error loading transactions:', error);
      // No mostrar error si no hay transacciones, es normal en negocios nuevos
      this.transactions = [];
    }
  }

  // 🔹 Mostrar toast
  private async presentToast(message: string, color: string = 'primary'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  // 🔹 Mapear tipo del frontend al backend - Compatible con la nueva implementación
  private mapTransactionType(type: 'income' | 'expense'): 'income' | 'expense' {
    // El nuevo API service maneja automáticamente la conversión a número
    // Solo necesitamos pasar 'income' o 'expense' como string
    return type;
  }

  // 🔹 Validar datos de transacción
  private validateTransactionData(): boolean {
    if (!this.newTransaction.description?.trim()) {
      this.presentToast('La descripción es requerida', 'warning');
      return false;
    }

    if (!this.newTransaction.amount || this.newTransaction.amount <= 0) {
      this.presentToast('El monto debe ser mayor a 0', 'warning');
      return false;
    }

    if (!this.newTransaction.category) {
      this.presentToast('La categoría es requerida', 'warning');
      return false;
    }

    if (!this.newTransaction.method) {
      this.presentToast('El método de pago es requerido', 'warning');
      return false;
    }

    if (!this.newTransaction.type) {
      this.presentToast('El tipo de transacción es requerido', 'warning');
      return false;
    }

    return true;
  }

  get totalIncome(): number {
    return this.transactions
      .filter(t => t.type === 'income' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  get totalExpenses(): number {
    return this.transactions
      .filter(t => t.type === 'expense' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  getBalance(): number {
    return this.totalIncome - this.totalExpenses;
  }

  getBalanceClass(): string {
    return this.getBalance() >= 0 ? 'balance-positive' : 'balance-negative';
  }

  setFilterType(type: 'all' | 'income' | 'expense' | 'pending' | 'completed' | 'cancelled'): void {
    this.filterType = type;
  }

  getFilteredTransactions(): Transaction[] {
    return this.transactions.filter(transaction => {
      let matchesType = true;
      
      // Filtrar por tipo de transacción o status
      if (this.filterType === 'all') {
        matchesType = true;
      } else if (this.filterType === 'income' || this.filterType === 'expense') {
        matchesType = transaction.type === this.filterType;
      } else if (this.filterType === 'pending' || this.filterType === 'completed' || this.filterType === 'cancelled') {
        matchesType = transaction.status === this.filterType;
      }
      
      const matchesCategory = this.filterCategory === 'all' || transaction.category === this.filterCategory;
      const matchesSearch = transaction.description.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchesType && matchesCategory && matchesSearch;
    });
  }

  getTransactionIcon(transaction: Transaction): string {
    if (transaction.type === 'income') {
      switch (transaction.category) {
        case 'Ventas': return 'storefront';
        default: return 'trending-up';
      }
    } else {
      switch (transaction.category) {
        case 'Inventario': return 'cube';
        case 'Marketing': return 'megaphone';
        case 'Servicios': return 'construct';
        case 'Gastos operativos': return 'business';
        default: return 'trending-down';
      }
    }
  }

  getTransactionIconClass(transaction: Transaction): string {
    return transaction.type === 'income' ? 'income-icon-bg' : 'expense-icon-bg';
  }

  getAmountClass(type: string): string {
    return type === 'income' ? 'amount-income' : 'amount-expense';
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'completed': return 'status-completed';
      case 'pending': return 'status-pending';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-unknown';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'completed': return 'badge-completed';
      case 'pending': return 'badge-pending';
      case 'cancelled': return 'badge-cancelled';
      default: return 'badge-unknown';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'completed': return 'Completado';
      case 'pending': return 'Pendiente';
      case 'cancelled': return 'Cancelado';
      default: return 'Desconocido';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'danger';
      default: return 'medium';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day} de ${month}, ${year}`;
  }

  async addTransaction(): Promise<void> {
    // Validación de campos requeridos
    if (!this.validateTransactionData()) {
      return;
    }

    // Validar que tengamos el ID del negocio
    if (!this.businessId) {
      await this.presentToast('Error: No se encontró información del negocio', 'danger');
      return;
    }

    // Mostrar loading
    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Guardando transacción...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Preparar datos para el backend
      const transactionData = {
        idNegocio: this.businessId,
        tipo: this.mapTransactionType(this.newTransaction.type as 'income' | 'expense'),
        monto: Number(this.newTransaction.amount),
        descripcion: this.newTransaction.description!
      };

      console.log('[FINANCE] 📤 Sending transaction data:', transactionData);

      // Enviar al backend
      const response = await this.apiService.createTransaction(transactionData);
      
      console.log('[FINANCE] ✅ Transaction created:', response);

      // Recargar transacciones desde el backend en lugar de agregar localmente
      await this.loadTransactions();
      
      await this.presentToast('Transacción guardada exitosamente', 'success');
      this.cancelAdd();

    } catch (error: any) {
      console.error('[FINANCE] ❌ Error creating transaction:', error);
      let errorMessage = 'Error al guardar la transacción';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      await this.presentToast(errorMessage, 'danger');
    } finally {
      this.isLoading = false;
      await loading.dismiss();
    }
  }

  cancelAdd(): void {
    this.showAddForm = false;
    this.isLoading = false;
    this.newTransaction = {
      type: 'income',
      category: '',
      description: '',
      amount: 0,
      method: '',
      status: 'completed'
    };
  }

  // 🔹 MÉTODOS PARA GASTOS FIJOS

  // Cargar gastos fijos del negocio
  async loadGastosFijos(): Promise<void> {
    if (!this.businessId) return;

    try {
      const gastos = await this.apiService.getGastosFijosByBusiness(this.businessId);
      this.gastosFijos = gastos || [];
      console.log('[FINANCE] Gastos fijos loaded:', this.gastosFijos);
    } catch (error) {
      console.error('[FINANCE] Error loading gastos fijos:', error);
      // No mostramos error si no hay gastos fijos
    }
  }

  // Validar datos de gasto fijo
  private validateGastoFijoData(): boolean {
    if (!this.newGastoFijo.nombreGasto?.trim()) {
      this.presentToast('El nombre del gasto es requerido', 'warning');
      return false;
    }

    if (!this.newGastoFijo.costoGasto || this.newGastoFijo.costoGasto <= 0) {
      this.presentToast('El costo debe ser mayor a 0', 'warning');
      return false;
    }

    if (!this.newGastoFijo.descripcion?.trim()) {
      this.presentToast('La descripción es requerida', 'warning');
      return false;
    }

    if (!this.newGastoFijo.recurrencia) {
      this.presentToast('La recurrencia es requerida', 'warning');
      return false;
    }

    return true;
  }

  // Crear gasto fijo
  async addGastoFijo(): Promise<void> {
    if (!this.validateGastoFijoData()) {
      return;
    }

    if (!this.businessId) {
      await this.presentToast('Error: No se encontró información del negocio', 'danger');
      return;
    }

    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Creando gasto fijo...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Preparar datos para el backend
      const gastoData = {
        idNegocio: this.businessId,
        nombreGasto: this.newGastoFijo.nombreGasto!,
        costoGasto: Number(this.newGastoFijo.costoGasto),
        descripcion: this.newGastoFijo.descripcion!,
        recurrencia: this.newGastoFijo.recurrencia!,
        fechasEjecucion: [], // Se puede calcular en el backend
        pagado: false
      };

      console.log('[FINANCE] 📤 Sending gasto fijo data:', gastoData);

      const response = await this.apiService.createGastoFijo(gastoData);
      
      console.log('[FINANCE] ✅ Gasto fijo created:', response);

      // Recargar gastos fijos
      await this.loadGastosFijos();
      
      await this.presentToast('Gasto fijo creado exitosamente', 'success');
      this.cancelAddGastoFijo();

    } catch (error: any) {
      console.error('[FINANCE] ❌ Error creating gasto fijo:', error);
      let errorMessage = 'Error al crear el gasto fijo';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      await this.presentToast(errorMessage, 'danger');
    } finally {
      this.isLoading = false;
      await loading.dismiss();
    }
  }

  // Cancelar agregar gasto fijo
  cancelAddGastoFijo(): void {
    this.showAddGastoFijoForm = false;
    this.isLoading = false;
    this.newGastoFijo = {
      nombreGasto: '',
      costoGasto: 0,
      descripcion: '',
      recurrencia: '',
      fechasEjecucion: [],
      pagado: false
    };
  }

  // Marcar gasto fijo como pagado
  async markAsPaid(idGasto: string): Promise<void> {
    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Marcando como pagado...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await this.apiService.markGastoFijoAsPaid(idGasto);
      
      // Actualizar el estado local
      const gasto = this.gastosFijos.find(g => g.idGasto === idGasto);
      if (gasto) {
        gasto.pagado = true;
      }
      
      await this.presentToast('Gasto marcado como pagado', 'success');

    } catch (error: any) {
      console.error('[FINANCE] ❌ Error marking as paid:', error);
      let errorMessage = 'Error al marcar como pagado';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      await this.presentToast(errorMessage, 'danger');
    } finally {
      this.isLoading = false;
      await loading.dismiss();
    }
  }

  // Filtrar gastos fijos
  getFilteredGastosFijos(): GastoFijo[] {
    if (!this.gastosFijos) return [];
    
    return this.gastosFijos.filter(gasto => {
      let matchesType = true;
      
      // Filtrar por status de pago
      if (this.filterType === 'all') {
        matchesType = true;
      } else if (this.filterType === 'pending') {
        matchesType = !gasto.pagado;
      } else if (this.filterType === 'completed') {
        matchesType = gasto.pagado;
      }
      
      const matchesSearch = gasto.nombreGasto.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           gasto.descripcion.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchesType && matchesSearch;
    });
  }

  // 🔹 MÉTODOS PARA EL FAB Y MODAL

  // Abrir formulario de transacción desde el modal
  openTransactionForm(): void {
    this.showActionModal = false;
    this.showAddForm = true;
  }

  // Abrir formulario de gasto fijo desde el modal
  openGastoFijoForm(): void {
    this.showActionModal = false;
    this.showAddGastoFijoForm = true;
  }
}
