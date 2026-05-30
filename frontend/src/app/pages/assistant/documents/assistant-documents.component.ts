import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, ViewRef } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { catchError, finalize, of, timeout } from 'rxjs';
import { Document, Project } from '../../../core/models';
import { DocumentService } from '../../../core/services/document';
import { ProjectService } from '../../../core/services/project';

@Component({
  selector: 'app-assistant-documents-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './assistant-documents.component.html',
  styleUrl: './assistant-documents.component.css',
})
export class AssistantDocumentsComponent implements OnInit {
  documents: Document[] = [];
  projects: Project[] = [];

  showUploadModal = false;
  isLoading = false;
  isUploading = false;

  // Preview
  showPreviewModal = false;
  previewDocument: Document | null = null;
  previewUrl: SafeResourceUrl | null = null;
  previewLoading = false;
  previewType: 'pdf' | 'image' | 'unsupported' = 'unsupported';

  selectedFile: File | null = null;
  selectedProjectId: number | null = null;

  errorMessage = '';
  successMessage = '';
  projectWarningMessage = '';

  // Filter
  filterProject: number | null = null;
  searchTerm = '';

  private rawPreviewUrl: string | null = null;

  constructor(
    private documentService: DocumentService,
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.loadDocuments();
    this.loadProjects();
  }

  get filteredDocuments(): Document[] {
    let docs = this.documents;
    if (this.filterProject) {
      docs = docs.filter(d => d.project_id === this.filterProject);
    }
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      docs = docs.filter(d => d.name.toLowerCase().includes(term));
    }
    return docs;
  }

  get totalSize(): number {
    return this.documents.reduce((sum, d) => sum + (d.size_bytes || 0), 0);
  }

  loadDocuments(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.documentService.getAll().pipe(
      timeout(12000),
      catchError(() => {
        this.errorMessage = 'Unable to load documents.';
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
        this.errorMessage = 'Unable to load documents.';
        this.triggerUiUpdate();
      },
    });
  }

  loadProjects(): void {
    this.projectWarningMessage = '';

    this.projectService.getAll().pipe(
      timeout(12000),
      catchError(() => {
        this.projectWarningMessage = 'The project list could not be loaded.';
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

  closeUploadModal(): void {
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
      this.errorMessage = 'Please select a project and a file.';
      return;
    }

    this.isUploading = true;
    this.errorMessage = '';

    this.documentService.upload(this.selectedFile, { project_id: this.selectedProjectId }).subscribe({
      next: () => {
        this.successMessage = 'Document uploaded successfully.';
        this.closeUploadModal();
        this.loadDocuments();
        this.triggerUiUpdate();
      },
      error: () => {
        this.errorMessage = 'Document upload failed.';
        this.isUploading = false;
        this.triggerUiUpdate();
      },
    });
  }

  openPreview(doc: Document): void {
    this.previewDocument = doc;
    this.previewType = this.getPreviewType(doc.mime_type);
    this.showPreviewModal = true;
    this.previewUrl = null;
    this.previewLoading = true;
    this.triggerUiUpdate();

    if (this.previewType === 'unsupported') {
      this.previewLoading = false;
      this.triggerUiUpdate();
      return;
    }

    this.documentService.preview(doc.id).subscribe({
      next: (blob) => {
        this.rawPreviewUrl = URL.createObjectURL(blob);
        this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.rawPreviewUrl);
        this.previewLoading = false;
        this.triggerUiUpdate();
      },
      error: () => {
        this.previewType = 'unsupported';
        this.previewLoading = false;
        this.triggerUiUpdate();
      },
    });
  }

  closePreview(): void {
    if (this.rawPreviewUrl) {
      URL.revokeObjectURL(this.rawPreviewUrl);
    }
    this.showPreviewModal = false;
    this.previewDocument = null;
    this.previewUrl = null;
    this.rawPreviewUrl = null;
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
        this.errorMessage = 'Unable to download the document.';
        this.triggerUiUpdate();
      },
    });
  }

  deleteDocument(doc: Document): void {
    if (!confirm(`Delete "${doc.name}"? This action cannot be undone.`)) return;

    this.documentService.delete(doc.id).subscribe({
      next: () => {
        this.successMessage = `"${doc.name}" deleted successfully.`;
        this.documents = this.documents.filter(d => d.id !== doc.id);
        this.triggerUiUpdate();
      },
      error: () => {
        this.errorMessage = 'Unable to delete the document.';
        this.triggerUiUpdate();
      },
    });
  }

  getProjectName(projectId?: number): string {
    if (!projectId) return 'No project';
    const project = this.projects.find((p) => p.id === projectId);
    return project?.name || 'Unknown';
  }

  getFileIcon(mimeType?: string): string {
    if (!mimeType) return 'insert_drive_file';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'picture_as_pdf';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'table_chart';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'description';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return 'folder_zip';
    return 'insert_drive_file';
  }

  getFileIconColor(mimeType?: string): string {
    if (!mimeType) return 'text-slate-400';
    if (mimeType.startsWith('image/')) return 'text-purple-500';
    if (mimeType === 'application/pdf') return 'text-red-500';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'text-green-600';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'text-blue-600';
    return 'text-slate-400';
  }

  getFileExtension(name: string): string {
    const parts = name.split('.');
    return parts.length > 1 ? parts.pop()!.toUpperCase() : '?';
  }

  isPreviewable(mimeType?: string): boolean {
    if (!mimeType) return false;
    return mimeType === 'application/pdf' || mimeType.startsWith('image/');
  }

  formatFileSize(sizeBytes?: number): string {
    if (!sizeBytes || sizeBytes <= 0) return '-';
    const kb = sizeBytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }

  formatDate(value?: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
  }

  private getPreviewType(mimeType?: string): 'pdf' | 'image' | 'unsupported' {
    if (!mimeType) return 'unsupported';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('image/')) return 'image';
    return 'unsupported';
  }

  private triggerUiUpdate(): void {
    const view = this.cdr as ViewRef;
    if (!view.destroyed) {
      this.cdr.detectChanges();
    }
  }
}

