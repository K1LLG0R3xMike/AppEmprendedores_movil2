# AuthService - Guía de Uso

## 🚀 Descripción
El `AuthService` es el equivalente Angular del `AuthProvider` de Flutter. Maneja el estado de autenticación de la aplicación usando RxJS Observables para notificar cambios a los componentes.

## 📋 Características

- ✅ **Gestión de Estado**: Maneja `isAuthenticated`, `uid`, y `token`
- ✅ **Observables**: Notifica cambios de estado en tiempo real
- ✅ **Inicialización**: Restaura el estado desde almacenamiento al iniciar
- ✅ **Integración**: Usa `ApiService` para las operaciones de red
- ✅ **Persistencia**: Almacenamiento seguro con Capacitor Preferences

## 🔧 Configuración Inicial

### 1. Inicialización en App Component
```typescript
// app.component.ts
import { Component, OnInit } from '@angular/core';
import { AuthService } from './services/auth';

@Component({...})
export class AppComponent implements OnInit {
  constructor(private authService: AuthService) {}

  async ngOnInit() {
    // ⚠️ IMPORTANTE: Inicializar al arrancar la app
    await this.authService.initAuth();
  }
}
```

## 📱 Uso en Componentes

### 1. Login/Register
```typescript
// login.page.ts
import { AuthService } from '../../services/auth';

export class LoginPage {
  constructor(private authService: AuthService) {}

  async login() {
    try {
      await this.authService.login(email, password);
      // ✅ El estado se actualiza automáticamente
      this.router.navigate(['/tabs/dashboard']);
    } catch (error) {
      console.error('Error:', error.message);
    }
  }
}
```

### 2. Verificar Estado de Autenticación
```typescript
// cualquier-component.ts
export class MiComponent {
  constructor(private authService: AuthService) {}

  // Acceso directo al estado actual
  get isLoggedIn(): boolean {
    return this.authService.isAuthenticated;
  }

  get currentUser(): string | null {
    return this.authService.uid;
  }
}
```

### 3. Suscribirse a Cambios de Estado
```typescript
// dashboard.page.ts
import { Subscription } from 'rxjs';

export class DashboardPage implements OnInit, OnDestroy {
  private authSubscription?: Subscription;

  ngOnInit() {
    // 🔄 Reaccionar a cambios de autenticación
    this.authSubscription = this.authService.isAuthenticated$.subscribe(
      isAuth => {
        if (!isAuth) {
          this.router.navigate(['/login']);
        }
      }
    );
  }

  ngOnDestroy() {
    this.authSubscription?.unsubscribe();
  }
}
```

### 4. Logout
```typescript
// settings.page.ts
async logout() {
  try {
    await this.authService.logout();
    // ✅ El estado se limpia automáticamente
    this.router.navigate(['/login']);
  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

## 🛡️ Protección de Rutas

### 1. Usar el Auth Guard
```typescript
// app.routes.ts
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page')
  },
  {
    path: 'tabs',
    loadChildren: () => import('./tabs/tabs.routes'),
    canActivate: [authGuard] // 🔒 Protegida
  }
];
```

## 📊 Estado del AuthService

### Interface AuthState
```typescript
interface AuthState {
  isAuthenticated: boolean;
  uid: string | null;
  token: string | null;
}
```

### Observables Disponibles
- `authService.authState$` - Estado completo
- `authService.isAuthenticated$` - Solo estado de autenticación

### Getters Síncronos
- `authService.isAuthenticated` - boolean
- `authService.uid` - string | null  
- `authService.token` - string | null
- `authService.authState` - AuthState completo

## 🔄 Métodos Principales

### Autenticación
```typescript
// Registro
await authService.register(email, password);

// Login
await authService.login(email, password);

// Logout
await authService.logout();

// Verificar estado
const isValid = await authService.checkAuthStatus();

// Obtener usuario actual
const user = await authService.getCurrentUser();
```

### Gestión de Estado
```typescript
// Inicializar (solo una vez al arrancar)
await authService.initAuth();

// Limpiar estado (en casos de error)
authService.clearAuthState();
```

## ⚠️ Consideraciones Importantes

### 1. Inicialización
- **SIEMPRE** llamar `initAuth()` en `AppComponent.ngOnInit()`
- Solo necesario una vez al arrancar la aplicación

### 2. Manejo de Errores
- Todos los métodos async pueden lanzar errores
- Usar try/catch para manejar errores apropiadamente

### 3. Suscripciones
- Recuerda hacer `unsubscribe()` en `ngOnDestroy()`
- Usa operators como `takeUntil()` para manejo automático

### 4. Estado Reactivo
- El estado se actualiza automáticamente tras login/logout
- Los componentes suscritos se notifican inmediatamente

## 🧪 Testing

```typescript
// auth.spec.ts
describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule]
    });
    service = TestBed.inject(AuthService);
  });

  it('should start unauthenticated', () => {
    expect(service.isAuthenticated).toBeFalse();
  });
});
```

## 🔗 Integración con API

El `AuthService` usa internamente el `ApiService` para:
- Registro y login con Firebase
- Almacenamiento de tokens
- Verificación de estado
- Obtención de datos de usuario

## 📝 Ejemplos Completos

Revisa los archivos:
- `src/app/pages/login/login.page.ts` - Ejemplo de login
- `src/app/pages/register/register.page.ts` - Ejemplo de registro  
- `src/app/pages/settings/settings.page.ts` - Ejemplo de logout
- `src/app/app.component.ts` - Ejemplo de inicialización
- `src/app/guards/auth-guard.ts` - Ejemplo de protección de rutas