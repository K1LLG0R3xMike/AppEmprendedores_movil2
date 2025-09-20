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
  IonSearchbar
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
  alertCircle
} from 'ionicons/icons';

interface Product {
  id: number;
  name: string;
  price: number;
  cost: number;
  stock: number;
  category: string;
}

interface ProductForm {
  name: string;
  category: string;
  price: number | null;
  cost: number | null;
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
  products: Product[] = [
    { id: 1, name: 'Camiseta Básica', price: 25.99, cost: 12.50, stock: 45, category: 'Ropa' },
    { id: 2, name: 'Jeans Premium', price: 89.99, cost: 45.00, stock: 23, category: 'Ropa' },
    { id: 3, name: 'Zapatillas Deportivas', price: 129.99, cost: 65.00, stock: 12, category: 'Calzado' },
    { id: 4, name: 'Mochila Urbana', price: 45.99, cost: 22.00, stock: 8, category: 'Accesorios' }
  ];

  // UI State
  searchTerm: string = '';
  showAddForm: boolean = false;
  isLoading: boolean = false;
  isSaving: boolean = false;
  formError: string = '';

  // Form Data
  productForm: ProductForm = {
    name: '',
    category: '',
    price: null,
    cost: null,
    stock: null
  };

  editingProduct: Product | null = null;

  constructor(private router: Router) {
    addIcons({ 
      arrowBack,
      add,
      create,
      trash,
      save,
      close,
      search,
      cube,
      alertCircle
    });
  }

  ngOnInit() {
    // Simulate loading
    this.isLoading = true;
    setTimeout(() => {
      this.isLoading = false;
    }, 1000);
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
      product.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(this.searchTerm.toLowerCase())
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
      name: '',
      category: '',
      price: null,
      cost: null,
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
    return !!(this.productForm.name && this.productForm.name.trim().length >= 2);
  }

  isValidCategory(): boolean {
    return !!(this.productForm.category && this.productForm.category.trim().length >= 2);
  }

  isValidPrice(): boolean {
    return !!(this.productForm.price && this.productForm.price > 0);
  }

  isValidCost(): boolean {
    return !!(this.productForm.cost && this.productForm.cost >= 0);
  }

  isValidStock(): boolean {
    return !!(this.productForm.stock !== null && this.productForm.stock >= 0);
  }

  isFormValid(): boolean {
    return this.isValidName() && 
           this.isValidCategory() && 
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

    this.isSaving = true;
    this.formError = '';

    try {
      // Simulate API call
      await this.simulateApiCall(1500);

      const productData: Product = {
        id: this.editingProduct ? this.editingProduct.id : this.getNextId(),
        name: this.productForm.name!.trim(),
        category: this.productForm.category!.trim(),
        price: this.productForm.price!,
        cost: this.productForm.cost!,
        stock: this.productForm.stock!
      };

      if (this.editingProduct) {
        // Update existing product
        const index = this.products.findIndex(p => p.id === this.editingProduct!.id);
        if (index !== -1) {
          this.products[index] = productData;
        }
      } else {
        // Add new product
        this.products.push(productData);
      }

      this.showAddForm = false;
      this.resetForm();

    } catch (error) {
      this.formError = 'Error al guardar el producto. Inténtalo de nuevo.';
      console.error('Error saving product:', error);
    } finally {
      this.isSaving = false;
    }
  }

  editProduct(product: Product): void {
    this.editingProduct = product;
    this.productForm = {
      name: product.name,
      category: product.category,
      price: product.price,
      cost: product.cost,
      stock: product.stock
    };
    this.showAddForm = true;
  }

  async deleteProduct(product: Product): Promise<void> {
    if (confirm(`¿Estás seguro de que quieres eliminar "${product.name}"?`)) {
      try {
        // Simulate API call
        await this.simulateApiCall(1000);
        
        const index = this.products.findIndex(p => p.id === product.id);
        if (index !== -1) {
          this.products.splice(index, 1);
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        // Show error message
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
    if (product.price <= 0) return '0.0';
    const profit = product.price - product.cost;
    const margin = (profit / product.price) * 100;
    return margin.toFixed(1);
  }

  // Summary calculations
  getTotalStock(): number {
    return this.products.reduce((total, product) => total + product.stock, 0);
  }

  getTotalValue(): number {
    return this.products.reduce((total, product) => total + (product.price * product.stock), 0);
  }

  getLowStockCount(): number {
    return this.products.filter(product => product.stock <= 10).length;
  }

  // Utility methods
  private getNextId(): number {
    return Math.max(...this.products.map(p => p.id), 0) + 1;
  }

  trackByProductId(index: number, product: Product): number {
    return product.id;
  }

  private async simulateApiCall(delay: number): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate random failures for testing
        if (Math.random() < 0.05) { // 5% chance of failure
          reject(new Error('Error de conexión'));
        } else {
          resolve();
        }
      }, delay);
    });
  }

  // Event handlers for form changes
  onFormChange(): void {
    if (this.formError) {
      this.formError = '';
    }
  }
}
