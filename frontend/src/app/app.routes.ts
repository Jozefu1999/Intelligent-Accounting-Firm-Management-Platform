import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { guestGuard } from './core/guards/guest-guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register').then(m => m.Register),
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard/dashboard').then(m => m.Dashboard),
    canActivate: [authGuard],
  },
  {
    path: 'clients',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/clients/client-list/client-list').then(m => m.ClientList),
      },
      {
        path: 'new',
        loadComponent: () => import('./features/clients/client-form/client-form').then(m => m.ClientForm),
      },
      {
        path: ':id',
        loadComponent: () => import('./features/clients/client-detail/client-detail').then(m => m.ClientDetail),
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./features/clients/client-form/client-form').then(m => m.ClientForm),
      },
    ],
  },
  {
    path: 'projects',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/projects/project-list/project-list').then(m => m.ProjectList),
      },
      {
        path: 'new',
        loadComponent: () => import('./features/projects/project-form/project-form').then(m => m.ProjectForm),
      },
      {
        path: ':id',
        loadComponent: () => import('./features/projects/project-detail/project-detail').then(m => m.ProjectDetail),
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./features/projects/project-form/project-form').then(m => m.ProjectForm),
      },
    ],
  },
  {
    path: 'ai-tools',
    canActivate: [authGuard],
    children: [
      {
        path: 'business-plan',
        loadComponent: () => import('./features/ai-tools/business-plan/business-plan').then(m => m.BusinessPlan),
      },
      {
        path: 'recommendations',
        loadComponent: () => import('./features/ai-tools/recommendations/recommendations').then(m => m.Recommendations),
      },
      {
        path: 'risk-prediction',
        loadComponent: () => import('./features/ai-tools/risk-prediction/risk-prediction').then(m => m.RiskPrediction),
      },
    ],
  },
  { path: '**', redirectTo: '/dashboard' },
];
