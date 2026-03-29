import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth';
import { ClientService } from '../../../core/services/client';
import { Client } from '../../../core/models';

@Component({
  selector: 'app-client-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './client-form.html',
  styleUrl: './client-form.scss',
})
export class ClientForm implements OnInit {
  isEditMode = false;
  loading = false;
  saving = false;
  errorMessage = '';

  private clientId: number | null = null;

  clientForm = new FormGroup({
    username: new FormControl('', [Validators.required, Validators.minLength(3)]),
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    phone: new FormControl('', [Validators.required]),
    company_name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    email: new FormControl('', [Validators.required, Validators.email]),
    city: new FormControl('', [Validators.required]),
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clientService: ClientService,
    private authService: AuthService,
  ) {}

  get isAssistant(): boolean {
    return this.authService.getCurrentUser()?.role === 'assistant';
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      return;
    }

    this.clientId = Number(idParam);
    if (Number.isNaN(this.clientId)) {
      this.errorMessage = 'Invalid client id.';
      return;
    }

    this.isEditMode = true;
    this.loading = true;

    this.clientService.getById(this.clientId).pipe(
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: (client) => {
        this.patchForm(client);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Unable to load client.';
      },
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.clientForm.get(fieldName);
    return !!field && field.invalid && (field.touched || field.dirty);
  }

  private patchForm(client: Client): void {
    this.clientForm.patchValue({
      username: this.parseUsernameFromNotes(client.notes),
      name: client.contact_person || '',
      phone: client.phone || '',
      company_name: client.company_name || '',
      email: client.email || '',
      city: client.city || '',
    });
  }

  private parseUsernameFromNotes(notes: string | undefined): string {
    if (!notes) {
      return '';
    }

    const usernameMatch = notes.match(/Username:\s*([^|]+)/i);
    return usernameMatch ? usernameMatch[1].trim() : '';
  }

  private cleanOptionalText(value: string | null | undefined): string | undefined {
    if (!value) {
      return undefined;
    }

    const trimmedValue = value.trim();
    return trimmedValue || undefined;
  }

  private buildPayload(): Partial<Client> {
    const formValue = this.clientForm.value;
    const username = this.cleanOptionalText(formValue.username);
    const name = this.cleanOptionalText(formValue.name);

    const payload = {
      username,
      company_name: (formValue.company_name || '').trim(),
      contact_person: name,
      email: this.cleanOptionalText(formValue.email)?.toLowerCase(),
      phone: this.cleanOptionalText(formValue.phone),
      city: this.cleanOptionalText(formValue.city),
      notes: username ? `Username: ${username}` : undefined,
      assigned_expert_id: this.isAssistant ? this.authService.getCurrentUser()?.id : undefined,
    };

    return Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== '')
    ) as Partial<Client>;
  }

  onSubmit(): void {
    if (this.clientForm.invalid || this.saving) {
      this.clientForm.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.saving = true;

    const payload = this.buildPayload();
    const request$ = this.isEditMode && this.clientId
      ? this.clientService.update(this.clientId, payload)
      : this.clientService.create(payload);

    request$.pipe(
      finalize(() => {
        this.saving = false;
      })
    ).subscribe({
      next: () => {
        this.router.navigate(['/clients']);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Unable to save client.';
      },
    });
  }
}
