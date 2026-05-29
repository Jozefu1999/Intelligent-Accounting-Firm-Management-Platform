import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-expert-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './expert-layout.component.html',
  styleUrl: './expert-layout.component.css',
})
export class ExpertLayoutComponent {
  isSidebarOpen = false;
  readonly todayLabel = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date());

  constructor(private router: Router, private authService: AuthService) {}

  get userDisplayName(): string {
    const user = this.authService.getCurrentUser();
    if (!user) {
      return 'Expert';
    }

    const firstName = user.prenom || user.first_name || '';
    const lastName = user.nom || user.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();

    return fullName || 'Expert';
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
