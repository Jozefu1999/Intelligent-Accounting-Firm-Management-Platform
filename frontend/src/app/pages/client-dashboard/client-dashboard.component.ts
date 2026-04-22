import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { User } from '../../core/models';
import { AuthService } from '../../core/services/auth';
import { ContactService } from '../../core/services/contact';
import { getRoleLabel } from '../../core/utils/role-home';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client-dashboard.component.html',
  styleUrl: './client-dashboard.component.css',
})
export class ClientDashboardComponent implements OnInit {
  currentUser: User | null = null;

  sujet = '';
  message = '';

  isSendingMessage = false;
  isSavingProfile = false;

  showEditProfile = false;

  feedbackError = '';
  feedbackSuccess = '';

  profileForm = {
    nom: '',
    prenom: '',
    email: '',
    password: '',
  };

  constructor(
    private authService: AuthService,
    private contactService: ContactService,
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.resetProfileForm();
  }

  get displayNom(): string {
    return this.currentUser?.nom || this.currentUser?.last_name || '-';
  }

  get displayPrenom(): string {
    return this.currentUser?.prenom || this.currentUser?.first_name || '-';
  }

  get displayEmail(): string {
    return this.currentUser?.email || '-';
  }

  get displayRole(): string {
    return getRoleLabel(this.currentUser?.role);
  }

  submitContact(): void {
    const userId = this.currentUser?.id;
    if (!userId || !this.sujet.trim() || !this.message.trim()) {
      this.feedbackError = 'Subject et message sont obligatoires.';
      return;
    }

    this.feedbackError = '';
    this.feedbackSuccess = '';
    this.isSendingMessage = true;

    this.contactService.sendMessage({
      nom: this.displayNom,
      email: this.displayEmail,
      sujet: this.sujet,
      project_id: null,
      message: this.message,
      user_id: userId,
    }).subscribe({
      next: () => {
        this.sujet = '';
        this.message = '';
        this.feedbackSuccess = 'Message sent to the firm.';
        this.isSendingMessage = false;
      },
      error: () => {
        this.feedbackError = 'Unable to send the message.';
        this.isSendingMessage = false;
      },
    });
  }

  openEditProfile(): void {
    this.resetProfileForm();
    this.feedbackError = '';
    this.feedbackSuccess = '';
    this.showEditProfile = true;
  }

  cancelEditProfile(): void {
    this.showEditProfile = false;
    this.profileForm.password = '';
  }

  saveProfile(): void {
    if (!this.profileForm.nom.trim() || !this.profileForm.prenom.trim() || !this.profileForm.email.trim()) {
      this.feedbackError = 'Last name, first name, and email are required.';
      return;
    }

    this.feedbackError = '';
    this.feedbackSuccess = '';
    this.isSavingProfile = true;

    this.authService.updateProfile({
      last_name: this.profileForm.nom,
      first_name: this.profileForm.prenom,
      email: this.profileForm.email,
      password: this.profileForm.password || undefined,
    }).subscribe({
      next: (updatedUser) => {
        this.currentUser = updatedUser;
        this.feedbackSuccess = 'Profile updated successfully.';
        this.isSavingProfile = false;
        this.showEditProfile = false;
        this.profileForm.password = '';
      },
      error: () => {
        this.feedbackError = 'Unable to update the profile.';
        this.isSavingProfile = false;
      },
    });
  }

  private resetProfileForm(): void {
    const firstName = this.currentUser?.prenom || this.currentUser?.first_name || '';
    const lastName = this.currentUser?.nom || this.currentUser?.last_name || '';

    this.profileForm = {
      nom: lastName,
      prenom: firstName,
      email: this.currentUser?.email || '',
      password: '',
    };
  }
}

