import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map } from 'rxjs';
import { AuthService } from '../services/auth';

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const getRoleHome = () => authService.getHomeForCurrentUser();

  if (!authService.getToken()) {
    return true;
  }

  if (authService.getCurrentUser()) {
    return router.createUrlTree([getRoleHome()]);
  }

  return authService.initializeSession().pipe(
    map((isAuthenticated) => (isAuthenticated ? router.createUrlTree([getRoleHome()]) : true))
  );
};
