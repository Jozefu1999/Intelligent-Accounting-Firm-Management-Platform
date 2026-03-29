import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map } from 'rxjs';
import { AuthService } from '../services/auth';

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.getToken()) {
    return true;
  }

  if (authService.getCurrentUser()) {
    return router.createUrlTree(['/dashboard']);
  }

  return authService.initializeSession().pipe(
    map((isAuthenticated) => (isAuthenticated ? router.createUrlTree(['/dashboard']) : true))
  );
};
