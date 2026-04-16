import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { UserRole } from '../core/models';
import { getHomeForRole } from '../core/utils/role-home';
import { AuthService } from '../core/services/auth';

const createRoleGuard = (expectedRole: UserRole): CanActivateFn => {
  return () => {
    const router = inject(Router);
    const authService = inject(AuthService);

    if (!authService.getToken()) {
      void router.navigate(['/login']);
      return false;
    }

    const currentRole = authService.getCurrentRole();
    if (currentRole !== expectedRole) {
      void router.navigate([getHomeForRole(currentRole)]);
      return false;
    }

    return true;
  };
};

export const ExpertGuard = createRoleGuard('expert_comptable');
export const AssistantGuard = createRoleGuard('assistant');
export const AdminGuard = createRoleGuard('administrateur');
export const ClientGuard = createRoleGuard('visiteur');
