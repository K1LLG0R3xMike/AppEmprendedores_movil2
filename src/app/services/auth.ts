import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from './api-service';

interface AuthState {
  isAuthenticated: boolean;
  uid: string | null;
  token: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly _authState = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    uid: null,
    token: null
  });

  // Observables públicos para que los componentes se suscriban
  public readonly authState$ = this._authState.asObservable();
  public readonly isAuthenticated$ = new BehaviorSubject<boolean>(false);

  constructor(private apiService: ApiService) {}

  // Getters para acceso directo al estado actual
  get isAuthenticated(): boolean {
    return this._authState.value.isAuthenticated;
  }

  get uid(): string | null {
    return this._authState.value.uid;
  }

  get token(): string | null {
    return this._authState.value.token;
  }

  get authState(): AuthState {
    return this._authState.value;
  }

  /// Inicializar estado al arrancar la app
  async initAuth(): Promise<void> {
    try {
      const storedToken = await this.apiService.getToken();
      const storedUid = await this.apiService.getUid();
      
      if (storedToken && storedUid) {
        this.updateAuthState({
          isAuthenticated: true,
          token: storedToken,
          uid: storedUid
        });
      } else {
        this.updateAuthState({
          isAuthenticated: false,
          token: null,
          uid: null
        });
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      this.updateAuthState({
        isAuthenticated: false,
        token: null,
        uid: null
      });
    }
  }

  /// Registrar usuario
  async register(email: string, password: string): Promise<void> {
    try {
      const data = await this.apiService.register(email, password);
      this.updateAuthState({
        isAuthenticated: true,
        token: data.idToken,
        uid: data.localId
      });
    } catch (error) {
      this.updateAuthState({
        isAuthenticated: false,
        token: null,
        uid: null
      });
      throw error; // Re-lanzar el error para que el componente lo maneje
    }
  }

  /// Login usuario
  async login(email: string, password: string): Promise<void> {
    try {
      const data = await this.apiService.login(email, password);
      this.updateAuthState({
        isAuthenticated: true,
        token: data.idToken,
        uid: data.localId
      });
    } catch (error) {
      this.updateAuthState({
        isAuthenticated: false,
        token: null,
        uid: null
      });
      throw error; // Re-lanzar el error para que el componente lo maneje
    }
  }

  /// Logout
  async logout(): Promise<void> {
    try {
      await this.apiService.logout();
      this.updateAuthState({
        isAuthenticated: false,
        token: null,
        uid: null
      });
    } catch (error) {
      console.error('Error during logout:', error);
      // Aún así, limpiar el estado local
      this.updateAuthState({
        isAuthenticated: false,
        token: null,
        uid: null
      });
      throw error;
    }
  }

  /// Verificar si el token sigue siendo válido
  async checkAuthStatus(): Promise<boolean> {
    try {
      const token = await this.apiService.getToken();
      const uid = await this.apiService.getUid();
      
      if (token && uid) {
        // Optionally, you could make a request to verify the token is still valid
        // For now, we'll assume it's valid if it exists
        this.updateAuthState({
          isAuthenticated: true,
          token,
          uid
        });
        return true;
      } else {
        this.updateAuthState({
          isAuthenticated: false,
          token: null,
          uid: null
        });
        return false;
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      this.updateAuthState({
        isAuthenticated: false,
        token: null,
        uid: null
      });
      return false;
    }
  }

  /// Obtener datos del usuario actual
  async getCurrentUser(): Promise<any> {
    if (!this.uid) {
      throw new Error('Usuario no autenticado');
    }
    
    try {
      return await this.apiService.getUserByUid(this.uid);
    } catch (error) {
      console.error('Error getting current user:', error);
      throw error;
    }
  }

  /// Obtener email del usuario actual desde Firebase Auth
  async getCurrentUserEmail(): Promise<string | null> {
    if (!this.uid) {
      throw new Error('Usuario no autenticado');
    }
    
    try {
      return await this.apiService.getUserEmail(this.uid);
    } catch (error) {
      console.error('Error getting current user email:', error);
      return null;
    }
  }

  /// Método privado para actualizar el estado y notificar a los suscriptores
  private updateAuthState(newState: AuthState): void {
    this._authState.next(newState);
    this.isAuthenticated$.next(newState.isAuthenticated);
  }

  /// Método para limpiar el estado (útil en casos de error crítico)
  clearAuthState(): void {
    this.updateAuthState({
      isAuthenticated: false,
      token: null,
      uid: null
    });
  }
}
