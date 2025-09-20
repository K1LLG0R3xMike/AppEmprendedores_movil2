import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Verificar el estado de autenticación
  const isAuthenticated = await authService.checkAuthStatus();
  
  if (isAuthenticated) {
    return true;
  } else {
    // Redirigir al login si no está autenticado
    router.navigate(['/login']);
    return false;
  }
};
