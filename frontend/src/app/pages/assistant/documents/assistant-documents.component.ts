import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Document, Project } from '../../../core/models';
import { DocumentService } from '../../../core/services/document';
import { ProjectService } from '../../../core/services/project';

@Component({
  selector: 'app-assistant-documents-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './assistant-documents.component.html',
  styleUrl: './assistant-documents.component.css',
})
export class AssistantDocumentsComponent implements OnInit {
  documents: Document[] = [];
  projects: Project[] = [];

  showUploadModal = false;
  isLoading = false;
  isUploading = false;

  selectedFile: File | null = null;
  selectedProjectId: number | null = null;

  errorMessage = '';
  successMessage = '';

  constructor(
    private documentService: DocumentService,
    private projectService: ProjectService,
  ) {}

  ngOnInit(): void {
    this.loadDocuments();
    this.loadProjects();
  }

  loadDocuments(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.documentService.getAll().subscribe({
      next: (documents) => {
        this.documents = documents ?? [];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les documents.';
        this.isLoading = false;
      },
    });
  }

  loadProjects(): void {
    this.projectService.getAll().subscribe({
      next: (projects) => {
        this.projects = projects ?? [];
      },
      error: () => {
        this.projects = [];
      },
    });
  }

  openUploadModal(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.selectedFile = null;
    this.selectedProjectId = null;
    this.showUploadModal = true;
  }

  closeModal(): void {
    this.showUploadModal = false;
    this.selectedFile = null;
    this.selectedProjectId = null;
    this.isUploading = false;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  uploadDocument(): void {
    if (!this.selectedFile || !this.selectedProjectId) {
      this.errorMessage = 'Veuillez selectionner un projet et un fichier.';
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('project_id', this.selectedProjectId.toString());

    this.isUploading = true;
    this.errorMessage = '';

    this.documentService.upload(this.selectedFile, { project_id: this.selectedProjectId }).subscribe({
      next: () => {
        this.successMessage = 'Document uploade avec succes.';
        this.closeModal();
        this.loadDocuments();
      },
      error: () => {
        this.errorMessage = 'Echec de l upload du document.';
        this.isUploading = false;
      },
    });
  }

  downloadDocument(id: number, fileName = 'document'): void {
    this.documentService.download(id).subscribe({
      next: (blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        link.click();
        window.URL.revokeObjectURL(downloadUrl);
      },
      error: () => {
        this.errorMessage = 'Impossible de telecharger le document.';
      },
    });
  }

  getProjectName(projectId?: number): string {
    if (!projectId) {
      return 'N/A';
    }

    const project = this.projects.find((current) => current.id === projectId);
    return project?.name || 'N/A';
  }

  formatFileSize(sizeBytes?: number): string {
    if (!sizeBytes || sizeBytes <= 0) {
      return '-';
    }

    const kb = sizeBytes / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`;
    }

    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
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
}
