import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  const requestToSend = token
    ? req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    })
    : req;

  return next(requestToSend).pipe(
    catchError((error: HttpErrorResponse) => {
      const isUnauthorized = error.status === 401;
      const isAuthRequest = req.url.includes('/auth/login') || req.url.includes('/auth/register');

      if (isUnauthorized && !isAuthRequest) {
        authService.logout();
        router.navigate(['/login'], {
          queryParams: { reason: 'session-expired' },
        });
      }

      return throwError(() => error);
    })
  );

};
