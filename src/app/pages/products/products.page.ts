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
  IonSearchbar,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBack,
  add,
  create,
  trash,
  save,
  close,
  search,
  cube,
  alertCircle, bug } from 'ionicons/icons';
import { ApiService } from '../../services/api-service';
import { AuthService } from '../../services/auth';

interface Product {
  idProducto: string;
  idNegocio: string;
  nombreProducto: string;
  precioVenta: number;
  costoProduccion: number;
  stock: number;
}

interface ProductForm {
  nombreProducto: string;
  precioVenta: number | null;
  costoProduccion: number | null;
  stock: number | null;
}

interface StockStatus {
  label: string;
  class: string;
}

@Component({
  selector: 'app-products',
  templateUrl: './products.page.html',
  styleUrls: ['./products.page.scss'],
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
    IonSearchbar,
    CommonModule, 
    FormsModule
  ]
})
export class ProductsPage implements OnInit {
  // Data
  products: Product[] = [];
  currentBusinessId: string = '';

  // UI State
  searchTerm: string = '';
  showAddForm: boolean = false;
  isLoading: boolean = false;
  isSaving: boolean = false;
  formError: string = '';

  // Form Data
  productForm: ProductForm = {
    nombreProducto: '',
    precioVenta: null,
    costoProduccion: null,
    stock: null
  };

  editingProduct: Product | null = null;

  constructor(
    private router: Router,
    private apiService: ApiService,
    private authService: AuthService,
    private toastController: ToastController
  ) {
    addIcons({arrowBack,bug,add,close,alertCircle,save,search,cube,create,trash});
  }

  async ngOnInit() {
    await this.loadBusinessAndProducts();
  }

