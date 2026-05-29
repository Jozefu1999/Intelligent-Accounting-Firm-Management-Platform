import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { Client, User } from '../../../core/models';
import { AuthService } from '../../../core/services/auth';
import { ClientService } from '../../../core/services/client';

@Component({
  selector: 'app-client-profile-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './client-profile.component.html',
  styleUrl: './client-profile.component.css',
})
export class ClientProfileComponent implements OnInit {
  currentUser: User | null = null;
  clientProfile: Client | null = null;

  readonly sectors = [
    'Agriculture', 'Construction', 'Manufacturing', 'Retail', 'Transport',
    'Hospitality', 'Information Technology', 'Finance', 'Healthcare',
    'Real Estate', 'Consulting', 'Education', 'Legal', 'Media & Communication', 'Other',
  ];

  profileSuccessMessage = '';
  profileErrorMessage = '';
  passwordSuccessMessage = '';
  passwordErrorMessage = '';
  companySuccessMessage = '';
  companyErrorMessage = '';

  isSavingProfile = false;
  isChangingPassword = false;
  isSavingCompany = false;
  isLoadingCompany = false;

  readonly profileForm = new FormGroup({
    nom: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    prenom: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });

  readonly companyForm = new FormGroup({
    company_name: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    siret: new FormControl('', { nonNullable: true }),
    sector: new FormControl('', { nonNullable: true }),
    phone: new FormControl('', { nonNullable: true }),
    address: new FormControl('', { nonNullable: true }),
    city: new FormControl('', { nonNullable: true }),
    annual_revenue: new FormControl<number | null>(null),
    contact_person: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
  });

  readonly passwordForm = new FormGroup({
    currentPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    newPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
    confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor(
    private authService: AuthService,
    private clientService: ClientService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.profileForm.patchValue({
      nom: this.currentUser?.nom || this.currentUser?.last_name || '',
      prenom: this.currentUser?.prenom || this.currentUser?.first_name || '',
      email: this.currentUser?.email || '',
    });
    this.loadClientProfile();
  }

  loadClientProfile(): void {
    this.isLoadingCompany = true;
    this.clientService.getMyProfile().subscribe({
      next: (client) => {
        this.clientProfile = client;
        this.companyForm.patchValue({
          company_name: client.company_name || '',
          siret: client.siret || '',
          sector: client.sector || '',
          phone: client.phone || '',
          address: client.address || '',
          city: client.city || '',
          annual_revenue: client.annual_revenue || null,
          contact_person: client.contact_person || '',
          notes: client.notes || '',
        });
        this.isLoadingCompany = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingCompany = false;
        this.cdr.detectChanges();
      },
    });
  }

  get avatarInitials(): string {
    const firstName = this.currentUser?.prenom || this.currentUser?.first_name || '';
    const lastName = this.currentUser?.nom || this.currentUser?.last_name || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'CL';
  }

  get fullName(): string {
    const firstName = this.currentUser?.prenom || this.currentUser?.first_name || '';
    const lastName = this.currentUser?.nom || this.currentUser?.last_name || '';
    return `${firstName} ${lastName}`.trim() || 'Client';
  }

  get memberSince(): string {
    const createdAt = this.currentUser?.created_at || this.currentUser?.updated_at;
    if (!createdAt) {
      return '-';
    }

    return new Date(createdAt).toLocaleDateString('en-US');
  }

  get passwordMinLengthMet(): boolean {
    return this.passwordForm.controls.newPassword.value.length >= 6;
  }

  get passwordsMatch(): boolean {
    const newPassword = this.passwordForm.controls.newPassword.value;
    const confirmPassword = this.passwordForm.controls.confirmPassword.value;

    if (!newPassword && !confirmPassword) {
      return false;
    }

    return newPassword === confirmPassword;
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSavingProfile = true;
    this.profileSuccessMessage = '';
    this.profileErrorMessage = '';

    this.authService.updateProfile({
      nom: this.profileForm.controls.nom.value.trim(),
      prenom: this.profileForm.controls.prenom.value.trim(),
      email: this.profileForm.controls.email.value.trim(),
    }).subscribe({
      next: (user) => {
        this.currentUser = user;
        this.profileSuccessMessage = 'Profile updated successfully.';
        this.profileErrorMessage = '';
        this.isSavingProfile = false;
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        this.isSavingProfile = false;

        if (error.error?.message === 'Email already in use.') {
          this.profileErrorMessage = 'This email is already in use.';
        } else {
          this.profileErrorMessage = error.error?.message || 'Error while updating profile.';
        }
        this.cdr.detectChanges();
      },
    });
  }

  saveCompanyInfo(): void {
    if (this.companyForm.invalid) {
      this.companyForm.markAllAsTouched();
      return;
    }

    this.isSavingCompany = true;
    this.companySuccessMessage = '';
    this.companyErrorMessage = '';

    const raw = this.companyForm.getRawValue();
    const data: Partial<Client> = {
      ...raw,
      annual_revenue: raw.annual_revenue ?? undefined,
    };
    this.clientService.updateMyProfile(data).subscribe({
      next: (client) => {
        this.clientProfile = client;
        this.companySuccessMessage = 'Company information updated successfully.';
        this.isSavingCompany = false;
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        this.isSavingCompany = false;
        this.companyErrorMessage = error.error?.message || 'Error while updating company information.';
        this.cdr.detectChanges();
      },
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid || !this.passwordsMatch) {
      this.passwordForm.markAllAsTouched();

      if (!this.passwordsMatch) {
        this.passwordErrorMessage = 'Passwords do not match.';
      }

      return;
    }

    this.isChangingPassword = true;
    this.passwordErrorMessage = '';
    this.passwordSuccessMessage = '';

    this.authService.changePassword({
      currentPassword: this.passwordForm.controls.currentPassword.value,
      newPassword: this.passwordForm.controls.newPassword.value,
    }).subscribe({
      next: () => {
        this.passwordSuccessMessage = 'Password changed successfully.';
        this.passwordErrorMessage = '';
        this.isChangingPassword = false;
        this.passwordForm.reset({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        this.cdr.detectChanges();
      },
      error: (error: HttpErrorResponse) => {
        this.isChangingPassword = false;
        this.passwordErrorMessage = error.error?.message || 'Error while changing password.';
        this.cdr.detectChanges();
      },
    });
  }
}

