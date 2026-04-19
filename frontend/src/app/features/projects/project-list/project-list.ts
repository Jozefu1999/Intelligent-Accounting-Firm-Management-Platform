import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { finalize, timeout } from 'rxjs';
import { ProjectService } from '../../../core/services/project';
import { Project } from '../../../core/models';

@Component({
  selector: 'app-project-list',
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './project-list.html',
  styleUrl: './project-list.scss',
})
export class ProjectList implements OnInit {
  projects: Project[] = [];
  isLoading = false;
  errorMessage = '';
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef,
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

  get cancelledProjectsCount(): number {
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

    this.projectService.getAll()
      .pipe(timeout(12000))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (data) => {
          this.projects = data ?? [];
          this.cdr.detectChanges();
        },
        error: () => {
          this.projects = [];
          this.errorMessage = 'Impossible de charger les projets. Veuillez reessayer.';
          this.cdr.detectChanges();
        },
      });
  }

  deleteProject(id: number): void {
    if (!confirm('Voulez-vous vraiment supprimer ce projet ?')) {
      return;
    }

    this.projectService.delete(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.projects = this.projects.filter((project) => project.id !== id);
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'La suppression du projet a echoue.';
          this.cdr.detectChanges();
        },
      });
  }

  trackByProjectId(_index: number, project: Project): number {
    return project.id;
  }

  getStatusLabel(status: Project['status'] | undefined): string {
    switch (status) {
      case 'in_progress':
        return 'En cours';
      case 'completed':
        return 'Termine';
      case 'cancelled':
        return 'Annule';
      case 'draft':
        return 'Brouillon';
      default:
        return 'Inconnu';
    }
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
        return 'N/A';
    }
  }

  getTypeLabel(type: Project['type'] | undefined): string {
    switch (type) {
      case 'creation':
        return 'Creation';
      case 'development':
        return 'Developpement';
      case 'audit':
        return 'Audit';
      case 'consulting':
        return 'Conseil';
      case 'other':
        return 'Autre';
      default:
        return 'N/A';
    }
  }

  getStatusPillClass(status: Project['status'] | undefined): string {
    switch (status) {
      case 'completed':
        return 'status-pill status-pill--completed';
      case 'cancelled':
        return 'status-pill status-pill--cancelled';
      case 'draft':
        return 'status-pill status-pill--draft';
      default:
        return 'status-pill status-pill--progress';
    }
  }

  getPriorityPillClass(priority: Project['priority'] | undefined): string {
    switch (priority) {
      case 'high':
        return 'priority-pill priority-pill--high';
      case 'medium':
        return 'priority-pill priority-pill--medium';
      case 'low':
        return 'priority-pill priority-pill--low';
      default:
        return 'priority-pill priority-pill--low';
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

  getMostRecentDate(project: Project): string {
    return this.formatDate(project.updated_at || project.updatedAt || project.created_at || project.createdAt);
  }
}
