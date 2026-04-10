import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth';
import { UserRole } from '../../../core/models';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, RouterModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  first_name = '';
  last_name = '';
  email = '';
  password = '';
  confirmPassword = '';
  role: UserRole | '' = '';
  errorMessage = '';
  loading = false;
  showPassword = false;
  showConfirmPassword = false;

  readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  readonly roles: ReadonlyArray<{ label: string; value: UserRole }> = [
    { label: 'Expert Comptable', value: 'expert_comptable' },
    { label: 'Assistant', value: 'assistant' },
    { label: 'Administrateur', value: 'administrateur' },
    { label: 'Client / Visiteur', value: 'visiteur' },
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  private getValidationMessage(form: NgForm): string {
    const firstNameControl = form.controls['first_name'];
    const lastNameControl = form.controls['last_name'];
    const emailControl = form.controls['email'];
    const passwordControl = form.controls['password'];
    const confirmPasswordControl = form.controls['confirm_password'];
    const roleControl = form.controls['role'];

    if (firstNameControl?.errors?.['required']) {
      return 'Veuillez saisir votre prenom.';
    }

    if (lastNameControl?.errors?.['required']) {
      return 'Veuillez saisir votre nom.';
    }

    if (emailControl?.errors?.['required']) {
      return 'Veuillez saisir votre adresse email.';
    }

    if (emailControl?.errors?.['email'] || emailControl?.errors?.['pattern']) {
      return 'Veuillez saisir une adresse email valide.';
    }

    if (passwordControl?.errors?.['required']) {
      return 'Veuillez saisir votre mot de passe.';
    }

    if (passwordControl?.errors?.['minlength']) {
      return 'Le mot de passe doit contenir au moins 6 caracteres.';
    }

    if (confirmPasswordControl?.errors?.['required']) {
      return 'Veuillez confirmer votre mot de passe.';
    }

    if (roleControl?.errors?.['required'] || !this.role) {
      return 'Veuillez selectionner un role.';
    }

    return 'Veuillez verifier les informations du formulaire.';
  }

  private resolveRegisterErrorMessage(error: unknown): string {
    const status = (error as { status?: number })?.status;
    const backendMessage = (error as { error?: { message?: string } })?.error?.message;

    if (status === 400 && backendMessage?.toLowerCase().includes('email already in use')) {
      return 'Cette adresse email est deja utilisee.';
    }

    if (status === 0) {
      return 'Impossible de contacter le serveur. Reessayez dans quelques instants.';
    }

    return backendMessage || 'Inscription impossible pour le moment.';
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit(form: NgForm): void {
    this.errorMessage = '';

    if (form.invalid) {
      this.errorMessage = this.getValidationMessage(form);
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'La confirmation du mot de passe ne correspond pas.';
      return;
    }

    const selectedRole = this.role;
    if (!selectedRole) {
      this.errorMessage = 'Veuillez selectionner un role.';
      return;
    }

    const sanitizedEmail = this.email.trim().toLowerCase();
    const firstName = this.first_name.trim();
    const lastName = this.last_name.trim();

    this.email = sanitizedEmail;
    this.first_name = firstName;
    this.last_name = lastName;

    this.loading = true;

    this.authService.register({
      email: sanitizedEmail,
      password: this.password,
      first_name: firstName,
      last_name: lastName,
      role: selectedRole,
    }).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const destination = returnUrl || this.authService.getHomeForCurrentUser();
        this.router.navigateByUrl(destination);
      },
      error: (err: unknown) => {
        this.errorMessage = this.resolveRegisterErrorMessage(err);
        this.loading = false;
      },
    });
  }
}
