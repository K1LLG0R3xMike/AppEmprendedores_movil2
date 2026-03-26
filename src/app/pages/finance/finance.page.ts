import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ApiService } from '../../services/api-service';
import { ToastController, LoadingController } from '@ionic/angular';

interface Transaction {
  id: string | number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  date: string;
  method: string;
  status: 'completed' | 'pending' | 'cancelled';
}

interface Product {
  idProducto: string;
  nombreProducto: string;
  precioVenta: number;
  costoProduccion: number;
  stock: number;
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

interface VentaForm {
  idProducto: string;
  cantidadVendida: number;
  descripcion: string;
  method: string;
}

interface FinancialTransactionForm {
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  method: string;
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
  showAddVentaForm: boolean = false;
  showAddTransactionForm: boolean = false;
  showAddGastoFijoForm: boolean = false;
  showActionModal: boolean = false;
  isLoading: boolean = false;
  businessId: string = '';

  newVenta: VentaForm = {
    idProducto: '',
    cantidadVendida: 1,
    descripcion: '',
    method: ''
  };

  newTransaction: FinancialTransactionForm = {
    type: 'income',
    category: '',
    description: '',
    amount: 0,
    method: ''
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
  products: Product[] = [];

  private apiService = inject(ApiService);
  private toastController = inject(ToastController);
  private loadingController = inject(LoadingController);

  async ngOnInit() {
    await this.loadBusinessId();
    await this.loadProducts();
    await this.loadAllMovements();
    await this.loadGastosFijos();
  }

  private async loadBusinessId(): Promise<void> {
    try {
      const uid = await this.apiService.getUid();
      if (!uid) return;

      const businesses = await this.apiService.getBusinessByUserId(uid);
      if (businesses && businesses.length > 0) {
        this.businessId = businesses[0]['idNegocio'] || businesses[0]['id'];
      }
    } catch (error) {
      console.error('[FINANCE] Error loading business ID:', error);
      await this.presentToast('Error al cargar informacion del negocio', 'danger');
    }
  }

  private async loadProducts(): Promise<void> {
    if (!this.businessId) return;

    try {
      const rawProducts = await this.apiService.getProductsByBusiness(this.businessId);
      this.products = (rawProducts || []).map((p: any) => ({
        idProducto: p.idProducto || p.id || '',
        nombreProducto: p.nombreProducto || 'Producto',
        precioVenta: Number(p.precioVenta) || 0,
        costoProduccion: Number(p.costoProduccion) || 0,
        stock: Number(p.stock) || 0
      })).filter((p: Product) => !!p.idProducto);
    } catch (error) {
      console.error('[FINANCE] Error loading products:', error);
      this.products = [];
    }
  }

  private getSelectedProduct(productId: string): Product | undefined {
    return this.products.find(p => p.idProducto === productId);
  }

  private normalizeDate(value: any): string {
    if (!value) return new Date().toISOString();

    if (typeof value === 'string') return value;

    if (value?.toDate && typeof value.toDate === 'function') {
      return value.toDate().toISOString();
    }

    if (typeof value?._seconds === 'number') {
      return new Date(value._seconds * 1000).toISOString();
    }

    return new Date().toISOString();
  }

  private async loadVentasAsTransactions(): Promise<Transaction[]> {
    if (!this.products.length) return [];

    const salesByProduct = await Promise.all(
      this.products.map(async (product) => {
        const ventas = await this.apiService.getVentasByProducto(product.idProducto);
        return (ventas || []).map((venta: any): Transaction => {
          const cantidad = Number(venta.cantidadVendida) || 0;
          const precio = Number(venta.precioUnitario) || 0;
          const total = Number(venta.totalVenta) || (cantidad * precio);

          return {
            id: venta.idVenta || `${product.idProducto}-${this.normalizeDate(venta.fechaVenta)}`,
            type: 'income',
            category: 'Ventas',
            description: `Venta: ${product.nombreProducto} x${cantidad}`,
            amount: total,
            date: this.normalizeDate(venta.fechaVenta),
            method: 'Venta de producto',
            status: 'completed'
          };
        });
      })
    );

    return salesByProduct.flat();
  }

  private async loadTransactions(): Promise<Transaction[]> {
    if (!this.businessId) return [];

    try {
      return await this.apiService.getTransactionsByBusiness(this.businessId);
    } catch (error) {
      console.error('[FINANCE] Error loading transactions:', error);
      return [];
    }
  }

  private async loadAllMovements(): Promise<void> {
    if (!this.businessId) return;

    try {
      const [financialTransactions, ventas] = await Promise.all([
        this.loadTransactions(),
        this.loadVentasAsTransactions()
      ]);

      this.transactions = [...financialTransactions, ...ventas].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    } catch (error) {
      console.error('[FINANCE] Error loading all movements:', error);
      this.transactions = [];
    }
  }

  private async presentToast(message: string, color: string = 'primary'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  private validateVentaData(): boolean {
    if (!this.newVenta.idProducto) {
      this.presentToast('El producto es requerido', 'warning');
      return false;
    }

    if (!this.newVenta.cantidadVendida || this.newVenta.cantidadVendida <= 0) {
      this.presentToast('La cantidad vendida debe ser mayor a 0', 'warning');
      return false;
    }

    if (!this.newVenta.method) {
      this.presentToast('El metodo de pago es requerido', 'warning');
      return false;
    }

    return true;
  }

  private validateFinancialTransactionData(): boolean {
    if (!this.newTransaction.description?.trim()) {
      this.presentToast('La descripcion es requerida', 'warning');
      return false;
    }

    if (!this.newTransaction.amount || this.newTransaction.amount <= 0) {
      this.presentToast('El monto debe ser mayor a 0', 'warning');
      return false;
    }

    if (!this.newTransaction.category) {
      this.presentToast('La categoria es requerida', 'warning');
      return false;
    }

    if (!this.newTransaction.method) {
      this.presentToast('El metodo de pago es requerido', 'warning');
      return false;
    }

    if (!this.newTransaction.type) {
      this.presentToast('El tipo de transaccion es requerido', 'warning');
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

  setFilterType(type: 'all' | 'income' | 'expense' | 'pending' | 'completed' | 'cancelled'): void {
    this.filterType = type;
  }

  getFilteredTransactions(): Transaction[] {
    return this.transactions.filter(transaction => {
      let matchesType = true;

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

  async addVenta(): Promise<void> {
    if (!this.validateVentaData()) return;
    if (!this.businessId) {
      await this.presentToast('Error: No se encontro informacion del negocio', 'danger');
      return;
    }

    const selectedProduct = this.getSelectedProduct(this.newVenta.idProducto);
    if (!selectedProduct) {
      await this.presentToast('Selecciona un producto valido', 'warning');
      return;
    }

    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Guardando venta...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const ventaData = {
        idNegocio: this.businessId,
        idProducto: selectedProduct.idProducto,
        cantidadVendida: Number(this.newVenta.cantidadVendida),
        precioUnitario: Number(selectedProduct.precioVenta),
        costoProduccion: Number(selectedProduct.costoProduccion)
      };

      const ventaResponse = await this.apiService.createVenta(ventaData);
      const totalVenta = Number(this.newVenta.cantidadVendida) * Number(selectedProduct.precioVenta);
      const ventaId =
        ventaResponse?.data?.idVenta ||
        ventaResponse?.data?.id ||
        ventaResponse?.idVenta ||
        ventaResponse?.id;

      await this.apiService.registerDashboardBalanceMovement('venta', totalVenta, {
        idNegocio: this.businessId,
        description: this.newVenta.descripcion?.trim() || `Venta de ${selectedProduct.nombreProducto}`,
        category: 'Ventas',
        source: 'finance_venta',
        metadata: {
          idVenta: ventaId,
          idProducto: selectedProduct.idProducto,
          nombreProducto: selectedProduct.nombreProducto,
          cantidadVendida: Number(this.newVenta.cantidadVendida),
          precioUnitario: Number(selectedProduct.precioVenta),
          costoProduccion: Number(selectedProduct.costoProduccion),
          totalVenta
        }
      });
      await this.apiService.decreaseStock(
        selectedProduct.idProducto,
        Number(this.newVenta.cantidadVendida)
      );
      await this.loadAllMovements();
      await this.loadProducts();
      await this.presentToast('Venta guardada y stock actualizado', 'success');
      this.cancelAddVenta();
    } catch (error: any) {
      console.error('[FINANCE] Error creating venta:', error);
      await this.presentToast(error?.message || 'Error al guardar la venta', 'danger');
    } finally {
      this.isLoading = false;
      await loading.dismiss();
    }
  }

  async addFinancialTransaction(): Promise<void> {
    if (!this.validateFinancialTransactionData()) return;
    if (!this.businessId) {
      await this.presentToast('Error: No se encontro informacion del negocio', 'danger');
      return;
    }

    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Guardando transaccion...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const transactionResponse = await this.apiService.createTransaction({
        idNegocio: this.businessId,
        tipo: this.newTransaction.type,
        monto: Number(this.newTransaction.amount),
        descripcion: this.newTransaction.description
      });
      const amount = Number(this.newTransaction.amount) || 0;
      const transactionId =
        transactionResponse?.data?.idTransaccion ||
        transactionResponse?.data?.id ||
        transactionResponse?.idTransaccion ||
        transactionResponse?.id;
      await this.apiService.registerDashboardBalanceMovement(
        this.newTransaction.type === 'income' ? 'transaccion_ingreso' : 'transaccion_egreso',
        amount,
        {
          idNegocio: this.businessId,
          description: this.newTransaction.description?.trim() || 'Transaccion manual',
          category: this.newTransaction.category?.trim() || 'Transacciones',
          source: 'finance_transaction',
          metadata: {
            idTransaccion: transactionId,
            tipo: this.newTransaction.type,
            monto: amount,
            method: this.newTransaction.method,
            descripcion: this.newTransaction.description
          }
        }
      );

      await this.loadAllMovements();
      await this.presentToast('Transaccion guardada exitosamente', 'success');
      this.cancelAddTransaction();
    } catch (error: any) {
      console.error('[FINANCE] Error creating transaction:', error);
      await this.presentToast(error?.message || 'Error al guardar la transaccion', 'danger');
    } finally {
      this.isLoading = false;
      await loading.dismiss();
    }
  }

  cancelAddVenta(): void {
    this.showAddVentaForm = false;
    this.isLoading = false;
    this.newVenta = {
      idProducto: '',
      cantidadVendida: 1,
      descripcion: '',
      method: ''
    };
  }

  cancelAddTransaction(): void {
    this.showAddTransactionForm = false;
    this.isLoading = false;
    this.newTransaction = {
      type: 'income',
      category: '',
      description: '',
      amount: 0,
      method: ''
    };
  }

  async loadGastosFijos(): Promise<void> {
    if (!this.businessId) return;

    try {
      const gastos = await this.apiService.getGastosFijosByBusiness(this.businessId);
      this.gastosFijos = gastos || [];
    } catch (error) {
      console.error('[FINANCE] Error loading gastos fijos:', error);
    }
  }

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
      this.presentToast('La descripcion es requerida', 'warning');
      return false;
    }

    if (!this.newGastoFijo.recurrencia) {
      this.presentToast('La recurrencia es requerida', 'warning');
      return false;
    }

    return true;
  }

  async addGastoFijo(): Promise<void> {
    if (!this.validateGastoFijoData()) return;
    if (!this.businessId) {
      await this.presentToast('Error: No se encontro informacion del negocio', 'danger');
      return;
    }

    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Creando gasto fijo...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const gastoData = {
        idNegocio: this.businessId,
        nombreGasto: this.newGastoFijo.nombreGasto!,
        costoGasto: Number(this.newGastoFijo.costoGasto),
        descripcion: this.newGastoFijo.descripcion!,
        recurrencia: this.newGastoFijo.recurrencia!,
        fechasEjecucion: [],
        pagado: false
      };

      await this.apiService.createGastoFijo(gastoData);
      await this.loadGastosFijos();
      await this.presentToast('Gasto fijo creado exitosamente', 'success');
      this.cancelAddGastoFijo();
    } catch (error: any) {
      console.error('[FINANCE] Error creating gasto fijo:', error);
      await this.presentToast(error?.message || 'Error al crear el gasto fijo', 'danger');
    } finally {
      this.isLoading = false;
      await loading.dismiss();
    }
  }

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

  async markAsPaid(idGasto: string): Promise<void> {
    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Marcando como pagado...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const gasto = this.gastosFijos.find(g => g.idGasto === idGasto);

      await this.apiService.markGastoFijoAsPaid(idGasto);

      if (gasto) {
        await this.apiService.createGastoFijoPagado({
          idNegocio: gasto.idNegocio || this.businessId,
          nombreGasto: gasto.nombreGasto,
          costoGasto: Number(gasto.costoGasto) || 0
        });
        await this.apiService.registerDashboardBalanceMovement(
          'gasto_fijo_pagado',
          Number(gasto.costoGasto) || 0,
          {
            idNegocio: gasto.idNegocio || this.businessId,
            description: `Pago gasto fijo: ${gasto.nombreGasto}`,
            category: 'Gastos fijos',
            source: 'finance_gasto_fijo_pagado',
            metadata: {
              idGasto: gasto.idGasto,
              nombreGasto: gasto.nombreGasto,
              costoGasto: Number(gasto.costoGasto) || 0,
              recurrencia: gasto.recurrencia
            }
          }
        );
        gasto.pagado = true;
      }

      await this.presentToast('Gasto marcado como pagado', 'success');
    } catch (error: any) {
      console.error('[FINANCE] Error marking as paid:', error);
      await this.presentToast(error?.message || 'Error al marcar como pagado', 'danger');
    } finally {
      this.isLoading = false;
      await loading.dismiss();
    }
  }

  getFilteredGastosFijos(): GastoFijo[] {
    if (!this.gastosFijos) return [];

    return this.gastosFijos.filter(gasto => {
      let matchesType = true;

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

  openVentaForm(): void {
    this.showActionModal = false;
    this.showAddVentaForm = true;
    this.showAddTransactionForm = false;
    this.showAddGastoFijoForm = false;
  }

  openTransactionForm(): void {
    this.showActionModal = false;
    this.showAddTransactionForm = true;
    this.showAddVentaForm = false;
    this.showAddGastoFijoForm = false;
  }

  openGastoFijoForm(): void {
    this.showActionModal = false;
    this.showAddGastoFijoForm = true;
    this.showAddVentaForm = false;
    this.showAddTransactionForm = false;
  }
}
