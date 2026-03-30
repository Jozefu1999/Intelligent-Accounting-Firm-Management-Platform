import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth';

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
  errorMessage = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  onSubmit(): void {
    this.loading = true;
    this.errorMessage = '';
    this.authService.register({
      email: this.email,
      password: this.password,
      first_name: this.first_name,
      last_name: this.last_name,
    }).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Registration failed.';
        this.loading = false;
      },
    });
  }
}
