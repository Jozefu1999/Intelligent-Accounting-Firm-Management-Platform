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
      { label: 'Tableau de bord', subtitle: 'Vue operationnelle', icon: 'space_dashboard', path: '/assistant-dashboard', exact: true },
      { label: 'Mes Projets', subtitle: 'Missions assignees', icon: 'work', path: '/assistant-dashboard', fragment: 'projects' },
      { label: 'Documents', subtitle: 'Upload et suivi', icon: 'description', path: '/assistant-dashboard', fragment: 'documents' },
    ],
    administrateur: [
      { label: 'Tableau de bord', subtitle: 'Pilotage global', icon: 'insights', path: '/admin-dashboard', exact: true },
      { label: 'Utilisateurs', subtitle: 'Gestion des comptes', icon: 'manage_accounts', path: '/admin-dashboard', fragment: 'users' },
      { label: 'Statistiques', subtitle: 'Activite systeme', icon: 'bar_chart', path: '/admin-dashboard', fragment: 'stats' },
      { label: 'Modele ML', subtitle: 'Retrain et suivi', icon: 'model_training', path: '/admin-dashboard', fragment: 'ml-model' },
    ],
    visiteur: [
      { label: 'Accueil', subtitle: 'Mon espace', icon: 'home', path: '/client-dashboard', exact: true },
      { label: 'Mon Profil', subtitle: 'Informations personnelles', icon: 'person', path: '/client-dashboard', fragment: 'profil' },
      { label: 'Contacter le cabinet', subtitle: 'Messagerie', icon: 'mail', path: '/client-dashboard', fragment: 'contact' },
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

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
