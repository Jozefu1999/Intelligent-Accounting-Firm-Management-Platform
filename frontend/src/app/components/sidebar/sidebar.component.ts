import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth';
import { UserRole } from '../../core/models';
import { getRoleLabel, normalizeRole } from '../../core/utils/role-home';

interface SidebarItem {
  label: string;
  subtitle: string;
  icon: string;
  path: string;
  fragment?: string;
  exact?: boolean;
}

@Component({
  selector: 'app-role-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  @Input() role = 'visiteur';

  private readonly aiToolPaths = new Set([
    '/ai-tools/business-plan',
    '/ai-tools/recommendations',
    '/ai-tools/risk-prediction',
  ]);

  private readonly navByRole: Record<UserRole, SidebarItem[]> = {
    expert_comptable: [
      { label: 'Dashboard', subtitle: "Vue d'ensemble", icon: 'dashboard', path: '/dashboard', exact: true },
      { label: 'Clients', subtitle: 'Portefeuille', icon: 'people', path: '/clients' },
      { label: 'Projets', subtitle: 'Missions en cours', icon: 'folder', path: '/projects' },
      { label: 'Business Plan', subtitle: 'Generation IA', icon: 'auto_awesome', path: '/ai-tools/business-plan' },
      { label: 'Recommandations', subtitle: 'Conseils cibles', icon: 'lightbulb', path: '/ai-tools/recommendations' },
      { label: 'Risk Prediction', subtitle: 'Anticipation', icon: 'warning', path: '/ai-tools/risk-prediction' },
    ],
    assistant: [
      { label: 'Tableau de bord', subtitle: 'Vue operationnelle', icon: 'space_dashboard', path: '/assistant/dashboard', exact: true },
      { label: 'Mes Projets assignes', subtitle: 'Missions assignees', icon: 'work', path: '/assistant/projets', exact: true },
      { label: 'Documents', subtitle: 'Upload et suivi', icon: 'description', path: '/assistant/documents', exact: true },
    ],
    administrateur: [
      { label: 'Tableau de bord', subtitle: 'Pilotage global', icon: 'insights', path: '/admin/dashboard', exact: true },
      { label: 'Utilisateurs', subtitle: 'Gestion des comptes', icon: 'manage_accounts', path: '/admin/users', exact: true },
      { label: 'Statistiques', subtitle: 'Activite systeme', icon: 'bar_chart', path: '/admin/statistics', exact: true },
      { label: 'Modele ML', subtitle: 'Retrain et suivi', icon: 'model_training', path: '/admin/ml', exact: true },
    ],
    visiteur: [
      { label: 'Tableau de bord', subtitle: 'Mon espace client', icon: 'dashboard', path: '/client/dashboard', exact: true },
      { label: 'Mes Projets', subtitle: 'Suivi des dossiers', icon: 'work', path: '/client/projects', exact: true },
      { label: 'Mon Profil', subtitle: 'Informations personnelles', icon: 'person', path: '/client/profile', exact: true },
      { label: 'Contacter', subtitle: 'Messages au cabinet', icon: 'mail', path: '/client/contact', exact: true },
    ],
  };

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  get normalizedRole(): UserRole {
    return normalizeRole(this.role);
  }

  get roleLabel(): string {
    return getRoleLabel(this.role);
  }

  get navItems(): SidebarItem[] {
    return this.navByRole[this.normalizedRole];
  }

  get primaryNavItems(): SidebarItem[] {
    if (this.normalizedRole !== 'expert_comptable') {
      return this.navItems;
    }

    return this.navItems.filter((item) => !this.aiToolPaths.has(item.path));
  }

  get aiNavItems(): SidebarItem[] {
    if (this.normalizedRole !== 'expert_comptable') {
      return [];
    }

    return this.navItems.filter((item) => this.aiToolPaths.has(item.path));
  }

  get workspaceLabel(): string {
    if (this.normalizedRole === 'expert_comptable') {
      return 'EXPERT CONSOLE';
    }

    if (this.normalizedRole === 'administrateur') {
      return 'ADMIN CONSOLE';
    }

    if (this.normalizedRole === 'assistant') {
      return 'ASSISTANT CONSOLE';
    }

    return 'CLIENT SPACE';
  }

  get fullName(): string {
    const user = this.authService.getCurrentUser();
    const firstName = user?.prenom || user?.first_name || '';
    const lastName = user?.nom || user?.last_name || '';
    return `${firstName} ${lastName}`.trim();
  }

  get initials(): string {
    const user = this.authService.getCurrentUser();
    const firstNameInitial = (user?.prenom || user?.first_name || '').charAt(0);
    const lastNameInitial = (user?.nom || user?.last_name || '').charAt(0);
    const combined = `${firstNameInitial}${lastNameInitial}`.trim();

    if (combined.length > 0) {
      return combined.toUpperCase();
    }

    if (this.normalizedRole === 'expert_comptable') {
      return 'EX';
    }

    if (this.normalizedRole === 'administrateur') {
      return 'AD';
    }

    if (this.normalizedRole === 'assistant') {
      return 'AS';
    }

    return 'CL';
  }

  trackByPath(_index: number, item: SidebarItem): string {
    return `${item.path}::${item.fragment ?? ''}`;
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
