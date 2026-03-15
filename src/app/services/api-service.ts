import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { Preferences } from '@capacitor/preferences';
import { environment } from '../../environments/environment';

interface FirebaseAuthResponse {
  idToken: string;
  localId: string;
  email?: string;
  refreshToken?: string;
  expiresIn?: string;
}

interface UserData {
  [key: string]: any;
}

interface BusinessData {
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  // 🔹 Configuration
  private readonly firebaseApiKey = environment.firebaseApiKey;
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly requestTimeout = 10000; // 10 segundos
  private readonly dashboardBalanceKey = 'dashboard_balance_total';

  constructor(private http: HttpClient) {}

  // 🔹 Obtener datos del usuario por UID desde el backend
  async getUserByUid(uid: string): Promise<UserData> {
    if (!uid || uid.trim() === '') {
      throw new Error('El UID no puede estar vacío.');
    }

    const token = await this.getToken();
    if (!token || token.trim() === '') {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/users/${uid}`;
    
    try {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      });

      const response = await this.http.get<UserData>(url, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      if (!response) {
        throw new Error('Respuesta vacía del servidor.');
      }

      return response;
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error('Usuario no encontrado.');
      }
      throw this.handleHttpError(error);
    }
  }

  // 🔹 Registrar usuario en Firebase Auth
  async register(email: string, password: string): Promise<FirebaseAuthResponse> {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.firebaseApiKey}`;

    const body = {
      email: email,
      password: password,
      returnSecureToken: true
    };

    try {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });

      const response = await this.http.post<FirebaseAuthResponse>(url, body, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      if (response) {
        // Guardar token y UID en el almacenamiento seguro
        await Preferences.set({
          key: 'idToken',
          value: response.idToken
        });
        
        await Preferences.set({
          key: 'uid',
          value: response.localId
        });

        return response;
      } else {
        throw new Error('Respuesta inválida del servidor.');
      }
    } catch (error: any) {
      throw this.handleHttpError(error);
    }
  }

  // 🔹 Login usuario con Firebase Auth
  async login(email: string, password: string): Promise<FirebaseAuthResponse> {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${this.firebaseApiKey}`;

    const body = {
      email: email,
      password: password,
      returnSecureToken: true
    };

    console.log('[LOGIN] Intentando login para:', email);

    try {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });

      const response = await this.http.post<FirebaseAuthResponse>(url, body, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      if (response) {
        console.log('[LOGIN] Status: 200');
        console.log('[LOGIN] Login exitoso para:', email, '(uid:', response.localId, ')');
        console.log('[LOGIN] Token recibido:', response.idToken);
        // Guardar token y UID en el almacenamiento seguro
        await Preferences.set({
          key: 'idToken',
          value: response.idToken
        });
        
        await Preferences.set({
          key: 'uid',
          value: response.localId
        });

        return response;
      } else {
        throw new Error('Respuesta inválida del servidor.');
      }
    } catch (error: any) {
      console.log('[LOGIN] Error:', error);
      throw this.handleHttpError(error);
    }
  }

  // 🔹 Obtener token almacenado
  async getToken(): Promise<string | null> {
    try {
      const result = await Preferences.get({ key: 'idToken' });
      return result.value;
    } catch (error) {
      console.error('Error obteniendo token:', error);
      return null;
    }
  }

  // 🔹 Obtener UID almacenado
  async getUid(): Promise<string | null> {
    try {
      const result = await Preferences.get({ key: 'uid' });
      return result.value;
    } catch (error) {
      console.error('Error obteniendo UID:', error);
      return null;
    }
  }

  // 🔹 Verificar si el token es válido
  async isTokenValid(): Promise<boolean> {
    const token = await this.getToken();
    if (!token) return false;

    try {
      // Verificar con una llamada simple al backend
      const uid = await this.getUid();
      if (!uid) return false;

      const url = `${this.baseUrl}/users/${uid}`;
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      });

      await this.http.get(url, { headers })
        .pipe(
          timeout(5000), // Timeout más corto para verificación
          catchError(() => {
            console.log('[API] Token validation failed');
            return throwError(() => new Error('Token invalid'));
          })
        )
        .toPromise();

      return true;
    } catch (error) {
      console.log('[API] Token is invalid or expired');
      return false;
    }
  }

  // 🔹 Ejemplo de ruta protegida al backend
  async getBusiness(): Promise<BusinessData> {
    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/business`;

    try {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      });

