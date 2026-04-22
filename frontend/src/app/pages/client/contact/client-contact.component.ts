import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { ContactMessage, Project, User } from '../../../core/models';
import { ContactService } from '../../../core/services/contact';
import { ProjectService } from '../../../core/services/project';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-client-contact-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './client-contact.component.html',
  styleUrl: './client-contact.component.css',
})
export class ClientContactComponent implements OnInit {
  currentUser: User | null = null;

  projects: Project[] = [];
  messages: ContactMessage[] = [];

  isSubmitting = false;
  isSuccessState = false;
  errorMessage = '';

  readonly contactForm = new FormGroup({
    nom: new FormControl({ value: '', disabled: true }, { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl({ value: '', disabled: true }, { nonNullable: true, validators: [Validators.required, Validators.email] }),
    sujet: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    project_id: new FormControl<string>(''),
    message: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(20)],
    }),
    user_id: new FormControl(0, { nonNullable: true, validators: [Validators.required] }),
  });

  constructor(
    private authService: AuthService,
    private projectService: ProjectService,
    private contactService: ContactService,
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    this.contactForm.patchValue({
      nom: this.currentUser?.nom || this.currentUser?.last_name || '',
      email: this.currentUser?.email || '',
      user_id: this.currentUser?.id || 0,
    });

    this.loadPageData();
  }

  submitContact(): void {
    if (this.contactForm.invalid || !this.currentUser?.id) {
      this.contactForm.markAllAsTouched();
      return;
    }

    const rawValue = this.contactForm.getRawValue();

    this.isSubmitting = true;
    this.errorMessage = '';

    this.contactService.sendMessage({
      nom: rawValue.nom.trim(),
      email: rawValue.email.trim(),
      sujet: rawValue.sujet.trim(),
      project_id: rawValue.project_id ? Number(rawValue.project_id) : null,
      message: rawValue.message.trim(),
      user_id: rawValue.user_id,
    }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.isSuccessState = true;
        this.errorMessage = '';
        this.contactForm.patchValue({ sujet: '', project_id: '', message: '' });
        this.loadMessages();
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting = false;
        this.errorMessage = error.error?.message || 'Error sending message. Please try again.';
      },
    });
  }

  sendAnotherMessage(): void {
    this.isSuccessState = false;
    this.errorMessage = '';
    this.contactForm.patchValue({ sujet: '', project_id: '', message: '' });
  }

  getStatusLabel(status: ContactMessage['statut']): string {
    switch (status) {
      case 'lu':
        return 'Read';
      case 'repondu':
        return 'Replied';
      default:
        return 'Sent';
    }
  }

  getStatusClass(status: ContactMessage['statut']): string {
    switch (status) {
      case 'lu':
        return 'status-read';
      case 'repondu':
        return 'status-replied';
      default:
        return 'status-sent';
    }
  }

  getProjectName(message: ContactMessage): string {
    return message.project?.name || '-';
  }

  formatDate(rawDate?: string): string {
    if (!rawDate) {
      return '-';
    }

    return new Date(rawDate).toLocaleDateString('en-US');
  }

  private loadPageData(): void {
    forkJoin({
      projects: this.projectService.getForCurrentClient().pipe(catchError(() => of<Project[]>([]))),
      messages: this.contactService.getMessages().pipe(catchError(() => of<ContactMessage[]>([]))),
    }).subscribe(({ projects, messages }) => {
      this.projects = projects;
      this.messages = messages;
    });
  }

  private loadMessages(): void {
    this.contactService.getMessages().subscribe({
      next: (messages) => {
        this.messages = messages;
      },
      error: () => {
        this.messages = [];
      },
    });
  }
}

