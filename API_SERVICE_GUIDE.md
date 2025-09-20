# 🚀 API Service - Guía de Uso

Este archivo contiene la implementación del servicio API convertido de Dart a TypeScript para tu aplicación Ionic Angular.

## 📦 Dependencias Instaladas

- `@capacitor/preferences` - Para almacenamiento seguro de tokens
- `@angular/common/http` - Para peticiones HTTP

## ⚙️ Configuración

### 1. Variables de Entorno

Asegúrate de configurar tu Firebase API Key en los archivos de environment:

**src/environments/environment.ts**
```typescript
export const environment = {
  production: false,
  firebaseApiKey: 'TU_FIREBASE_API_KEY_AQUI', // ⚠️ Reemplaza con tu API key real
  apiBaseUrl: 'http://192.168.1.2:3000/api'
};
```

**src/environments/environment.prod.ts**
```typescript
export const environment = {
  production: true,
  firebaseApiKey: 'TU_FIREBASE_API_KEY_AQUI', // ⚠️ Reemplaza con tu API key real
  apiBaseUrl: 'https://tu-servidor-produccion.com/api'
};
```

### 2. HttpClient

Ya está configurado en `main.ts` con:
```typescript
provideHttpClient(withInterceptorsFromDi())
```

## 🔧 Métodos Disponibles

### 🔐 Autenticación

#### Login
```typescript
// En tu componente
import { ApiService } from '../services/api-service';

constructor(private apiService: ApiService) {}

async login() {
  try {
    const response = await this.apiService.login('user@example.com', 'password123');
    console.log('Login exitoso:', response.localId);
    // response contiene: idToken, localId, email, refreshToken, expiresIn
  } catch (error) {
    console.error('Error en login:', error.message);
  }
}
```

#### Registro
```typescript
async register() {
  try {
    const response = await this.apiService.register('user@example.com', 'password123');
    console.log('Registro exitoso:', response.localId);
  } catch (error) {
    console.error('Error en registro:', error.message);
  }
}
```

#### Logout
```typescript
async logout() {
  try {
    await this.apiService.logout();
    console.log('Sesión cerrada');
  } catch (error) {
    console.error('Error cerrando sesión:', error.message);
  }
}
```

#### Verificar Autenticación
```typescript
async checkAuth() {
  const isAuth = await this.apiService.isAuthenticated();
  if (isAuth) {
    console.log('Usuario autenticado');
  } else {
    console.log('Usuario no autenticado');
  }
}
```

### 👤 Gestión de Usuarios

#### Obtener Usuario por UID
```typescript
async getUser() {
  try {
    const uid = await this.apiService.getUid();
    if (uid) {
      const userData = await this.apiService.getUserByUid(uid);
      console.log('Datos del usuario:', userData);
    }
  } catch (error) {
    console.error('Error obteniendo usuario:', error.message);
  }
}
```

### 🏢 Datos de Negocio

#### Obtener Datos del Negocio
```typescript
async loadBusiness() {
  try {
    const businessData = await this.apiService.getBusiness();
    console.log('Datos del negocio:', businessData);
  } catch (error) {
    console.error('Error obteniendo negocio:', error.message);
  }
}
```

### 📦 Gestión de Productos

#### Obtener Productos
```typescript
async loadProducts() {
  try {
    const products = await this.apiService.getProducts();
    console.log('Productos:', products);
  } catch (error) {
    console.error('Error obteniendo productos:', error.message);
  }
}
```

#### Crear Producto
```typescript
async createProduct() {
  try {
    const productData = {
      name: 'Producto Nuevo',
      price: 99.99,
      description: 'Descripción del producto',
      category: 'Electronics'
    };
    
    const newProduct = await this.apiService.createProduct(productData);
    console.log('Producto creado:', newProduct);
  } catch (error) {
    console.error('Error creando producto:', error.message);
  }
}
```

#### Actualizar Producto
```typescript
async updateProduct(productId: string) {
  try {
    const updateData = {
      name: 'Producto Actualizado',
      price: 109.99
    };
    
    const updatedProduct = await this.apiService.updateProduct(productId, updateData);
    console.log('Producto actualizado:', updatedProduct);
  } catch (error) {
    console.error('Error actualizando producto:', error.message);
  }
}
```

