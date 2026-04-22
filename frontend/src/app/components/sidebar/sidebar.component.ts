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
      { label: 'Dashboard', subtitle: "Overview", icon: 'dashboard', path: '/dashboard', exact: true },
      { label: 'Clients', subtitle: 'Portfolio', icon: 'people', path: '/clients' },
      { label: 'Projects', subtitle: 'Current missions', icon: 'folder', path: '/projects' },
      { label: 'Business Plan', subtitle: 'AI generation', icon: 'auto_awesome', path: '/ai-tools/business-plan' },
      { label: 'Recommendations', subtitle: 'Targeted advice', icon: 'lightbulb', path: '/ai-tools/recommendations' },
      { label: 'Risk Prediction', subtitle: 'Risk anticipation', icon: 'warning', path: '/ai-tools/risk-prediction' },
    ],
    assistant: [
      { label: 'Dashboard', subtitle: 'Operational view', icon: 'space_dashboard', path: '/assistant/dashboard', exact: true },
      { label: 'My assigned projects', subtitle: 'Assigned missions', icon: 'work', path: '/assistant/projets', exact: true },
      { label: 'Documents', subtitle: 'Upload and tracking', icon: 'description', path: '/assistant/documents', exact: true },
    ],
    administrateur: [
      { label: 'Dashboard', subtitle: 'Global oversight', icon: 'insights', path: '/admin/dashboard', exact: true },
      { label: 'Users', subtitle: 'Account management', icon: 'manage_accounts', path: '/admin/users', exact: true },
      { label: 'Statistics', subtitle: 'System activity', icon: 'bar_chart', path: '/admin/statistics', exact: true },
      { label: 'ML Model', subtitle: 'Retrain and monitoring', icon: 'model_training', path: '/admin/ml', exact: true },
    ],
    visiteur: [
      { label: 'Dashboard', subtitle: 'My client space', icon: 'dashboard', path: '/client/dashboard', exact: true },
      { label: 'My Projects', subtitle: 'Case tracking', icon: 'work', path: '/client/projects', exact: true },
      { label: 'My Profile', subtitle: 'Personal information', icon: 'person', path: '/client/profile', exact: true },
      { label: 'Contact', subtitle: 'Messages to the firm', icon: 'mail', path: '/client/contact', exact: true },
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

  trackByPath(_index: number, item: SidebarItem): string {
    return `${item.path}::${item.fragment ?? ''}`;
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}

