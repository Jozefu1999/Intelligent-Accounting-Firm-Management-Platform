import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import {
  AdminProjectRiskBucket,
  AdminProjectStatusBucket,
  AdminService,
  AdminStatsResponse,
  AdminUser,
} from '../../../core/services/admin';
import { AuthService } from '../../../core/services/auth';
import { User } from '../../../core/models';

interface DashboardKpi {
  label: string;
  value: number;
  subtitle: string;
  icon: string;
  accentClass: string;
}

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
})
export class AdminDashboardComponent implements OnInit {
  currentUser: User | null = null;

  isLoading = false;
  errorMessage = '';

  stats: AdminStatsResponse = {
    users_count: 0,
    clients_count: 0,
    projects_count: 0,
    high_risk_count: 0,
    recent_users: [],
    projects_by_status: [],
    projects_by_risk: [],
    users_by_role: [],
    high_risk_projects: [],
  };

  constructor(
    private authService: AuthService,
    private adminService: AdminService,
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadDashboard();
  }

  get fullName(): string {
    const firstName = this.currentUser?.prenom || this.currentUser?.first_name || '';
    const lastName = this.currentUser?.nom || this.currentUser?.last_name || '';
    return `${firstName} ${lastName}`.trim();
  }

  get todayLabel(): string {
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(new Date());
  }

  get kpis(): DashboardKpi[] {
    return [
      {
        label: 'Total users',
        value: this.stats.users_count,
        subtitle: 'registered accounts',
        icon: 'groups',
        accentClass: 'kpi-blue',
      },
      {
        label: 'Total clients',
        value: this.stats.clients_count,
        subtitle: 'client files',
        icon: 'business_center',
        accentClass: 'kpi-teal',
      },
      {
        label: 'Total projects',
        value: this.stats.projects_count,
        subtitle: 'active and completed missions',
        icon: 'folder_open',
        accentClass: 'kpi-purple',
      },
      {
        label: 'High-risk projects',
        value: this.stats.high_risk_count,
        subtitle: 'require attention',
        icon: 'warning',
        accentClass: 'kpi-red',
      },
    ];
  }

  get recentUsers(): AdminUser[] {
    return this.stats.recent_users ?? [];
  }

  get statusBlocks(): Array<{ label: string; count: number; pct: number; barClass: string }> {
    const total = Math.max(this.stats.projects_count, 1);

    return [
      {
        label: 'Projects in progress',
        count: this.getStatusCount('en_cours'),
        pct: this.getPercent(this.getStatusCount('en_cours'), total),
        barClass: 'progress-blue',
      },
      {
        label: 'Completed projects',
        count: this.getStatusCount('termine'),
        pct: this.getPercent(this.getStatusCount('termine'), total),
        barClass: 'progress-green',
      },
      {
        label: 'Suspended projects',
        count: this.getStatusCount('suspendu'),
        pct: this.getPercent(this.getStatusCount('suspendu'), total),
        barClass: 'progress-orange',
      },
    ];
  }

  get riskBlocks(): Array<{ label: string; count: number; pct: number; barClass: string }> {
    const total = Math.max(this.stats.projects_count, 1);

    return [
      {
        label: 'Low risk',
        count: this.getRiskCount('faible'),
        pct: this.getPercent(this.getRiskCount('faible'), total),
        barClass: 'progress-green',
      },
      {
        label: 'Medium risk',
        count: this.getRiskCount('moyen'),
        pct: this.getPercent(this.getRiskCount('moyen'), total),
        barClass: 'progress-orange',
      },
      {
        label: 'High risk',
        count: this.getRiskCount('eleve'),
        pct: this.getPercent(this.getRiskCount('eleve'), total),
        barClass: 'progress-red',
      },
    ];
  }

  loadDashboard(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.adminService.getStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load administrator statistics.';
        this.isLoading = false;
      },
    });
  }

  getUserInitials(user: AdminUser): string {
    const firstName = user.prenom || user.first_name || '';
    const lastName = user.nom || user.last_name || '';
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.trim();
    return initials ? initials.toUpperCase() : 'US';
  }

  getDisplayName(user: AdminUser): string {
    const firstName = user.prenom || user.first_name || '';
    const lastName = user.nom || user.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || user.email;
  }

  getRoleClass(role: string): string {
    switch (role) {
      case 'expert_comptable':
        return 'role-badge role-expert';
      case 'assistant':
        return 'role-badge role-assistant';
      case 'administrateur':
        return 'role-badge role-admin';
      default:
        return 'role-badge role-visitor';
    }
  }

  getRoleLabel(role: string): string {
    switch (role) {
      case 'expert_comptable':
        return 'Accounting expert';
      case 'assistant':
        return 'Assistant';
      case 'administrateur':
        return 'Administrator';
      default:
        return 'Visitor';
    }
  }

  formatDate(value?: string): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
  }

  private getStatusCount(status: string): number {
    return this.findStatusBucket(status)?.count ?? 0;
  }

  private getRiskCount(level: string): number {
    return this.findRiskBucket(level)?.count ?? 0;
  }

  private findStatusBucket(status: string): AdminProjectStatusBucket | undefined {
    return this.stats.projects_by_status.find((bucket) => bucket.statut === status);
  }

  private findRiskBucket(level: string): AdminProjectRiskBucket | undefined {
    return this.stats.projects_by_risk.find((bucket) => bucket.niveau_risque === level);
  }

  private getPercent(value: number, total: number): number {
    if (!total) {
      return 0;
    }

    return Math.round((value / total) * 100);
  }
}

