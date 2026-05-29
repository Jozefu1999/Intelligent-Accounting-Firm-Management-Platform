import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth';
import { User } from '../../core/models';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent {
  currentUser: User | null = null;
  isSidebarOpen = false;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      try {
        this.currentUser = JSON.parse(rawUser);
      } catch {
        this.currentUser = null;
      }
    }
  }

  get fullName(): string {
    const firstName = this.currentUser?.prenom || this.currentUser?.first_name || '';
    const lastName = this.currentUser?.nom || this.currentUser?.last_name || '';
    return `${firstName} ${lastName}`.trim();
  }

  get todayLabel(): string {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }

  get pageTitle(): string {
    const currentUrl = this.router.url;
    if (currentUrl.includes('/admin/users')) return 'User Management';
    if (currentUrl.includes('/admin/statistics')) return 'Statistics';
    if (currentUrl.includes('/admin/ml')) return 'ML Models';
    return this.fullName || 'Administrator';
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  logout(): void {
    this.authService.logout();
    this.closeSidebar();
    void this.router.navigate(['/login']);
  }
}