#### Eliminar Producto
```typescript
async deleteProduct(productId: string) {
  try {
    await this.apiService.deleteProduct(productId);
    console.log('Producto eliminado');
  } catch (error) {
    console.error('Error eliminando producto:', error.message);
  }
}
```

### 🔑 Gestión de Tokens

#### Obtener Token
```typescript
async getToken() {
  const token = await this.apiService.getToken();
  if (token) {
    console.log('Token obtenido:', token);
  } else {
    console.log('No hay token almacenado');
  }
}
```

#### Obtener UID
```typescript
async getUid() {
  const uid = await this.apiService.getUid();
  if (uid) {
    console.log('UID obtenido:', uid);
  } else {
    console.log('No hay UID almacenado');
  }
}
```

## 🛡️ Manejo de Errores

El servicio maneja automáticamente varios tipos de errores:

- **Errores de red**: "Sin conexión a internet"
- **Timeouts**: "Tiempo de espera agotado"
- **Errores de Firebase**: Mensajes traducidos al español
- **Errores del servidor**: Mensajes descriptivos

### Errores de Firebase Traducidos

- `EMAIL_EXISTS` → "El correo ya está registrado"
- `EMAIL_NOT_FOUND` → "Correo no encontrado"
- `INVALID_PASSWORD` → "Contraseña incorrecta"
- `USER_DISABLED` → "Cuenta deshabilitada"
- `TOO_MANY_ATTEMPTS_TRY_LATER` → "Demasiados intentos, intenta más tarde"
- `WEAK_PASSWORD` → "La contraseña es muy débil"
- `INVALID_EMAIL` → "El formato del correo es inválido"

## 📱 Ejemplo Completo en un Componente

```typescript
import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api-service';
import { ToastController } from '@ionic/angular/standalone';

@Component({
  selector: 'app-example',
  templateUrl: './example.page.html'
})
export class ExamplePage implements OnInit {
  user: any = null;
  products: any[] = [];
  loading = false;

  constructor(
    private apiService: ApiService,
    private toastCtrl: ToastController
  ) {}

  async ngOnInit() {
    await this.checkAuthentication();
  }

  async checkAuthentication() {
    const isAuth = await this.apiService.isAuthenticated();
    if (isAuth) {
      await this.loadUserData();
      await this.loadProducts();
    } else {
      // Redirigir a login
    }
  }

  async loadUserData() {
    try {
      const uid = await this.apiService.getUid();
      if (uid) {
        this.user = await this.apiService.getUserByUid(uid);
      }
    } catch (error: any) {
      await this.showToast(error.message, 'danger');
    }
  }

  async loadProducts() {
    try {
      this.loading = true;
      this.products = await this.apiService.getProducts();
    } catch (error: any) {
      await this.showToast(error.message, 'danger');
    } finally {
      this.loading = false;
    }
  }

  async logout() {
    try {
      await this.apiService.logout();
      await this.showToast('Sesión cerrada correctamente', 'success');
      // Redirigir a login
    } catch (error: any) {
      await this.showToast(error.message, 'danger');
    }
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color
    });
    await toast.present();
  }
}
```

## 🔧 Personalización

Puedes extender el servicio añadiendo nuevos métodos para tus endpoints específicos:

```typescript
// Ejemplo: Obtener estadísticas
async getStatistics(): Promise<any> {
  const token = await this.getToken();
  if (!token) throw new Error('Usuario no autenticado.');

  const url = `${this.baseUrl}/statistics`;
  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  });

  try {
    const response = await this.http.get<any>(url, { headers })
      .pipe(timeout(this.requestTimeout))
      .toPromise();
    
    return response;
  } catch (error) {
    throw this.handleHttpError(error);
  }
}
```

## ⚠️ Notas Importantes

1. **API Key**: Asegúrate de reemplazar `YOUR_FIREBASE_API_KEY_HERE` con tu clave real
2. **URLs**: Cambia `http://192.168.1.2:3000/api` por la URL de tu servidor
3. **Tokens**: Los tokens se almacenan automáticamente usando Capacitor Preferences
4. **Timeouts**: Todas las peticiones tienen un timeout de 10 segundos
5. **Logs**: Los errores se registran en la consola para debugging

## 🚀 Siguientes Pasos

1. Configura tu Firebase API Key
2. Ajusta las URLs de tu backend
3. Implementa el servicio en tus páginas de login y register
4. Añade manejo de errores en tu UI
5. Considera implementar un interceptor para refresh automático de tokens