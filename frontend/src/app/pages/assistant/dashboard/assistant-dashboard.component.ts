import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Document, Project, User } from '../../../core/models';
import { AuthService } from '../../../core/services/auth';
import { DocumentService } from '../../../core/services/document';
import { ProjectService } from '../../../core/services/project';

@Component({
  selector: 'app-assistant-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './assistant-dashboard.component.html',
  styleUrl: './assistant-dashboard.component.css',
})
export class AssistantDashboardComponent implements OnInit {
  currentUser: User | null = null;
  projects: Project[] = [];
  documents: Document[] = [];

  isLoading = false;
  errorMessage = '';

  private readonly today = new Date();

  constructor(
    private authService: AuthService,
    private projectService: ProjectService,
    private documentService: DocumentService,
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadDashboard();
  }

  get fullName(): string {
    const firstName = this.currentUser?.prenom || this.currentUser?.first_name || '';
    const lastName = this.currentUser?.nom || this.currentUser?.last_name || '';
    return `${firstName} ${lastName}`.trim();
  }

  get todayLabel(): string {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(this.today);
  }

  get assignedProjectsCount(): number {
    return this.projects.length;
  }

  get uploadedDocumentsCount(): number {
    return this.documents.length;
  }

  get recentProjects(): Project[] {
    return [...this.projects]
      .sort((left, right) => this.toTimestamp(right.created_at || right.updated_at) - this.toTimestamp(left.created_at || left.updated_at))
      .slice(0, 5);
  }

  loadDashboard(): void {
    this.isLoading = true;
    this.errorMessage = '';

    forkJoin({
      projects: this.projectService.getAll(),
      documents: this.documentService.getAll(),
    }).subscribe({
      next: ({ projects, documents }) => {
        this.projects = projects ?? [];
        this.documents = documents ?? [];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger le tableau de bord assistant.';
        this.isLoading = false;
      },
    });
  }

  getStatusLabel(status: Project['status']): string {
    switch (status) {
      case 'in_progress':
        return 'En cours';
      case 'completed':
        return 'Termine';
      case 'cancelled':
        return 'Suspendu';
      default:
        return 'Brouillon';
    }
  }

  getPriorityLabel(priority: Project['priority']): string {
    switch (priority) {
      case 'high':
        return 'Haute';
      case 'medium':
        return 'Moyenne';
      default:
        return 'Basse';
    }
  }

  formatDate(value?: string): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date);
  }

  private toTimestamp(value?: string): number {
    if (!value) {
      return 0;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 0;
    }

    return date.getTime();
  }
}
