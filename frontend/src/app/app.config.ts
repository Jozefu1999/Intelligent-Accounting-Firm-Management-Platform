import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth-interceptor';
import { AuthService } from './core/services/auth';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    provideAppInitializer(() => {
      const authService = inject(AuthService);
      return firstValueFrom(authService.initializeSession());
    }),
  ]
};
