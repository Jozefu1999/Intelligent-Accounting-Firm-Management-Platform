import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminUser } from '../../core/services/admin';
import { DashboardService } from '../../core/services/dashboard';
import { AuthService } from '../../core/services/auth';
import { User, UserRole } from '../../core/models';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css',
})
export class AdminDashboardComponent implements OnInit {
  currentUser: User | null = null;
  users: AdminUser[] = [];

  isLoadingUsers = false;
  isLoadingStats = false;

  errorMessage = '';
  successMessage = '';

  stats = {
    totalUsers: 0,
    totalClients: 0,
    totalProjects: 0,
    highRiskProjects: 0,
  };

  readonly roles: UserRole[] = ['visiteur', 'expert_comptable', 'assistant', 'administrateur'];

  constructor(
    private authService: AuthService,
    private adminService: AdminService,
    private dashboardService: DashboardService,
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadStats();
    this.loadUsers();
  }

  get fullName(): string {
    const firstName = this.currentUser?.prenom || this.currentUser?.first_name || '';
    const lastName = this.currentUser?.nom || this.currentUser?.last_name || '';
    return `${firstName} ${lastName}`.trim();
  }

  loadStats(): void {
    this.isLoadingStats = true;

    this.dashboardService.getStats().subscribe({
      next: (response) => {
        this.stats.totalClients = response.stats.totalClients;
        this.stats.totalProjects = response.stats.totalProjects;
        this.stats.highRiskProjects = response.stats.highRiskProjects;
        this.isLoadingStats = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les statistiques globales.';
        this.isLoadingStats = false;
      },
    });
  }

  loadUsers(): void {
    this.isLoadingUsers = true;

    this.adminService.getUsers().subscribe({
      next: (users) => {
        this.users = users ?? [];
        this.stats.totalUsers = this.users.length;
        this.isLoadingUsers = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les utilisateurs.';
        this.isLoadingUsers = false;
      },
    });
  }

  updateUserRole(user: AdminUser, role: string): void {
    if (!this.isRole(role)) {
      return;
    }

    this.errorMessage = '';

    this.adminService.updateUserRole(user.id, role).subscribe({
      next: () => {
        this.successMessage = 'Role utilisateur mis a jour.';
        this.loadUsers();
      },
      error: () => {
        this.errorMessage = 'Echec de la mise a jour du role.';
      },
    });
  }

  deleteUser(user: AdminUser): void {
    const firstName = user.prenom || user.first_name || '';
    const lastName = user.nom || user.last_name || '';

    if (!confirm(`Supprimer l utilisateur ${firstName} ${lastName} ?`)) {
      return;
    }

    this.errorMessage = '';

    this.adminService.deleteUser(user.id).subscribe({
      next: () => {
        this.successMessage = 'Utilisateur supprime.';
        this.loadUsers();
      },
      error: () => {
        this.errorMessage = 'Echec de la suppression utilisateur.';
      },
    });
  }

  retrainModel(): void {
    this.successMessage = 'Retrain du modele ML a declencher via pipeline backend (endpoint a brancher).';
  }

  getNom(user: AdminUser): string {
    return user.nom || user.last_name || '-';
  }

  getPrenom(user: AdminUser): string {
    return user.prenom || user.first_name || '-';
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) {
      return '-';
    }

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleDateString('fr-FR');
  }

  private isRole(role: string): role is UserRole {
    return this.roles.includes(role as UserRole);
  }
}
