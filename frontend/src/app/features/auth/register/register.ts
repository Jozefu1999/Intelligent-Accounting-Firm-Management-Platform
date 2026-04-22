import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HttpErrorResponse } from '@angular/common/http';
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
  role: UserRole | '' = '';
  errorMessage = '';
  loading = false;

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

  onSubmit(): void {
    if (!this.role) {
      this.errorMessage = 'Please select a role.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.authService.register({
      email: this.email,
      password: this.password,
      first_name: this.first_name,
      last_name: this.last_name,
      role: this.role,
    }).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const destination = returnUrl || this.authService.getHomeForCurrentUser();
        this.router.navigateByUrl(destination);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 0) {
          this.errorMessage = 'Unable to reach the server. Verify that the backend is running on port 3000.';
        } else {
          this.errorMessage = err.error?.message || 'Registration failed.';
        }
        this.loading = false;
      },
    });
  }
}

