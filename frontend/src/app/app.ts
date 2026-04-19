import { Component } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Navbar } from './shared/components/navbar/navbar';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { AuthService } from './core/services/auth';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, SidebarComponent, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  constructor(
    public authService: AuthService,
    private router: Router,
  ) {}

  get currentRole(): string {
    return this.authService.getCurrentUser()?.role ?? 'visiteur';
  }

  get useStandaloneLayout(): boolean {
    const currentUrl = this.router.url ?? '';
    const currentPath = currentUrl.split('?')[0].split('#')[0];

    return ['/assistant', '/client', '/admin']
      .some((prefix) => currentPath === prefix || currentPath.startsWith(`${prefix}/`));
  }
}
