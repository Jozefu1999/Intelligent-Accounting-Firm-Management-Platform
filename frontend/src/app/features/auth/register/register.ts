import { Component, NgZone, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth';
import { UserRole } from '../../../core/models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, RouterModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSelectModule],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register implements OnInit {
  first_name = '';
  last_name = '';
  email = '';
  password = '';
  role: UserRole | '' = '';
  assigned_expert_id: number | null = null;
  errorMessage = '';
  loading = false;

  experts: { id: number; first_name: string; last_name: string; email: string }[] = [];

  readonly roles: ReadonlyArray<{ label: string; value: UserRole }> = [
    { label: 'Expert Comptable', value: 'expert_comptable' },
    { label: 'Assistant', value: 'assistant' },
    { label: 'Administrateur', value: 'administrateur' },
    { label: 'Client', value: 'client' },
  ];

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const google = (window as any)['google'];
    if (!google?.accounts?.id) return;

    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: any) => {
        this.ngZone.run(() => {
          this.loading = true;
          this.errorMessage = '';
          this.authService.googleLogin(response.credential, this.role || 'client').subscribe({
            next: () => {
              const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
              const destination = returnUrl || this.authService.getHomeForCurrentUser();
              this.router.navigateByUrl(destination);
            },
            error: (err: HttpErrorResponse) => {
              this.errorMessage = err.error?.message || 'Google sign-up failed.';
              this.loading = false;
            },
          });
        });
      },
    });
  }

  signUpWithGoogle(): void {
    const google = (window as any)['google'];
    if (!google?.accounts?.id) {
      this.errorMessage = 'Google Sign-In is not available. Please try again later.';
      return;
    }
    google.accounts.id.prompt();
  }

  onRoleChange(): void {
    if ((this.role === 'client' || this.role === 'assistant') && this.experts.length === 0) {
      this.authService.getExperts().subscribe({
        next: (data) => {
          this.experts = data;
          this.cdr.detectChanges();
        },
        error: () => {
          this.experts = [];
        },
      });
    }
    if (this.role !== 'client' && this.role !== 'assistant') {
      this.assigned_expert_id = null;
    }
  }

  onSubmit(): void {
    if (!this.role) {
      this.errorMessage = 'Please select a role.';
      return;
    }

    if ((this.role === 'client' || this.role === 'assistant') && !this.assigned_expert_id) {
      this.errorMessage = 'Please select your expert comptable.';
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
      ...((this.role === 'client' || this.role === 'assistant') && this.assigned_expert_id ? { assigned_expert_id: this.assigned_expert_id } : {}),
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

