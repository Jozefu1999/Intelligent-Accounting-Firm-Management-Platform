import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AdminService, AdminUser, AdminUserDetails } from '../../../core/services/admin';
import { UserRole } from '../../../core/models';

interface RoleOption {
  value: '' | UserRole;
  label: string;
}

@Component({
  selector: 'app-admin-users-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.css',
})
export class AdminUsersComponent implements OnInit {
  users: AdminUser[] = [];
  filteredUsers: AdminUser[] = [];

  isLoading = false;
  errorMessage = '';
  successMessage = '';

  searchTerm = '';
  selectedRole: '' | UserRole = '';

  page = 1;
  readonly pageSize = 10;
  readonly deletingUserIds = new Set<number>();

  editingUserId: number | null = null;
  pendingRoleByUserId: Record<number, UserRole> = {};

  detailsModalUser: AdminUserDetails | null = null;
  detailsModalOpen = false;
  detailsLoading = false;

  deleteModalUser: AdminUser | null = null;
  deleteModalOpen = false;

  readonly roles: UserRole[] = ['visiteur', 'expert_comptable', 'assistant', 'administrateur'];
  readonly roleOptions: RoleOption[] = [
    { value: '', label: 'Tous' },
    { value: 'expert_comptable', label: 'expert_comptable' },
    { value: 'assistant', label: 'assistant' },
    { value: 'administrateur', label: 'administrateur' },
    { value: 'visiteur', label: 'visiteur' },
  ];

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredUsers.length / this.pageSize));
  }

  get pagedUsers(): AdminUser[] {
    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredUsers.slice(start, end);
  }

  get totalUsersCount(): number {
    return this.users.length;
  }

  get expertsCount(): number {
    return this.countByRole('expert_comptable');
  }

  get assistantsCount(): number {
    return this.countByRole('assistant');
  }

  get adminsCount(): number {
    return this.countByRole('administrateur');
  }

  get visitorsCount(): number {
    return this.countByRole('visiteur');
  }

  loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.adminService.getUsers().subscribe({
      next: (users) => {
        this.users = users ?? [];
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les utilisateurs.';
        this.users = [];
        this.filteredUsers = [];
        this.isLoading = false;
      },
    });
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onRoleFilterChange(): void {
    this.applyFilters();
  }

  openRoleEditor(user: AdminUser): void {
    this.editingUserId = user.id;
    this.pendingRoleByUserId[user.id] = user.role;
  }

  cancelRoleEditor(): void {
    this.editingUserId = null;
  }

  confirmRoleChange(user: AdminUser): void {
    const selectedRole = this.pendingRoleByUserId[user.id];
    if (!selectedRole || selectedRole === user.role) {
      this.editingUserId = null;
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.adminService.updateUserRole(user.id, selectedRole).subscribe({
      next: (updatedUser) => {
        const index = this.users.findIndex((item) => item.id === user.id);
        if (index >= 0) {
          this.users[index] = {
            ...this.users[index],
            role: updatedUser.role,
          };
        }

        this.applyFilters();
        this.editingUserId = null;
        this.successMessage = 'Role mis a jour avec succes.';
        this.loadUsers();
      },
      error: () => {
        this.errorMessage = 'Echec de la mise a jour du role.';
      },
    });
  }

  openDetailsModal(user: AdminUser): void {
    this.detailsModalOpen = true;
    this.detailsLoading = true;
    this.detailsModalUser = null;

    this.adminService.getUserDetails(user.id).subscribe({
      next: (details) => {
        this.detailsModalUser = details;
        this.detailsLoading = false;
      },
      error: () => {
        this.detailsLoading = false;
        this.detailsModalUser = {
          ...user,
          projects_linked_count: 0,
        };
      },
    });
  }

  closeDetailsModal(): void {
    this.detailsModalOpen = false;
    this.detailsModalUser = null;
    this.detailsLoading = false;
  }

  openDeleteModal(user: AdminUser): void {
    this.deleteModalUser = user;
    this.deleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.deleteModalOpen = false;
    this.deleteModalUser = null;
  }

  confirmDelete(): void {
    if (!this.deleteModalUser) {
      return;
    }

    const userToDelete = this.deleteModalUser;
    this.errorMessage = '';
    this.successMessage = '';

    this.adminService.deleteUser(userToDelete.id).subscribe({
      next: () => {
        this.deletingUserIds.add(userToDelete.id);
        this.closeDeleteModal();
        this.successMessage = 'Utilisateur supprime avec succes.';

        setTimeout(() => {
          this.users = this.users.filter((user) => user.id !== userToDelete.id);
          this.deletingUserIds.delete(userToDelete.id);
          this.applyFilters();
          this.loadUsers();
        }, 220);
      },
      error: () => {
        this.errorMessage = 'Echec de suppression utilisateur.';
      },
    });
  }

  previousPage(): void {
    if (this.page > 1) {
      this.page -= 1;
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page += 1;
    }
  }

  getDisplayName(user: AdminUser): string {
    const firstName = user.prenom || user.first_name || '';
    const lastName = user.nom || user.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || user.email;
  }

  getInitials(user: AdminUser): string {
    const firstName = user.prenom || user.first_name || '';
    const lastName = user.nom || user.last_name || '';
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.trim();
    return initials ? initials.toUpperCase() : 'US';
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'expert_comptable':
        return 'badge role-expert';
      case 'assistant':
        return 'badge role-assistant';
      case 'administrateur':
        return 'badge role-admin';
      default:
        return 'badge role-visitor';
    }
  }

  getRoleLabel(role: string): string {
    switch (role) {
      case 'expert_comptable':
        return 'Expert comptable';
      case 'assistant':
        return 'Assistant';
      case 'administrateur':
        return 'Administrateur';
      default:
        return 'Visiteur';
    }
  }

  formatDate(dateValue?: string): string {
    if (!dateValue) {
      return '-';
    }

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date);
  }

  private applyFilters(): void {
    const query = this.searchTerm.trim().toLowerCase();

    this.filteredUsers = this.users.filter((user) => {
      const fullName = this.getDisplayName(user).toLowerCase();
      const email = user.email.toLowerCase();
      const matchesSearch = !query || fullName.includes(query) || email.includes(query);
      const matchesRole = !this.selectedRole || user.role === this.selectedRole;

      return matchesSearch && matchesRole;
    });

    if (this.page > this.totalPages) {
      this.page = this.totalPages;
    }

    if (this.page < 1) {
      this.page = 1;
    }
  }

  private countByRole(role: UserRole): number {
    return this.users.filter((user) => user.role === role).length;
  }
}
