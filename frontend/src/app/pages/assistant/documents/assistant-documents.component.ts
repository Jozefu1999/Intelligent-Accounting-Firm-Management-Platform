import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, ViewRef } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { catchError, finalize, of, timeout } from 'rxjs';
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
  projectWarningMessage = '';

  constructor(
    private documentService: DocumentService,
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadDocuments();
    this.loadProjects();
  }

  loadDocuments(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.documentService.getAll().pipe(
      timeout(12000),
      catchError(() => {
        this.errorMessage = 'Impossible de charger les documents.';
        return of([] as Document[]);
      }),
      finalize(() => {
        this.isLoading = false;
        this.triggerUiUpdate();
      }),
    ).subscribe({
      next: (documents) => {
        this.documents = documents ?? [];
        this.triggerUiUpdate();
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les documents.';
        this.triggerUiUpdate();
      },
    });
  }

  loadProjects(): void {
    this.projectWarningMessage = '';

    this.projectService.getAll().pipe(
      timeout(12000),
      catchError(() => {
        this.projectWarningMessage = 'La liste des projets n a pas pu etre chargee. L upload peut etre limite.';
        return of([] as Project[]);
      }),
    ).subscribe({
      next: (projects) => {
        this.projects = projects ?? [];
        this.triggerUiUpdate();
      },
      error: () => {
        this.projects = [];
        this.triggerUiUpdate();
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
        this.triggerUiUpdate();
      },
      error: () => {
        this.errorMessage = 'Echec de l upload du document.';
        this.isUploading = false;
        this.triggerUiUpdate();
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
        this.triggerUiUpdate();
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

  private triggerUiUpdate(): void {
    const view = this.cdr as ViewRef;
    if (!view.destroyed) {
      this.cdr.detectChanges();
    }
  }
}
