import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
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
    MatSelectModule,
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
    company_name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    contact_person: new FormControl(''),
    email: new FormControl('', [Validators.email]),
    phone: new FormControl(''),
    sector: new FormControl(''),
    siret: new FormControl('', [Validators.maxLength(14)]),
    city: new FormControl(''),
    address: new FormControl(''),
    annual_revenue: new FormControl(''),
    status: new FormControl('prospect'),
    risk_level: new FormControl('medium'),
    notes: new FormControl(''),
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
      company_name: client.company_name || '',
      contact_person: client.contact_person || '',
      email: client.email || '',
      phone: client.phone || '',
      sector: client.sector || '',
      siret: client.siret || '',
      city: client.city || '',
      address: client.address || '',
      annual_revenue: client.annual_revenue !== undefined && client.annual_revenue !== null ? String(client.annual_revenue) : '',
      status: client.status || 'prospect',
      risk_level: client.risk_level || 'medium',
      notes: client.notes || '',
    });
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
    const annualRevenueValue = this.cleanOptionalText(formValue.annual_revenue);

    let annualRevenue;
    if (annualRevenueValue !== undefined) {
      const parsedAnnualRevenue = Number(annualRevenueValue);
      annualRevenue = Number.isNaN(parsedAnnualRevenue) ? undefined : parsedAnnualRevenue;
    }

    const payload = {
      company_name: (formValue.company_name || '').trim(),
      contact_person: this.cleanOptionalText(formValue.contact_person),
      email: this.cleanOptionalText(formValue.email)?.toLowerCase(),
      phone: this.cleanOptionalText(formValue.phone),
      sector: this.cleanOptionalText(formValue.sector),
      siret: this.cleanOptionalText(formValue.siret),
      city: this.cleanOptionalText(formValue.city),
      address: this.cleanOptionalText(formValue.address),
      annual_revenue: annualRevenue,
      status: formValue.status as Client['status'],
      risk_level: formValue.risk_level as Client['risk_level'],
      notes: this.cleanOptionalText(formValue.notes),
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
