import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Document, Project } from '../../../core/models';
import { DocumentService } from '../../../core/services/document';
import { ProjectService } from '../../../core/services/project';

type UiStatus = 'en_cours' | 'termine' | 'suspendu';

@Component({
  selector: 'app-assistant-projets-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './assistant-projets.component.html',
  styleUrl: './assistant-projets.component.css',
})
export class AssistantProjetsComponent implements OnInit {
  projects: Project[] = [];
  documents: Document[] = [];

  isLoading = false;
  showModal = false;
  selectedProject: Project | null = null;
  selectedProjectDocuments: Document[] = [];

  errorMessage = '';
  successMessage = '';

  readonly statusOptions: ReadonlyArray<{ label: string; value: UiStatus }> = [
    { label: 'en_cours', value: 'en_cours' },
    { label: 'termine', value: 'termine' },
    { label: 'suspendu', value: 'suspendu' },
  ];

  constructor(
    private projectService: ProjectService,
    private documentService: DocumentService,
  ) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  get totalProjectsCount(): number {
    return this.projects.length;
  }

  get inProgressProjectsCount(): number {
    return this.projects.filter((project) => project.status === 'in_progress' || project.status === 'draft').length;
  }

  get completedProjectsCount(): number {
    return this.projects.filter((project) => project.status === 'completed').length;
  }

  get suspendedProjectsCount(): number {
    return this.projects.filter((project) => project.status === 'cancelled').length;
  }

  get completionRate(): number {
    if (this.totalProjectsCount === 0) {
      return 0;
    }

    return Math.round((this.completedProjectsCount / this.totalProjectsCount) * 100);
  }

  loadProjects(): void {
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
        this.errorMessage = 'Impossible de charger les projets assignes.';
        this.isLoading = false;
      },
    });
  }

  openModal(project: Project): void {
    this.selectedProject = project;
    this.selectedProjectDocuments = this.documents.filter((document) => document.project_id === project.id);
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedProject = null;
    this.selectedProjectDocuments = [];
  }

  updateStatus(project: Project, rawValue: string): void {
    const nextUiStatus = this.toUiStatus(rawValue);
    if (!nextUiStatus) {
      return;
    }

    const nextApiStatus = this.toApiStatus(nextUiStatus);
    if (nextApiStatus === project.status) {
      return;
    }

    const previousStatus = project.status;
    project.status = nextApiStatus;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      status: nextApiStatus,
      statut: nextUiStatus,
    } as unknown as Partial<Project>;

    this.projectService.update(project.id, payload).subscribe({
      next: (updatedProject) => {
        project.status = updatedProject?.status ?? nextApiStatus;
        this.successMessage = 'Statut mis a jour avec succes.';

        if (this.selectedProject?.id === project.id) {
          this.selectedProject = { ...project };
        }
      },
      error: () => {
        project.status = previousStatus;
        this.errorMessage = 'Echec de mise a jour du statut du projet.';
      },
    });
  }

  getStatusAlias(status: Project['status']): UiStatus {
    switch (status) {
      case 'completed':
        return 'termine';
      case 'cancelled':
        return 'suspendu';
      default:
        return 'en_cours';
    }
  }

  getStatusLabel(status: Project['status'] | undefined): string {
    if (!status) {
      return '-';
    }

    const uiStatus = this.getStatusAlias(status);
    return uiStatus;
  }

  getPriorityLabel(priority: Project['priority'] | undefined): string {
    switch (priority) {
      case 'high':
        return 'Haute';
      case 'medium':
        return 'Moyenne';
      case 'low':
        return 'Basse';
      default:
        return '-';
    }
  }

  getRiskLabel(project: Project): string {
    if (project.risk_score === null || project.risk_score === undefined) {
      return 'N/A';
    }

    return String(project.risk_score);
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

  getStatusBadgeClass(status: Project['status'] | undefined): string {
    switch (status) {
      case 'completed':
        return 'badge badge--completed';
      case 'cancelled':
        return 'badge badge--suspended';
      default:
        return 'badge badge--in-progress';
    }
  }

  getPriorityBadgeClass(priority: Project['priority'] | undefined): string {
    switch (priority) {
      case 'high':
        return 'badge badge--priority-high';
      case 'low':
        return 'badge badge--priority-low';
      default:
        return 'badge badge--priority-medium';
    }
  }

  private toUiStatus(rawValue: string): UiStatus | null {
    return this.statusOptions.some((option) => option.value === rawValue)
      ? (rawValue as UiStatus)
      : null;
  }

  private toApiStatus(uiStatus: UiStatus): Project['status'] {
    switch (uiStatus) {
      case 'termine':
        return 'completed';
      case 'suspendu':
        return 'cancelled';
      default:
        return 'in_progress';
    }
  }
}
