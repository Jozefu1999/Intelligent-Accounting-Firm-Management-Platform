import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  email = '';
  password = '';
  errorMessage = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {
    const reason = this.route.snapshot.queryParamMap.get('reason');
    if (reason === 'session-expired') {
      this.errorMessage = 'Your session has expired. Please sign in again.';
    }
  }

  ngOnInit(): void {
    const google = (window as any)['google'];
    if (!google?.accounts?.id) return;

    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: any) => {
        this.ngZone.run(() => {
          this.loading = true;
          this.errorMessage = '';
          this.authService.googleLogin(response.credential).subscribe({
            next: () => {
              const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
              const destination = returnUrl || this.authService.getHomeForCurrentUser();
              this.router.navigateByUrl(destination);
            },
            error: (err: HttpErrorResponse) => {
              this.errorMessage = err.error?.message || 'Google sign-in failed.';
              this.loading = false;
              this.cdr.detectChanges();
            },
          });
        });
      },
    });
  }

  signInWithGoogle(): void {
    const google = (window as any)['google'];
    if (!google?.accounts?.id) {
      this.errorMessage = 'Google Sign-In is not available. Please try again later.';
      return;
    }
    google.accounts.id.prompt();
  }

  onSubmit(): void {
    this.loading = true;
    this.errorMessage = '';
    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const destination = returnUrl || this.authService.getHomeForCurrentUser();
        this.router.navigateByUrl(destination);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 0) {
          this.errorMessage = 'Unable to reach the server. Verify that the backend is running on port 3000.';
        } else {
          this.errorMessage = err.error?.message || 'Login failed.';
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }
}

