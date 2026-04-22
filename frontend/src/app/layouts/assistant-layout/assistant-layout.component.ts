import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-assistant-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './assistant-layout.component.html',
  styleUrl: './assistant-layout.component.css',
})
export class AssistantLayoutComponent {
  isSidebarOpen = false;
  readonly todayLabel = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date());

  constructor(private router: Router) {}

  get userDisplayName(): string {
    const rawUser = localStorage.getItem('user');
    if (!rawUser) {
      return 'Assistant';
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

      return fullName || 'Assistant';
    } catch {
      return 'Assistant';
    }
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.closeSidebar();
    void this.router.navigate(['/login']);
  }
}
