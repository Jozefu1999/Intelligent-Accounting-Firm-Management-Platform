import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './client-layout.component.html',
  styleUrl: './client-layout.component.css',
})
export class ClientLayoutComponent {
  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  get displayName(): string {
    const user = this.authService.getCurrentUser();
    const firstName = user?.prenom || user?.first_name || '';
    const lastName = user?.nom || user?.last_name || '';

    return `${firstName} ${lastName}`.trim() || 'Client';
  }

  get initials(): string {
    const user = this.authService.getCurrentUser();
    const firstName = user?.prenom || user?.first_name || '';
    const lastName = user?.nom || user?.last_name || '';

    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'CL';
  }

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
