import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { finalize, timeout } from 'rxjs';
import { ClientService } from '../../../core/services/client';
import { CreateClientPayload } from '../../../core/models';

@Component({
  selector: 'app-client-form',
  imports: [CommonModule, FormsModule, RouterModule, MatButtonModule, MatIconModule],
  templateUrl: './client-form.html',
  styleUrl: './client-form.scss',
})
export class ClientForm implements OnInit {
  name = '';
  username = '';
  phone = '';
  mail = '';
  adresse = '';

  isEditMode = false;
  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  private readonly destroyRef = inject(DestroyRef);

  private clientId: number | null = null;

  constructor(
    private readonly clientService: ClientService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');

    if (!idParam) {
      return;
    }

    const parsedId = Number(idParam);

    if (Number.isNaN(parsedId)) {
      this.errorMessage = 'Invalid client identifier.';
      this.cdr.detectChanges();
      return;
    }

    this.clientId = parsedId;
    this.isEditMode = true;
    this.loadClient(parsedId);
  }

  onSubmit(): void {
    if (this.isSubmitting) {
      return;
    }

    this.mail = this.normalizeEmailInput(this.mail);
    this.cdr.detectChanges();

    const validationError = this.getValidationError();
    if (validationError) {
      this.errorMessage = validationError;
      this.cdr.detectChanges();
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    const clientPayload = {
      company_name: this.name.trim(),
      contact_person: this.username.trim(),
      phone: this.phone.trim(),
      email: this.mail,
      address: this.adresse.trim(),
    };

    if (this.isEditMode && this.clientId) {
      this.clientService.update(this.clientId, clientPayload)
        .pipe(
          timeout(15000),
          takeUntilDestroyed(this.destroyRef),
          finalize(() => {
            this.isSubmitting = false;
            this.cdr.detectChanges();
          }),
        )
        .subscribe({
          next: () => {
            this.router.navigateByUrl('/clients');
            this.cdr.detectChanges();
          },
          error: (error) => {
            this.errorMessage = this.extractErrorMessage(error, 'Unable to update client.');
            this.cdr.detectChanges();
          },
        });

      return;
    }

    const createPayload: CreateClientPayload = {
      name: this.name.trim(),
      username: this.username.trim(),
      phone: this.phone.trim(),
      mail: this.mail,
      adresse: this.adresse.trim(),
      company_name: this.name.trim(),
      contact_person: this.username.trim(),
      email: this.mail,
      address: this.adresse.trim(),
    };

    this.clientService.create(createPayload)
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/clients'], {
            queryParams: { created: '1' },
          });
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.errorMessage = this.extractErrorMessage(error, 'Unable to create client.');
          this.cdr.detectChanges();
        },
      });
  }

  private loadClient(id: number): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.clientService.getById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (client) => {
          this.name = client.company_name ?? '';
          this.username = client.contact_person ?? '';
          this.phone = client.phone ?? '';
          this.mail = client.email ?? '';
          this.adresse = client.address ?? '';
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.errorMessage = this.extractErrorMessage(error, 'Unable to load client.');
          this.cdr.detectChanges();
        },
      });
  }

  private getValidationError(): string {
    if (!this.name.trim()) {
      return 'Name is required.';
    }

    if (!this.username.trim()) {
      return 'Username is required.';
    }

    const trimmedMail = this.mail.trim();
    if (trimmedMail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedMail)) {
      return 'Please provide a valid email address.';
    }

    return '';
  }

  private extractErrorMessage(error: unknown, fallbackMessage: string): string {
    if (typeof error === 'object' && error !== null && 'name' in error) {
      const timeoutError = error as { name?: string };
      if (timeoutError.name === 'TimeoutError') {
        return 'Request timed out. Please check your server and try again.';
      }
    }

    if (typeof error === 'object' && error !== null && 'status' in error) {
      const httpError = error as { status?: number };
      if (httpError.status === 0) {
        return 'Cannot connect to server. Make sure backend is running on http://localhost:3000.';
      }
    }

    if (typeof error === 'object' && error !== null && 'error' in error) {
      const apiError = (error as {
        error?: { message?: string; errors?: Array<{ msg?: string }> };
      }).error;

      const firstValidationError = apiError?.errors?.[0]?.msg;
      if (typeof firstValidationError === 'string' && firstValidationError.trim()) {
        return firstValidationError;
      }

      if (typeof apiError?.message === 'string' && apiError.message.trim()) {
        return apiError.message;
      }
    }

    return fallbackMessage;
  }

  private normalizeEmailInput(value: string): string {
    const normalizedValue = value.trim().toLowerCase();

    if (!normalizedValue) {
      return '';
    }

    const [localPart, ...domainParts] = normalizedValue.split('@');

    if (!localPart || domainParts.length === 0) {
      return normalizedValue;
    }

    const normalizedDomain = domainParts.join('@')
      .replace(/\.+/g, '.')
      .replace(/^\./, '')
      .replace(/\.$/, '');

    return `${localPart}@${normalizedDomain}`;
  }
}
