import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { UserRole } from '../core/models';
import { getHomeForRole, normalizeRole } from '../core/utils/role-home';
import { AuthService } from '../core/services/auth';

const createRoleGuard = (expectedRole: UserRole): CanActivateFn => {
  return () => {
    const router = inject(Router);
    const authService = inject(AuthService);

    if (!authService.getToken()) {
      void router.navigate(['/login']);
      return false;
    }

    const authUser = authService.getCurrentUser();
    const currentRole = authUser?.role;

    if (currentRole) {
      const normalizedRole = normalizeRole(currentRole);
      if (normalizedRole !== expectedRole) {
        void router.navigate([getHomeForRole(normalizedRole)]);
        return false;
      }

      return true;
    }

    const rawUser = localStorage.getItem('user');

    if (!rawUser) {
      void router.navigate(['/login']);
      return false;
    }

    try {
      const user = JSON.parse(rawUser) as { role?: string };
      const userRole = normalizeRole(user.role);

      if (userRole !== expectedRole) {
        void router.navigate([getHomeForRole(userRole)]);
        return false;
      }

      return true;
    } catch {
      void router.navigate(['/login']);
      return false;
    }
  };
};

export const ExpertGuard = createRoleGuard('expert_comptable');
export const AssistantGuard = createRoleGuard('assistant');
export const AdminGuard = createRoleGuard('administrateur');
export const ClientGuard = createRoleGuard('visiteur');