  // Temporary diagnostic method
  async testBackend(): Promise<void> {
    console.log('[PRODUCTS] 🧪 Manual backend test started...');
    
    try {
      const baseUrl = this.apiService['baseUrl'];
      console.log('[PRODUCTS] 🌐 Base URL:', baseUrl);
      
      // Test 1: Basic connectivity
      console.log('[PRODUCTS] Test 1: Basic connectivity');
      try {
        const response = await fetch(baseUrl.replace('/api', ''));
        console.log('[PRODUCTS] ✅ Backend is running:', response.status);
        this.showToast(`Backend responding: ${response.status}`, 'success');
      } catch (error) {
        console.log('[PRODUCTS] ❌ Backend not accessible:', error);
        this.showToast('Backend not accessible', 'danger');
        return;
      }
      
      // Test 2: Business endpoint (should work)
      console.log('[PRODUCTS] Test 2: Business endpoint');
      try {
        const uid = this.authService.uid;
        const businesses = await this.apiService.getBusinessByUserId(uid!);
        console.log('[PRODUCTS] ✅ Business endpoint works:', businesses.length, 'businesses');
        this.showToast(`Business API works: ${businesses.length} businesses`, 'success');
      } catch (error) {
        console.log('[PRODUCTS] ❌ Business endpoint failed:', error);
        this.showToast('Business API failed', 'danger');
      }
      
      // Test 3: Products endpoint
      console.log('[PRODUCTS] Test 3: Products endpoint');
      try {
        const token = await this.apiService.getToken();
        const productsResponse = await fetch(`${baseUrl}/products`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('[PRODUCTS] Products endpoint status:', productsResponse.status);
        
        if (productsResponse.ok) {
          const data = await productsResponse.json();
          console.log('[PRODUCTS] ✅ Products endpoint works:', data);
          this.showToast('Products API works!', 'success');
        } else {
          const errorText = await productsResponse.text();
          console.log('[PRODUCTS] ❌ Products endpoint error:', errorText);
          this.showToast(`Products API error: ${productsResponse.status}`, 'danger');
        }
      } catch (error) {
        console.log('[PRODUCTS] ❌ Products endpoint failed:', error);
        this.showToast('Products API failed', 'danger');
      }
      
    } catch (error) {
      console.error('[PRODUCTS] ❌ Test failed:', error);
      this.showToast('Test failed', 'danger');
    }
  }

  private async loadBusinessAndProducts(): Promise<void> {
    this.isLoading = true;
    try {
      // Get user's business first
      const uid = this.authService.uid;
      if (!uid) {
        this.showToast('Error: Usuario no autenticado', 'danger');
        this.router.navigate(['/login']);
        return;
      }

      // Get user's business
      const businesses = await this.apiService.getBusinessByUserId(uid);
      if (businesses && businesses.length > 0) {
        this.currentBusinessId = businesses[0]['idNegocio'] || businesses[0]['id'];
        // Load products for this business
        await this.loadProducts();
      } else {
        this.showToast('No se encontró negocio asociado. Por favor configura tu negocio primero.', 'warning');
        this.router.navigate(['/tabs/settings']);
      }
    } catch (error) {
      console.error('Error loading business and products:', error);
      this.showToast('Error al cargar los datos', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  private async loadProducts(): Promise<void> {
    if (!this.currentBusinessId) {
      console.log('[PRODUCTS] ❌ No business ID available for loading products');
      return;
    }

    console.log('[PRODUCTS] 🔄 Loading products for business:', this.currentBusinessId);
    
    try {
      // Test backend connectivity before trying to load products
      console.log('[PRODUCTS] 🧪 Testing backend connectivity...');
      console.log('[PRODUCTS] 🌐 API base URL:', this.apiService['baseUrl']);
      
      this.products = await this.apiService.getProductsByBusiness(this.currentBusinessId);
      console.log('[PRODUCTS] ✅ Products loaded successfully:', this.products.length, 'items');
    } catch (error) {
      console.error('[PRODUCTS] ❌ Error loading products:', error);
      this.showToast('Error al cargar productos: ' + (error as Error).message, 'danger');
      this.products = [];
    }
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }

  isDarkMode(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // Computed Properties
  get filteredProducts(): Product[] {
    if (!this.searchTerm.trim()) {
      return this.products;
    }
    return this.products.filter(product =>
      product.nombreProducto.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  // Navigation
  goBack(): void {
    this.router.navigate(['/tabs/dashboard']);
  }

  // Search
  onSearchChange(event: any): void {
    this.searchTerm = event.detail.value;
  }

  clearSearch(): void {
    this.searchTerm = '';
  }

  // Form Management
  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (this.showAddForm) {
      this.resetForm();
    }
  }

  resetForm(): void {
    this.productForm = {
      nombreProducto: '',
      precioVenta: null,
      costoProduccion: null,
      stock: null
    };
    this.editingProduct = null;
    this.formError = '';
  }

  cancelForm(): void {
    this.showAddForm = false;
    this.resetForm();
  }

  // Form Validation
  isValidName(): boolean {
    return !!(this.productForm.nombreProducto && this.productForm.nombreProducto.trim().length >= 2);
  }

  isValidPrice(): boolean {
    return !!(this.productForm.precioVenta && this.productForm.precioVenta > 0);
  }

  isValidCost(): boolean {
    return !!(this.productForm.costoProduccion !== null && this.productForm.costoProduccion >= 0);
  }

  isValidStock(): boolean {
    return !!(this.productForm.stock !== null && this.productForm.stock >= 0);
  }

  isFormValid(): boolean {
    return this.isValidName() && 
           this.isValidPrice() && 
           this.isValidCost() && 
           this.isValidStock();
  }

  // CRUD Operations
  async saveProduct(): Promise<void> {
    if (!this.isFormValid()) {
      this.formError = 'Por favor completa todos los campos correctamente';
      return;
    }

    if (!this.currentBusinessId) {
      this.formError = 'No se encontró ID del negocio';
      return;
    }

    this.isSaving = true;
    this.formError = '';

    try {
      const productData = {
        idNegocio: this.currentBusinessId,
        nombreProducto: this.productForm.nombreProducto!.trim(),
        precioVenta: this.productForm.precioVenta!,
        costoProduccion: this.productForm.costoProduccion!,
        stock: this.productForm.stock!
      };

      console.log('[PRODUCTS] 📦 Product data to send:', productData);
      console.log('[PRODUCTS] 🔑 Current business ID:', this.currentBusinessId);
      console.log('[PRODUCTS] 🌐 API base URL:', this.apiService['baseUrl']);

      if (this.editingProduct) {
        // Update existing product (you may need to implement this in backend)
        // For now, we'll just show a message
        this.showToast('Funcionalidad de edición en desarrollo', 'warning');
      } else {
        // Add new product
        console.log('[PRODUCTS] 🚀 Calling createProduct...');
        const newProduct = await this.apiService.createProduct(productData);
        console.log('[PRODUCTS] ✅ Product created:', newProduct);
        
        // Reload products to get the updated list
        await this.loadProducts();
        
        this.showToast('Producto creado exitosamente', 'success');
      }

      this.showAddForm = false;
      this.resetForm();

    } catch (error) {
      this.formError = 'Error al guardar el producto. Inténtalo de nuevo.';
      console.error('Error saving product:', error);
      this.showToast('Error al guardar el producto', 'danger');
    } finally {
      this.isSaving = false;
    }
  }

  editProduct(product: Product): void {
    this.editingProduct = product;
    this.productForm = {
      nombreProducto: product.nombreProducto,
      precioVenta: product.precioVenta,
      costoProduccion: product.costoProduccion,
      stock: product.stock
    };
    this.showAddForm = true;
  }

  async deleteProduct(product: Product): Promise<void> {
    if (confirm(`¿Estás seguro de que quieres eliminar "${product.nombreProducto}"?`)) {
      try {
        // Note: Delete functionality not implemented in backend yet
        this.showToast('Funcionalidad de eliminación en desarrollo', 'warning');
      } catch (error) {
        console.error('Error deleting product:', error);
        this.showToast('Error al eliminar el producto', 'danger');
      }
    }
  }

  // Stock Status
  getStockStatus(stock: number): StockStatus {
    if (stock <= 10) return { label: 'Bajo', class: 'low' };
    if (stock <= 25) return { label: 'Medio', class: 'medium' };
    return { label: 'Alto', class: 'high' };
  }

  getStockStatusLabel(stock: number): string {
    return this.getStockStatus(stock).label;
  }

  getStockStatusClass(stock: number): string {
    return this.getStockStatus(stock).class;
  }

  // Calculations
  getProfitMargin(product: Product): string {
    if (product.precioVenta <= 0) return '0.0';
    const profit = product.precioVenta - product.costoProduccion;
    const margin = (profit / product.precioVenta) * 100;
    return margin.toFixed(1);
  }

  // Summary calculations
  getTotalStock(): number {
    return this.products.reduce((total, product) => total + product.stock, 0);
  }

  getTotalValue(): number {
    return this.products.reduce((total, product) => total + (product.precioVenta * product.stock), 0);
  }

  getLowStockCount(): number {
    return this.products.filter(product => product.stock <= 10).length;
  }

  // Utility methods
  trackByProductId(index: number, product: Product): string {
    return product.idProducto;
  }

  // Event handlers for form changes
  onFormChange(): void {
    if (this.formError) {
      this.formError = '';
    }
  }

  // Method to decrease stock (for future use in sales)
  async decreaseProductStock(productId: string, quantity: number): Promise<void> {
    try {
      await this.apiService.decreaseStock(productId, quantity);
      await this.loadProducts(); // Reload to show updated stock
      this.showToast(`Stock actualizado: -${quantity} unidades`, 'success');
    } catch (error) {
      console.error('Error decreasing stock:', error);
      this.showToast('Error al actualizar el stock', 'danger');
    }
  }
}
