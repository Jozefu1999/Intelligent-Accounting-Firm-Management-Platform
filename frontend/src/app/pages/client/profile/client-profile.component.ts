import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { User } from '../../../core/models';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-client-profile-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './client-profile.component.html',
  styleUrl: './client-profile.component.css',
})
export class ClientProfileComponent implements OnInit {
  currentUser: User | null = null;

  profileSuccessMessage = '';
  profileErrorMessage = '';
  passwordSuccessMessage = '';
  passwordErrorMessage = '';

  isSavingProfile = false;
  isChangingPassword = false;

  readonly profileForm = new FormGroup({
    nom: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    prenom: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });

  readonly passwordForm = new FormGroup({
    currentPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    newPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
    confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.profileForm.patchValue({
      nom: this.currentUser?.nom || this.currentUser?.last_name || '',
      prenom: this.currentUser?.prenom || this.currentUser?.first_name || '',
      email: this.currentUser?.email || '',
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

    return new Date(createdAt).toLocaleDateString('fr-FR');
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
        this.profileSuccessMessage = 'Profil mis a jour avec succes.';
        this.profileErrorMessage = '';
        this.isSavingProfile = false;
      },
      error: (error: HttpErrorResponse) => {
        this.isSavingProfile = false;

        if (error.error?.message === 'Email already in use.') {
          this.profileErrorMessage = 'Cet email est deja utilise.';
        } else {
          this.profileErrorMessage = error.error?.message || 'Erreur lors de la mise a jour du profil.';
        }
      },
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid || !this.passwordsMatch) {
      this.passwordForm.markAllAsTouched();

      if (!this.passwordsMatch) {
        this.passwordErrorMessage = 'Les mots de passe ne correspondent pas.';
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
        this.passwordSuccessMessage = 'Mot de passe modifie avec succes.';
        this.passwordErrorMessage = '';
        this.isChangingPassword = false;
        this.passwordForm.reset({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      },
      error: (error: HttpErrorResponse) => {
        this.isChangingPassword = false;
        this.passwordErrorMessage = error.error?.message || 'Erreur lors du changement du mot de passe.';
      },
    });
  }
}
