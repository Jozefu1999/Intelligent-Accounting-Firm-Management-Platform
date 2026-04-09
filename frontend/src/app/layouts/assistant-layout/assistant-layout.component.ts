import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { User } from '../../core/models';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-assistant-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './assistant-layout.component.html',
  styleUrl: './assistant-layout.component.css',
})
export class AssistantLayoutComponent {
  currentUser: User | null = null;

  private readonly today = new Date();

  constructor(
    private router: Router,
    private authService: AuthService,
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  get fullName(): string {
    const firstName = this.currentUser?.prenom || this.currentUser?.first_name || '';
    const lastName = this.currentUser?.nom || this.currentUser?.last_name || '';
    return `${firstName} ${lastName}`.trim();
  }

  get todayLabel(): string {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(this.today);
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    void this.router.navigate(['/login']);
  }
}
