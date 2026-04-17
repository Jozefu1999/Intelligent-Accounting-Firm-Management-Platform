import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { User } from '../../core/models';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent {
  currentUser: User | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  get fullName(): string {
    const firstName = this.currentUser?.prenom || this.currentUser?.first_name || '';
    const lastName = this.currentUser?.nom || this.currentUser?.last_name || '';
    return `${firstName} ${lastName}`.trim();
  }

  get initials(): string {
    const firstNameInitial = (this.currentUser?.prenom || this.currentUser?.first_name || '').charAt(0);
    const lastNameInitial = (this.currentUser?.nom || this.currentUser?.last_name || '').charAt(0);
    const combined = `${firstNameInitial}${lastNameInitial}`.trim();
    return combined ? combined.toUpperCase() : 'AD';
  }

  get pageTitle(): string {
    const currentUrl = this.router.url;

    if (currentUrl.includes('/admin/users')) {
      return 'Gestion des utilisateurs';
    }

    if (currentUrl.includes('/admin/statistics')) {
      return 'Statistiques globales';
    }

    if (currentUrl.includes('/admin/ml')) {
      return 'Modele ML';
    }

    return 'Tableau de bord';
  }

  logout(): void {
    this.authService.logout();
    localStorage.clear();
    void this.router.navigate(['/login']);
  }
}
