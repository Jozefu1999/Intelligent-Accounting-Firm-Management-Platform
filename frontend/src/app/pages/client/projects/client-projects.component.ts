import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { Document, Project, User } from '../../../core/models';
import { AuthService } from '../../../core/services/auth';
import { DocumentService } from '../../../core/services/document';
import { ProjectService } from '../../../core/services/project';

type StatusFilter = 'all' | 'en_cours' | 'termine' | 'suspendu';

@Component({
  selector: 'app-client-projects-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './client-projects.component.html',
  styleUrl: './client-projects.component.css',
})
export class ClientProjectsComponent implements OnInit {
  projects: Project[] = [];
  selectedProject: Project | null = null;
  selectedProjectDocuments: Document[] = [];

  isLoading = true;
  isLoadingDetails = false;

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly statusControl = new FormControl<StatusFilter>('all', { nonNullable: true });

  private currentUser: User | null = null;

  constructor(
    private authService: AuthService,
    private projectService: ProjectService,
    private documentService: DocumentService,
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadProjects();
  }

  get filteredProjects(): Project[] {
    const searchText = this.searchControl.value.trim().toLowerCase();
    const statusFilter = this.statusControl.value;

    return this.projects.filter((project) => {
      const matchesSearch = project.name.toLowerCase().includes(searchText);
      const matchesStatus = statusFilter === 'all' || this.getStatusBucket(project.status) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }

  get currentUserName(): string {
    const firstName = this.currentUser?.prenom || this.currentUser?.first_name || '';
    const lastName = this.currentUser?.nom || this.currentUser?.last_name || '';
    return `${firstName} ${lastName}`.trim() || 'Client';
  }

  openDetails(project: Project): void {
    this.selectedProject = project;
    this.selectedProjectDocuments = [];
    this.isLoadingDetails = true;

    this.documentService.getByProjectId(project.id).subscribe({
      next: (documents) => {
        this.selectedProjectDocuments = documents;
        this.isLoadingDetails = false;
      },
      error: () => {
        this.selectedProjectDocuments = [];
        this.isLoadingDetails = false;
      },
    });
  }

  closeDetails(): void {
    this.selectedProject = null;
    this.selectedProjectDocuments = [];
    this.isLoadingDetails = false;
  }

  downloadDocument(document: Document): void {
    this.documentService.download(document.id).subscribe((blob) => {
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = document.name;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
    });
  }

  getStatusLabel(status: Project['status']): string {
    return this.getStatusBucket(status);
  }

  getRiskLabel(project: Project): string {
    return this.getRiskBucket(project);
  }

  getStatusClass(status: Project['status']): string {
    const bucket = this.getStatusBucket(status);

    switch (bucket) {
      case 'termine':
        return 'bg-emerald-100 text-emerald-700';
      case 'suspendu':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-sky-100 text-sky-700';
    }
  }

  getRiskClass(project: Project): string {
    const bucket = this.getRiskBucket(project);

    switch (bucket) {
      case 'moyen':
        return 'bg-orange-100 text-orange-700';
      case 'eleve':
        return 'bg-rose-100 text-rose-700';
      default:
        return 'bg-emerald-100 text-emerald-700';
    }
  }

  getTypeLabel(type: Project['type']): string {
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

  formatDate(rawDate?: string): string {
    if (!rawDate) {
      return '-';
    }

    return new Date(rawDate).toLocaleDateString('fr-FR');
  }

  private loadProjects(): void {
    this.isLoading = true;

    this.projectService.getForCurrentClient().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.isLoading = false;
      },
      error: () => {
        this.projects = [];
        this.isLoading = false;
      },
    });
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
}
