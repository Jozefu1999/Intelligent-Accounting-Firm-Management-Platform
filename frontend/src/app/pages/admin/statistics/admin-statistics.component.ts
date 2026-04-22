import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import {
  AdminActivityItem,
  AdminHighRiskProject,
  AdminService,
  AdminStatsResponse,
} from '../../../core/services/admin';

interface SummaryCard {
  label: string;
  value: number;
  subtitle: string;
  icon: string;
  accentClass: string;
}

interface DistributionRow {
  label: string;
  count: number;
  percent: number;
  colorClass: string;
}

type DateFilter = 'week' | 'month' | 'year';

@Component({
  selector: 'app-admin-statistics-page',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './admin-statistics.component.html',
  styleUrl: './admin-statistics.component.css',
})
export class AdminStatisticsComponent implements OnInit {
  isLoading = false;
  errorMessage = '';

  selectedRange: DateFilter = 'month';

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

  activities: AdminActivityItem[] = [];

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadData();
  }

  get summaryCards(): SummaryCard[] {
    return [
      {
        label: 'Total users',
        value: this.stats.users_count,
        subtitle: 'registered accounts',
        icon: 'groups',
        accentClass: 'card-blue',
      },
      {
        label: 'Total clients',
        value: this.stats.clients_count,
        subtitle: 'client files',
        icon: 'business_center',
        accentClass: 'card-teal',
      },
      {
        label: 'Total projects',
        value: this.stats.projects_count,
        subtitle: 'overall missions',
        icon: 'folder_open',
        accentClass: 'card-purple',
      },
      {
        label: 'High-risk projects',
        value: this.stats.high_risk_count,
        subtitle: 'require attention',
        icon: 'warning',
        accentClass: 'card-red',
      },
    ];
  }

  get projectsTotal(): number {
    return Math.max(this.stats.projects_count, 1);
  }

  get statusDistribution(): DistributionRow[] {
    const total = this.projectsTotal;

    const inProgress = this.findStatusCount('en_cours');
    const completed = this.findStatusCount('termine');
    const suspended = this.findStatusCount('suspendu');

    return [
      { label: 'In progress', count: inProgress, percent: this.percent(inProgress, total), colorClass: 'bar-blue' },
      { label: 'Completed', count: completed, percent: this.percent(completed, total), colorClass: 'bar-green' },
      { label: 'Suspended', count: suspended, percent: this.percent(suspended, total), colorClass: 'bar-orange' },
    ];
  }

  get riskDistribution(): DistributionRow[] {
    const total = this.projectsTotal;

    const low = this.findRiskCount('faible');
    const medium = this.findRiskCount('moyen');
    const high = this.findRiskCount('eleve');

    return [
      { label: 'Low', count: low, percent: this.percent(low, total), colorClass: 'bar-green' },
      { label: 'Medium', count: medium, percent: this.percent(medium, total), colorClass: 'bar-orange' },
      { label: 'High', count: high, percent: this.percent(high, total), colorClass: 'bar-red' },
    ];
  }

  get usersByRoleDistribution(): DistributionRow[] {
    const totalUsers = Math.max(this.stats.users_count, 1);

    const expert = this.findRoleCount('expert_comptable');
    const assistant = this.findRoleCount('assistant');
    const admin = this.findRoleCount('administrateur');
    const visitor = this.findRoleCount('visiteur');

    return [
      { label: 'Accounting expert', count: expert, percent: this.percent(expert, totalUsers), colorClass: 'bar-blue' },
      { label: 'Assistant', count: assistant, percent: this.percent(assistant, totalUsers), colorClass: 'bar-purple' },
      { label: 'Administrator', count: admin, percent: this.percent(admin, totalUsers), colorClass: 'bar-red' },
      { label: 'Visitor / Client', count: visitor, percent: this.percent(visitor, totalUsers), colorClass: 'bar-gray' },
    ];
  }

  get highRiskProjects(): AdminHighRiskProject[] {
    return this.stats.high_risk_projects ?? [];
  }

  get displayActivities(): AdminActivityItem[] {
    return this.activities.slice(0, 10);
  }

  selectRange(range: DateFilter): void {
    this.selectedRange = range;
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.adminService.getStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.loadActivity();
      },
      error: () => {
        this.errorMessage = 'Unable to load global statistics.';
        this.isLoading = false;
      },
    });
  }

  loadActivity(): void {
    this.adminService.getActivity().subscribe({
      next: (items) => {
        this.activities = items ?? [];
        this.isLoading = false;
      },
      error: () => {
        this.activities = [];
        this.isLoading = false;
      },
    });
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

  formatTimeAgo(value?: string): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    const now = new Date().getTime();
    const diffMs = now - date.getTime();

    const hour = 60 * 60 * 1000;
    const day = 24 * hour;

    if (diffMs < hour) {
      const minutes = Math.max(1, Math.floor(diffMs / (60 * 1000)));
      return `${minutes} min ago`;
    }

    if (diffMs < day) {
      const hours = Math.floor(diffMs / hour);
      return `${hours}h ago`;
    }

    const days = Math.floor(diffMs / day);
    if (days === 1) {
      return 'yesterday';
    }

    return `${days} days ago`;
  }

  private findStatusCount(status: string): number {
    return this.stats.projects_by_status.find((bucket) => bucket.statut === status)?.count ?? 0;
  }

  private findRiskCount(level: string): number {
    return this.stats.projects_by_risk.find((bucket) => bucket.niveau_risque === level)?.count ?? 0;
  }

  private findRoleCount(role: string): number {
    return this.stats.users_by_role.find((bucket) => bucket.role === role)?.count ?? 0;
  }

  private percent(value: number, total: number): number {
    if (!total) {
      return 0;
    }

    return Math.round((value / total) * 100);
  }
}

