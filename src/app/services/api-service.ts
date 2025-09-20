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
          timeout(this.requestTimeout),
          catchError(this.handleError.bind(this))
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
          timeout(this.requestTimeout),
          catchError(this.handleError.bind(this))
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
          timeout(this.requestTimeout),
          catchError(this.handleError.bind(this))
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
          timeout(this.requestTimeout),
          catchError(this.handleError.bind(this))
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
          timeout(this.requestTimeout),
          catchError(this.handleError.bind(this))
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

  // Obtener datos de productos
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

  // Crear producto
  async createProduct(productData: any): Promise<any> {
    const token = await this.getToken();
    if (!token) throw new Error('Usuario no autenticado.');

    const url = `${this.baseUrl}/products`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.post<any>(url, productData, { headers })
        .pipe(timeout(this.requestTimeout))
        .toPromise();
      
      return response;
    } catch (error) {
      throw this.handleHttpError(error);
    }
  }

  // Actualizar producto
  async updateProduct(productId: string, productData: any): Promise<any> {
    const token = await this.getToken();
    if (!token) throw new Error('Usuario no autenticado.');

    const url = `${this.baseUrl}/products/${productId}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.put<any>(url, productData, { headers })
        .pipe(timeout(this.requestTimeout))
        .toPromise();
      
      return response;
    } catch (error) {
      throw this.handleHttpError(error);
    }
  }

  // Eliminar producto
  async deleteProduct(productId: string): Promise<any> {
    const token = await this.getToken();
    if (!token) throw new Error('Usuario no autenticado.');

    const url = `${this.baseUrl}/products/${productId}`;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    try {
      const response = await this.http.delete<any>(url, { headers })
        .pipe(timeout(this.requestTimeout))
        .toPromise();
      
      return response;
    } catch (error) {
      throw this.handleHttpError(error);
    }
  }
}
