import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, ViewRef } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { catchError, finalize, forkJoin, of, timeout } from 'rxjs';
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
  warningMessage = '';

  private readonly today = new Date();

  constructor(
    private authService: AuthService,
    private projectService: ProjectService,
    private documentService: DocumentService,
    private cdr: ChangeDetectorRef,
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
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(this.today);
  }

  get assignedProjectsCount(): number {
    return this.projects.length;
  }

  get uploadedDocumentsCount(): number {
    return this.documents.length;
  }

  get inProgressProjectsCount(): number {
    return this.projects.filter((project) => project.status === 'in_progress' || project.status === 'draft').length;
  }

  get completedProjectsCount(): number {
    return this.projects.filter((project) => project.status === 'completed').length;
  }

  get completionRate(): number {
    if (this.assignedProjectsCount === 0) {
      return 0;
    }

    return Math.round((this.completedProjectsCount / this.assignedProjectsCount) * 100);
  }

  get recentProjects(): Project[] {
    return [...this.projects]
      .sort((left, right) => this.toTimestamp(right.created_at || right.updated_at) - this.toTimestamp(left.created_at || left.updated_at))
      .slice(0, 5);
  }

  loadDashboard(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.warningMessage = '';

    forkJoin({
      projects: this.projectService.getAll().pipe(
        timeout(12000),
        catchError(() => {
          this.errorMessage = 'Unable to load assigned projects.';
          return of([] as Project[]);
        }),
      ),
      documents: this.documentService.getAll().pipe(
        timeout(12000),
        catchError(() => {
          this.warningMessage = 'Documents could not be loaded. Statistics show only available data.';
          return of([] as Document[]);
        }),
      ),
    }).pipe(
      finalize(() => {
        this.isLoading = false;
        this.triggerUiUpdate();
      }),
    ).subscribe({
      next: ({ projects, documents }) => {
        this.projects = projects ?? [];
        this.documents = documents ?? [];
        this.triggerUiUpdate();
      },
      error: () => {
        this.errorMessage = 'Unable to load the assistant dashboard.';
        this.triggerUiUpdate();
      },
    });
  }

  getStatusLabel(status: Project['status']): string {
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

  formatDate(value?: string): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
  }

  getStatusBadgeClass(status: Project['status']): string {
    switch (status) {
      case 'completed':
        return 'badge badge--completed';
      case 'cancelled':
        return 'badge badge--suspended';
      default:
        return 'badge badge--in-progress';
    }
  }

  getPriorityBadgeClass(priority: Project['priority']): string {
    switch (priority) {
      case 'high':
        return 'badge badge--priority-high';
      case 'medium':
        return 'badge badge--priority-medium';
      default:
        return 'badge badge--priority-low';
    }
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

  private triggerUiUpdate(): void {
    const view = this.cdr as ViewRef;
    if (!view.destroyed) {
      this.cdr.detectChanges();
    }
  }
}

