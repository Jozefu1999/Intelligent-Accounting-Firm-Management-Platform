import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Document, Project, User } from '../../core/models';
import { AuthService } from '../../core/services/auth';
import { DocumentService } from '../../core/services/document';
import { ProjectService } from '../../core/services/project';

type ProjectStatus = Project['status'];

@Component({
  selector: 'app-assistant-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './assistant-dashboard.component.html',
  styleUrl: './assistant-dashboard.component.css',
})
export class AssistantDashboardComponent implements OnInit {
  currentUser: User | null = null;
  projects: Project[] = [];
  documents: Document[] = [];

  isLoading = false;
  isUploading = false;
  showUploadModal = false;

  selectedProjectId: number | null = null;
  selectedFile: File | null = null;

  errorMessage = '';
  successMessage = '';

  readonly statusOptions: Array<{ label: string; value: ProjectStatus }> = [
    { label: 'Draft', value: 'draft' },
    { label: 'In progress', value: 'in_progress' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  constructor(
    private authService: AuthService,
    private projectService: ProjectService,
    private documentService: DocumentService,
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadData();
  }

  get fullName(): string {
    const firstName = this.currentUser?.prenom || this.currentUser?.first_name || '';
    const lastName = this.currentUser?.nom || this.currentUser?.last_name || '';
    return `${firstName} ${lastName}`.trim();
  }

  get assignedProjectsCount(): number {
    return this.projects.length;
  }

  get uploadedDocumentsCount(): number {
    const userId = this.currentUser?.id;
    if (!userId) {
      return this.documents.length;
    }

    return this.documents.filter((document) => document.uploaded_by === userId).length;
  }

  loadData(): void {
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
        this.errorMessage = 'Unable to load assistant data.';
        this.isLoading = false;
      },
    });
  }

  openUploadModal(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.showUploadModal = true;
    this.selectedProjectId = this.projects[0]?.id ?? null;
    this.selectedFile = null;
  }

  closeUploadModal(): void {
    this.showUploadModal = false;
    this.selectedProjectId = null;
    this.selectedFile = null;
    this.isUploading = false;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  submitUpload(): void {
    if (!this.selectedProjectId || !this.selectedFile) {
      this.errorMessage = 'Please select a project and a file.';
      return;
    }

    this.isUploading = true;
    this.errorMessage = '';

    this.documentService.upload(this.selectedFile, { project_id: this.selectedProjectId }).subscribe({
      next: () => {
        this.successMessage = 'Document uploaded successfully.';
        this.closeUploadModal();
        this.loadDocumentsOnly();
      },
      error: () => {
        this.errorMessage = 'Document upload failed.';
        this.isUploading = false;
      },
    });
  }

  updateStatus(project: Project, value: string): void {
    if (!this.isValidStatus(value)) {
      return;
    }

    this.errorMessage = '';

    this.projectService.update(project.id, { status: value }).subscribe({
      next: () => {
        project.status = value;
        this.successMessage = 'Project status updated.';
      },
      error: () => {
        this.errorMessage = 'Unable to update project status.';
      },
    });
  }

  getStatusLabel(status: ProjectStatus): string {
    switch (status) {
      case 'in_progress':
        return 'In progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Draft';
    }
  }

  getPriorityLabel(priority: Project['priority']): string {
    switch (priority) {
      case 'high':
        return 'High';
      case 'medium':
        return 'Medium';
      default:
        return 'Low';
    }
  }

  private isValidStatus(status: string): status is ProjectStatus {
    return this.statusOptions.some((option) => option.value === status);
  }

  private loadDocumentsOnly(): void {
    this.documentService.getAll().subscribe({
      next: (documents) => {
        this.documents = documents ?? [];
      },
      error: () => {
        this.documents = [];
      },
    });
  }
}

