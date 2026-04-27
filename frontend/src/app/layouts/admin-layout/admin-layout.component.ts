import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent {
  isSidebarOpen = false;
  readonly todayLabel = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date());

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  get userDisplayName(): string {
    const rawUser = localStorage.getItem('user');
    if (!rawUser) {
      return 'Administrator';
    }

    try {
      const user = JSON.parse(rawUser) as {
        first_name?: string;
        last_name?: string;
        prenom?: string;
        nom?: string;
      };

      const firstName = user.prenom || user.first_name || '';
      const lastName = user.nom || user.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim();

      return fullName || 'Administrator';
    } catch {
      return 'Administrator';
    }
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

