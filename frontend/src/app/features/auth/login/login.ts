import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  email = '';
  password = '';
  errorMessage = '';
  isLoading = false;
  showPassword = false;

  readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    const reason = this.route.snapshot.queryParamMap.get('reason');
    if (reason === 'session-expired') {
      this.errorMessage = 'Votre session a expiré. Veuillez vous reconnecter.';
    }
  }

  private getValidationMessage(form: NgForm): string {
    if (form.invalid) {
      return 'Veuillez remplir tous les champs.';
    }

    return '';
  }

  private resolveAuthErrorMessage(error: unknown): string {
    const status = (error as { status?: number })?.status;

    if (status === 401) {
      return 'Email ou mot de passe incorrect.';
    }

    if (status === 400) {
      return 'Veuillez remplir tous les champs.';
    }

    if (status === 404) {
      return 'Aucun compte trouvé avec cet email.';
    }

    if (status === 500) {
      return 'Erreur serveur. Veuillez réessayer plus tard.';
    }

    if (status === 0) {
      return 'Impossible de contacter le serveur. Vérifiez votre connexion.';
    }

    return 'Erreur serveur. Veuillez réessayer plus tard.';
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(form: NgForm): void {
    this.errorMessage = '';

    if (form.invalid) {
      this.errorMessage = this.getValidationMessage(form);
      return;
    }

    const sanitizedEmail = this.email.trim().toLowerCase();
    this.email = sanitizedEmail;

    this.isLoading = true;

    this.authService.login(sanitizedEmail, this.password).subscribe({
      next: () => {
        this.isLoading = false;
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const destination = returnUrl || this.authService.getHomeForCurrentUser();
        this.router.navigateByUrl(destination);
      },
      error: (err: unknown) => {
        this.errorMessage = this.resolveAuthErrorMessage(err);
        this.isLoading = false;
      },
    });
  }
}