      const response = await this.http.get<BusinessData>(url, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      if (!response) {
        throw new Error('Respuesta vacía del servidor.');
      }

      return response;
    } catch (error: any) {
      throw this.handleHttpError(error);
    }
  }

  // 🔹 Crear negocio en el backend
  async createBusiness(businessData: any): Promise<BusinessData> {
    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/business`;

    try {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      });

      const response = await this.http.post<BusinessData>(url, businessData, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      if (!response) {
        throw new Error('Respuesta vac�a del servidor.');
      }


      const capitalInicial = Number(
        businessData?.capitalInicial ??
        response?.['data']?.['capitalInicial'] ??
        response?.['capitalInicial'] ??
        0
      );

      try {
        await this.setDashboardBalanceLocal(Number.isFinite(capitalInicial) ? capitalInicial : 0);
      } catch (storageError) {
        console.warn('[API] No se pudo inicializar balance local tras crear negocio:', storageError);
      }

      return response;
    } catch (error: any) {
      throw this.handleHttpError(error);
    }
  }

  // 🔹 Obtener negocios por UID del usuario
  async getBusinessByUserId(uid: string): Promise<BusinessData[]> {
    if (!uid || uid.trim() === '') {
      throw new Error('El UID no puede estar vacío.');
    }

    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/business/user/${uid}`;

    try {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      });

      const response = await this.http.get<{ message: string, data: BusinessData[] }>(url, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      if (!response) {
        throw new Error('Respuesta vacía del servidor.');
      }

      return response.data || [];
    } catch (error: any) {
      if (error.status === 404) {
        // No se encontraron negocios para este usuario
        return [];
      }
      throw this.handleHttpError(error);
    }
  }

  // 🔹 Logout → elimina token y UID
  async logout(): Promise<void> {
    try {
      await Preferences.remove({ key: 'idToken' });
      await Preferences.remove({ key: 'uid' });
      console.log('[LOGOUT] Sesión cerrada correctamente');
    } catch (error) {
      console.error('Error cerrando sesión:', error);
      throw new Error('Error cerrando sesión.');
    }
  }

  // 🔹 Verificar si el usuario está autenticado
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null && token.trim() !== '';
  }

  // 🔹 Balance local para Dashboard (persistente en Ionic/Android)
  async getDashboardBalanceLocal(): Promise<number> {
    try {
      const pref = await Preferences.get({ key: this.dashboardBalanceKey });
      if (pref.value !== null && pref.value !== undefined) {
        const parsed = Number(pref.value);
        return Number.isFinite(parsed) ? parsed : 0;
      }
    } catch (error) {
      console.warn('[API] Error reading dashboard balance from Preferences:', error);
    }

    try {
      const raw = localStorage.getItem(this.dashboardBalanceKey);
      if (raw !== null) {
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : 0;
      }
    } catch (error) {
      console.warn('[API] Error reading dashboard balance from localStorage:', error);
    }

    return 0;
  }

  async setDashboardBalanceLocal(value: number): Promise<number> {
    const normalized = Number.isFinite(value) ? value : 0;
    const serialized = String(normalized);

    await Preferences.set({
      key: this.dashboardBalanceKey,
      value: serialized
    });

    try {
      localStorage.setItem(this.dashboardBalanceKey, serialized);
    } catch (error) {
      console.warn('[API] Error writing dashboard balance to localStorage:', error);
    }

    return normalized;
  }

  async applyDeltaToDashboardBalance(delta: number): Promise<number> {
    const current = await this.getDashboardBalanceLocal();
    const safeDelta = Number.isFinite(delta) ? delta : 0;
    return this.setDashboardBalanceLocal(current + safeDelta);
  }

  // 🔹 Manejo de errores HTTP para Observables
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Error desconocido';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      if (error.error && error.error.error && error.error.error.message) {
        errorMessage = this.parseFirebaseError(error.error.error.message);
      } else {
        errorMessage = `Error ${error.status}: ${error.message}`;
      }
    }

    console.error('HTTP Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  // 🔹 Manejo específico de errores HTTP para async/await
  private handleHttpError(error: any): Error {
    if (error.name === 'TimeoutError') {
      return new Error('Tiempo de espera agotado. Verifica tu conexión a internet.');
    }

    if (error.status === 0) {
      console.log('[API] Sin conexión a internet.');
      return new Error('Sin conexión a internet.');
    }

    if (error.error && error.error.error && error.error.error.message) {
      return new Error(this.parseFirebaseError(error.error.error.message));
    }

    if (error.message) {
      return new Error(error.message);
    }

    console.log('[API] Error en el servidor.');
    return new Error('Error en el servidor.');
  }

  // 🔹 Parsear errores de Firebase para mensajes más claros
  private parseFirebaseError(message: string): string {
    switch (message) {
      case 'EMAIL_EXISTS':
        return 'El correo ya está registrado.';
      case 'EMAIL_NOT_FOUND':
        return 'Correo no encontrado.';
      case 'INVALID_PASSWORD':
        return 'Contraseña incorrecta.';
      case 'USER_DISABLED':
        return 'Cuenta deshabilitada.';
      case 'TOO_MANY_ATTEMPTS_TRY_LATER':
        return 'Demasiados intentos, intenta más tarde.';
      case 'WEAK_PASSWORD':
        return 'La contraseña es muy débil.';
      case 'INVALID_EMAIL':
        return 'El formato del correo es inválido.';
      default:
        return `Error: ${message}`;
    }
  }

  // 🔹 Métodos adicionales para funcionalidades específicas del negocio

  // Obtener email del usuario desde Firebase Auth
  async getUserEmail(uid: string): Promise<string | null> {
    if (!uid || uid.trim() === '') {
      throw new Error('El UID no puede estar vacío.');
    }

    const token = await this.getToken();
    if (!token) throw new Error('Usuario no autenticado.');

    const url = `${this.baseUrl}/users/${uid}/email`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      console.log('📧 [GET_USER_EMAIL] Obteniendo email del usuario:', uid);
      
      const response = await this.http.get<{ message: string, email: string | null }>(url, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();
      
      console.log('✅ [GET_USER_EMAIL] Email obtenido:', response?.email);
      return response?.email || null;
    } catch (error) {
      console.error('❌ [GET_USER_EMAIL] Error obteniendo email:', error);
      // No lanzar error, simplemente retornar null si no se puede obtener
      return null;
    }
  }

  // Crear usuario en el backend después del onboarding
  async createUser(userData: { name: string, birthdate: string, numeroDeTelefono: string }): Promise<any> {
    const token = await this.getToken();
    if (!token) throw new Error('Usuario no autenticado.');

    const url = `${this.baseUrl}/users/`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      console.log('🚀 [CREATE_USER] Enviando datos al backend:', userData);
      
      const response = await this.http.post<any>(url, userData, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();
      
      console.log('✅ [CREATE_USER] Usuario creado exitosamente:', response);
      return response;
    } catch (error) {
      console.error('❌ [CREATE_USER] Error creando usuario:', error);
      throw this.handleHttpError(error);
    }
  }

  // Actualizar datos del usuario
  async updateUser(uid: string, userData: any): Promise<any> {
    if (!uid || uid.trim() === '') {
      throw new Error('El UID no puede estar vacío.');
    }

    const token = await this.getToken();
    if (!token) throw new Error('Usuario no autenticado.');

    const url = `${this.baseUrl}/users/${uid}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.put<any>(url, userData, { headers })
        .pipe(timeout(this.requestTimeout))
        .toPromise();
      
      return response;
    } catch (error) {
      throw this.handleHttpError(error);
    }
  }

  // 🔹 Obtener productos por negocio
  async getProductsByBusiness(idNegocio: string): Promise<any[]> {
    if (!idNegocio || idNegocio.trim() === '') {
      throw new Error('El ID del negocio no puede estar vacío.');
    }

    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/product/business/${idNegocio}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.get<any>(url, { headers })
        .pipe(timeout(this.requestTimeout))
        .toPromise();
      
      return response?.data || [];
    } catch (error: any) {
      if (error.status === 404) {
        return []; // No products found for this business
      }
      throw this.handleHttpError(error);
    }
  }

  // 🔹 Crear producto
  async createProduct(productData: {
    idNegocio: string;
    nombreProducto: string;
    precioVenta: number;
    costoProduccion: number;
    stock: number;
  }): Promise<any> {
    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/product/`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.post<any>(url, productData, { headers })
        .pipe(timeout(this.requestTimeout))
        .toPromise();
      
      return response?.data;
    } catch (error) {
      throw this.handleHttpError(error);
    }
  }

  // 🔹 Disminuir stock de producto
  async decreaseStock(idProducto: string, cantidad: number): Promise<any> {
    if (!idProducto || !cantidad) {
      throw new Error('ID del producto y cantidad son requeridos.');
    }

    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/product/decrease-stock`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    const body = {
      idProducto,
      cantidad
    };

    try {
      const response = await this.http.post<any>(url, body, { headers })
        .pipe(timeout(this.requestTimeout))
        .toPromise();
      
      return response;
    } catch (error) {
      throw this.handleHttpError(error);
    }
  }

  // Obtener datos de productos (deprecated - use getProductsByBusiness instead)
  async getProducts(): Promise<any[]> {
    const token = await this.getToken();
    if (!token) throw new Error('Usuario no autenticado.');

    const url = `${this.baseUrl}/products`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.get<any[]>(url, { headers })
        .pipe(timeout(this.requestTimeout))
        .toPromise();
      
      return response || [];
    } catch (error) {
      throw this.handleHttpError(error);
    }
  }

  // Actualizar producto
  async updateProduct(productId: string, productData: any, businessId?: string): Promise<any> {
    const token = await this.getToken();
    if (!token) throw new Error('Usuario no autenticado.');

    const url = `${this.baseUrl}/product/${productId}`;
    console.log('[API] 🔄 UPDATE PRODUCT URL:', url);
    console.log('[API] 📋 Product ID:', productId);
    console.log('[API] 🏢 Business ID:', businessId);
    console.log('[API] 📤 Original Product Data:', productData);
    
    // Crear el objeto de datos igual que en Postman
    const dataToSend = {
      idNegocio: businessId,
      nombreProducto: productData.nombreProducto,
      precioVenta: productData.precioVenta,
      costoProduccion: productData.costoProduccion,
      stock: productData.stock
    };
    
    console.log('[API] 📤 Final Data to Send (Postman format):', dataToSend);
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.put<any>(url, dataToSend, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();
      
      console.log('[API] ✅ UPDATE PRODUCT RESPONSE:', response);
      return response;
    } catch (error: any) {
      console.error('[API] ❌ UPDATE PRODUCT ERROR:', error);
      console.error('[API] ❌ Error status:', error.status);
      console.error('[API] ❌ Error message:', error.message);
      console.error('[API] ❌ Full error object:', error);
      
      if (error.status === 404) {
        console.error('[API] 🚨 404 ANALYSIS:');
        console.error('- URL being called:', url);
        console.error('- Expected backend route: PUT /api/product/:idProducto');
        console.error('- Router registration: app.use(\'/api/product\', productRoutes)');
        console.error('- Router method: router.put(\'/:idProducto\', verifyFirebaseToken, updateProduct)');
        console.error('- Possible causes:');
        console.error('  1. verifyFirebaseToken middleware is rejecting the token');
        console.error('  2. updateProduct function is not found');
        console.error('  3. Product does not exist in Firestore');
        console.error('  4. Route is not properly registered');
      }
      
      throw this.handleHttpError(error);
    }
  }

  // Eliminar producto
  async deleteProduct(productId: string): Promise<any> {
    const token = await this.getToken();
    if (!token) throw new Error('Usuario no autenticado.');

    const url = `${this.baseUrl}/product/${productId}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.delete<any>(url, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      return response;
    } catch (error) {
      throw this.handleHttpError(error);
    }
  }

  // 🔹 Crear transacción financiera
  async createTransaction(transactionData: {
    idNegocio: string;
    tipo: 'income' | 'expense' | 'ingreso' | 'egreso' | boolean | number;
    monto: number;
    descripcion?: string;
  }): Promise<any> {
    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/transaction/`;
    console.log('[API] 💰 CREATE TRANSACTION URL:', url);
    
    // Normalizar el tipo según la lógica del backend
    let tipoNormalizado: number;
    
    if (typeof transactionData.tipo === 'boolean') {
      // Si es booleano: false = ingreso (0), true = egreso (1)
      tipoNormalizado = transactionData.tipo ? 1 : 0;
    } else if (typeof transactionData.tipo === 'number') {
      // Si es número: 0 = ingreso, 1 = egreso
      tipoNormalizado = transactionData.tipo;
    } else if (typeof transactionData.tipo === 'string') {
      // Si es string: convertir a número según las reglas del backend
      const tipoStr = transactionData.tipo.toLowerCase();
      if (tipoStr === 'income' || tipoStr === 'ingreso') {
        tipoNormalizado = 0; // ingreso
      } else if (tipoStr === 'expense' || tipoStr === 'egreso') {
        tipoNormalizado = 1; // egreso
      } else {
        throw new Error('Tipo inválido. Usa "income"/"expense" o "ingreso"/"egreso"');
      }
    } else {
      throw new Error('Tipo inválido. Debe ser string, boolean o number');
    }

    // Preparar datos para enviar al backend
    const dataToSend = {
      idNegocio: transactionData.idNegocio,
      tipo: tipoNormalizado, // Enviar como número (0 o 1)
      monto: transactionData.monto,
      descripcion: transactionData.descripcion || ''
    };
    
    console.log('[API] 📤 Transaction Data (normalized):', dataToSend);
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.post<any>(url, dataToSend, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      console.log('[API] ✅ Transaction created successfully:', response);
      return response;
    } catch (error: any) {
      console.error('[API] ❌ Error creating transaction:', error);
      throw this.handleHttpError(error);
    }
  }

  // 🔹 Obtener transacciones por negocio
  // Crear venta de producto
  async createVenta(ventaData: {
    idNegocio: string;
    idProducto: string;
    cantidadVendida: number;
    precioUnitario: number;
    costoProduccion: number;
  }): Promise<any> {
    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/product-sold/`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.post<any>(url, ventaData, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      return response;
    } catch (error) {
      throw this.handleHttpError(error);
    }
  }

  // Obtener ventas por producto
  async getVentasByProducto(idProducto: string): Promise<any[]> {
    if (!idProducto || idProducto.trim() === '') {
      throw new Error('El ID del producto no puede estar vacío.');
    }

    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/product-sold/ventas/producto/${idProducto}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.get<{ message: string; data: any[] }>(url, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      return response?.data || [];
    } catch (error: any) {
      if (error.status === 404) {
        return [];
      }
      throw this.handleHttpError(error);
    }
  }

  // Obtener ventas por producto en un mes
  async getVentasByProductoEnMes(idProducto: string, year: number, month: number): Promise<any[]> {
    if (!idProducto || idProducto.trim() === '') {
      throw new Error('El ID del producto no puede estar vacío.');
    }

    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/product-sold/ventas/producto/${idProducto}/${year}/${month}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.get<{ message: string; data: any[] }>(url, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      return response?.data || [];
    } catch (error: any) {
      if (error.status === 404) {
        return [];
      }
      throw this.handleHttpError(error);
    }
  }

  // Obtener resumen de ventas por producto en un mes
  async getResumenVentasByProductoEnMes(idProducto: string, year: number, month: number): Promise<any> {
    if (!idProducto || idProducto.trim() === '') {
      throw new Error('El ID del producto no puede estar vacío.');
    }

    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/product-sold/ventas/producto/resumen/${idProducto}/${year}/${month}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.get<any>(url, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      return response;
    } catch (error) {
      throw this.handleHttpError(error);
    }
  }

  // Obtener resumen de ventas por negocio en un mes
  async getResumenVentasByNegocioEnMes(idNegocio: string, year: number, month: number): Promise<any> {
    if (!idNegocio || idNegocio.trim() === '') {
      throw new Error('El ID del negocio no puede estar vacío.');
    }

    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/product-sold/ventas/producto/negocio/${idNegocio}/${year}/${month}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.get<any>(url, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      return response;
    } catch (error) {
      throw this.handleHttpError(error);
    }
  }

  async getRentabilidadLive(idNegocio: string, year: number, month: number): Promise<any> {
    if (!idNegocio || idNegocio.trim() === '') {
      throw new Error('El ID del negocio no puede estar vacío.');
    }

    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/rentabilidad/live/${idNegocio}/${year}/${month}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.get<any>(url, { headers })
        .pipe(timeout(this.requestTimeout))
        .toPromise();

      return response?.data || response;
    } catch (error) {
      throw this.handleHttpError(error);
    }
  }

  async getEgresosByMonthShort(idNegocio: string, year: number, month: number): Promise<any> {
    if (!idNegocio || idNegocio.trim() === '') {
      throw new Error('El ID del negocio no puede estar vacío.');
    }

    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/transaction/negocios/${idNegocio}/egresos/${year}/${month}/short`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.get<any>(url, { headers })
        .pipe(timeout(this.requestTimeout))
        .toPromise();

      return response;
    } catch (error: any) {
      if (error?.status === 404) {
        return { totalEgresos: 0, count: 0 };
      }
      throw this.handleHttpError(error);
    }
  }

  async getTransactionsByBusiness(idNegocio: string): Promise<any[]> {
    if (!idNegocio || idNegocio.trim() === '') {
      throw new Error('El ID del negocio no puede estar vacío.');
    }

    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/transaction/negocios/${idNegocio}/transacciones`;
    console.log('[API] 📋 GET TRANSACTIONS BY BUSINESS URL:', url);
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.get<{ 
        message: string, 
        count: number, 
        data: any[] 
      }>(url, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      console.log('[API] ✅ Transactions retrieved successfully:', response);
      
      // Procesar los datos para normalizar el tipo según la interfaz del frontend
      const processedData = (response?.data || []).map(transaction => {
        return {
          ...transaction,
          // Convertir tipo booleano del backend a string para el frontend
          // false = ingreso -> 'income', true = egreso -> 'expense'
          typeString: transaction.tipo === false ? 'income' : 'expense',
          // Mantener el tipo original también
          tipoOriginal: transaction.tipo,
          // Asegurar que la fecha esté en formato correcto
          date: transaction.fechaISO || transaction.fecha,
          // Agregar propiedades que espera el frontend
          id: transaction.idTransaccion,
          type: transaction.tipo === false ? 'income' : 'expense',
          amount: transaction.monto,
          description: transaction.descripcion || '',
          category: 'General', // Valor por defecto si no viene del backend
          method: 'No especificado', // Valor por defecto si no viene del backend
          status: 'completed' // Valor por defecto
        };
      });

      console.log('[API] 📊 Processed transactions for frontend:', processedData);
      return processedData;
    } catch (error: any) {
      if (error.status === 404) {
        console.log('[API] ℹ️ No transactions found for business:', idNegocio);
        return [];
      }
      console.error('[API] ❌ Error getting transactions:', error);
      throw this.handleHttpError(error);
    }
  }

  // 🔹 Actualizar negocio
  async updateBusiness(idNegocio: string, businessData: {
    nombreNegocio?: string;
    descripcion?: string;
    sector?: string;
    capitalInicial?: number;
  }): Promise<any> {
    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/business/${idNegocio}`;
    console.log('[API] 🏢 UPDATE BUSINESS URL:', url);
    console.log('[API] 📤 Business Data:', businessData);
    console.log('[API] 🔑 Token preview:', token.substring(0, 20) + '...');
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.put<any>(url, businessData, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      console.log('[API] ✅ Business updated successfully:', response);
      return response;
    } catch (error: any) {
      console.error('[API] ❌ Error updating business:', error);
      
      // Si es error 401, intentar refrescar token
      if (error.message && error.message.includes('401')) {
        console.log('[API] 🔄 Token might be expired, checking authentication...');
        
        // Limpiar token expirado
        await this.logout();
        
        throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      }
      
      throw this.handleHttpError(error);
    }
  }

  // 🔹 Crear gasto fijo
  async createGastoFijo(gastoData: {
    idNegocio: string;
    nombreGasto: string;
    costoGasto: number;
    descripcion: string;
    recurrencia: string;
    fechasEjecucion: string[];
    pagado?: boolean;
  }): Promise<any> {
    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/gasto-fijo/`;
    console.log('[API] 💳 CREATE GASTO FIJO URL:', url);
    console.log('[API] 📤 Gasto Fijo Data:', gastoData);
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.post<any>(url, gastoData, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      console.log('[API] ✅ Gasto fijo created successfully:', response);
      return response;
    } catch (error: any) {
      console.error('[API] ❌ Error creating gasto fijo:', error);
      throw this.handleHttpError(error);
    }
  }

  // 🔹 Marcar gasto fijo como pagado
  async markGastoFijoAsPaid(idGasto: string): Promise<any> {
    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/gasto-fijo/${idGasto}/mark-as-paid`;
    console.log('[API] ✅ MARK GASTO FIJO AS PAID URL:', url);
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.patch<any>(url, {}, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      console.log('[API] ✅ Gasto fijo marked as paid successfully:', response);
      return response;
    } catch (error: any) {
      console.error('[API] ❌ Error marking gasto fijo as paid:', error);
      throw this.handleHttpError(error);
    }
  }

  // 🔹 Registrar gasto fijo pagado en historial
  async createGastoFijoPagado(gastoPagadoData: {
    idNegocio: string;
    nombreGasto: string;
    costoGasto: number;
  }): Promise<any> {
    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/gasto-fijo-pagado/`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.post<any>(url, gastoPagadoData, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();


      return response;
    } catch (error: any) {
      throw this.handleHttpError(error);
    }
  }
  // Get paid fixed expenses history
  async getGastosFijosPagados(): Promise<any[]> {
    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/gasto-fijo-pagado/`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.get<{ message: string; total: number; data: any[] }>(url, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      return response?.data || [];
    } catch (error: any) {
      const is404 =
        error?.status === 404 ||
        (typeof error?.message === 'string' && error.message.includes('404'));

      if (is404) {
        return [];
      }

      throw this.handleHttpError(error);
    }
  }
  async getGastosFijosByBusiness(idNegocio: string): Promise<any[]> {
    if (!idNegocio || idNegocio.trim() === '') {
      throw new Error('El ID del negocio no puede estar vacío.');
    }

    const token = await this.getToken();
    if (!token) {
      throw new Error('Usuario no autenticado.');
    }

    const url = `${this.baseUrl}/gasto-fijo/business/${idNegocio}`;
    console.log('[API] 📋 GET GASTOS FIJOS URL:', url);
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.get<{ message: string, data: any[] }>(url, { headers })
        .pipe(
          timeout(this.requestTimeout)
        )
        .toPromise();

      console.log('[API] ✅ Gastos fijos retrieved successfully:', response);
      return response?.data || [];
    } catch (error: any) {
      const is404 =
        error?.status === 404 ||
        (typeof error?.message === 'string' && error.message.includes('404'));
      if (is404) {
        console.log('[API] No gastos fijos found for business:', idNegocio);
        return [];
      }
      console.error('[API] ❌ Error getting gastos fijos:', error);
      throw this.handleHttpError(error);
    }
  }
}

