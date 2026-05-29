import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword implements OnInit {
  token = '';
  email = '';
  password = '';
  confirmPassword = '';
  loading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    this.email = this.route.snapshot.queryParamMap.get('email') || '';

    if (!this.token || !this.email) {
      this.errorMessage = 'Invalid reset link. Please request a new one.';
    }
  }

  onSubmit(): void {
    this.errorMessage = '';

    if (!this.password || this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.loading = true;
    this.authService.resetPassword(this.token, this.email, this.password).subscribe({
      next: (res) => {
        this.successMessage = res.message || 'Password reset successful!';
        this.loading = false;
        setTimeout(() => this.router.navigateByUrl('/login'), 3000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Reset failed. The link may have expired.';
        this.loading = false;
      },
    });
  }
}
