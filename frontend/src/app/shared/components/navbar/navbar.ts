import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth';
import { CommonModule } from '@angular/common';
import { getRoleLabel } from '../../../core/utils/role-home';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, MatToolbarModule, MatButtonModule, MatIconModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  constructor(public authService: AuthService, private router: Router) {}

  get currentUser$() {
    return this.authService.currentUser$;
  }

  getInitials(firstName: string | undefined, lastName: string | undefined): string {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'U';
  }

  getRoleLabel(role: string | undefined): string {
    return getRoleLabel(role);
  }

  getUserFirstName(user: any): string {
    return user?.first_name || user?.prenom || '';
  }

  getUserLastName(user: any): string {
    return user?.last_name || user?.nom || '';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
