import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { ContactMessage, Document, Project, User } from '../../../core/models';
import { AuthService } from '../../../core/services/auth';
import { ContactService } from '../../../core/services/contact';
import { DocumentService } from '../../../core/services/document';
import { ProjectService } from '../../../core/services/project';

interface RecentProjectRow {
  id: number;
  titre: string;
  type: string;
  statut: string;
  risque: string;
  date: string;
  statusClass: string;
  riskClass: string;
}

@Component({
  selector: 'app-client-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './client-dashboard.component.html',
  styleUrl: './client-dashboard.component.css',
})
export class ClientDashboardComponent implements OnInit {
  currentUser: User | null = null;
  todayLabel = '';

  activeProjectsCount = 0;
  documentsCount = 0;
  lastContactDate = '-';

  allProjects: Project[] = [];
  recentProjects: RecentProjectRow[] = [];

  isLoading = true;

  isContactModalOpen = false;
  isSubmittingContact = false;
  contactSuccessMessage = '';
  contactErrorMessage = '';

  readonly contactForm = new FormGroup({
    sujet: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    project_id: new FormControl<string>(''),
    message: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(20)],
    }),
  });

  constructor(
    private authService: AuthService,
    private projectService: ProjectService,
    private documentService: DocumentService,
    private contactService: ContactService,
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.todayLabel = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    this.loadDashboardData();
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

  openContactModal(): void {
    this.contactErrorMessage = '';
    this.contactSuccessMessage = '';
    this.isContactModalOpen = true;
  }

  closeContactModal(): void {
    this.isContactModalOpen = false;
    this.isSubmittingContact = false;
  }

  submitContact(): void {
    if (!this.currentUser?.id || this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    const sujet = this.contactForm.controls.sujet.value.trim();
    const message = this.contactForm.controls.message.value.trim();
    const projectIdRaw = this.contactForm.controls.project_id.value;

    this.isSubmittingContact = true;
    this.contactErrorMessage = '';
    this.contactSuccessMessage = '';

    this.contactService.sendMessage({
      nom: this.currentUser.nom || this.currentUser.last_name || '',
      email: this.currentUser.email,
      sujet,
      project_id: projectIdRaw ? Number(projectIdRaw) : null,
      message,
      user_id: this.currentUser.id,
    }).subscribe({
      next: () => {
        this.isSubmittingContact = false;
        this.contactSuccessMessage = 'Message envoye avec succes !';
        this.lastContactDate = new Date().toLocaleDateString('fr-FR');
        this.contactForm.patchValue({ sujet: '', project_id: '', message: '' });
      },
      error: () => {
        this.isSubmittingContact = false;
        this.contactErrorMessage = 'Erreur lors de l envoi. Veuillez reessayer.';
      },
    });
  }

  private loadDashboardData(): void {
    this.isLoading = true;

    forkJoin({
      projects: this.projectService.getForCurrentClient().pipe(catchError(() => of<Project[]>([]))),
      documents: this.documentService.getAll().pipe(catchError(() => of<Document[]>([]))),
      messages: this.contactService.getMessages().pipe(catchError(() => of<ContactMessage[]>([]))),
    }).subscribe(({ projects, documents, messages }) => {
      this.allProjects = projects;
      this.recentProjects = projects.slice(0, 5).map((project) => this.mapProjectRow(project));
      this.activeProjectsCount = projects.filter((project) => this.getStatusBucket(project.status) === 'en_cours').length;
      this.documentsCount = documents.length;
      this.lastContactDate = this.extractLastContactDate(messages);
      this.isLoading = false;
    });
  }

  private extractLastContactDate(messages: ContactMessage[]): string {
    if (!messages.length) {
      return '-';
    }

    const rawDate = messages[0].created_at || messages[0].createdAt;
    if (!rawDate) {
      return '-';
    }

    return new Date(rawDate).toLocaleDateString('fr-FR');
  }

  private mapProjectRow(project: Project): RecentProjectRow {
    const statusBucket = this.getStatusBucket(project.status);
    const riskBucket = this.getRiskBucket(project);

    return {
      id: project.id,
      titre: project.name,
      type: this.getTypeLabel(project.type),
      statut: statusBucket,
      risque: riskBucket,
      date: this.formatDate(project.created_at || project.createdAt),
      statusClass: this.getStatusClass(statusBucket),
      riskClass: this.getRiskClass(riskBucket),
    };
  }

  private getTypeLabel(type: Project['type']): string {
    switch (type) {
      case 'creation':
        return 'Creation';
      case 'development':
        return 'Developpement';
      case 'audit':
        return 'Audit';
      case 'consulting':
        return 'Conseil';
      default:
        return 'Autre';
    }
  }

  private getStatusBucket(status: Project['status']): 'en_cours' | 'termine' | 'suspendu' {
    if (status === 'completed') {
      return 'termine';
    }

    if (status === 'cancelled') {
      return 'suspendu';
    }

    return 'en_cours';
  }

  private getRiskBucket(project: Project): 'faible' | 'moyen' | 'eleve' {
    if (project.priority === 'high') {
      return 'eleve';
    }

    if (project.priority === 'medium') {
      return 'moyen';
    }

    return 'faible';
  }

  private getStatusClass(status: 'en_cours' | 'termine' | 'suspendu'): string {
    switch (status) {
      case 'termine':
        return 'bg-emerald-100 text-emerald-700';
      case 'suspendu':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-sky-100 text-sky-700';
    }
  }

  private getRiskClass(risk: 'faible' | 'moyen' | 'eleve'): string {
    switch (risk) {
      case 'moyen':
        return 'bg-orange-100 text-orange-700';
      case 'eleve':
        return 'bg-rose-100 text-rose-700';
      default:
        return 'bg-emerald-100 text-emerald-700';
    }
  }

  private formatDate(rawDate?: string): string {
    if (!rawDate) {
      return '-';
    }

    return new Date(rawDate).toLocaleDateString('fr-FR');
  }
}
