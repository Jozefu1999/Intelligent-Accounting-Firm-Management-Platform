import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { ProjectService } from '../../../core/services/project';
import { Project } from '../../../core/models';

@Component({
  selector: 'app-project-detail',
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './project-detail.html',
  styleUrl: './project-detail.scss',
})
export class ProjectDetail implements OnInit {
  project: Project | null = null;
  isLoading = true;
  errorMessage = '';

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.errorMessage = 'Invalid project ID.';
      this.isLoading = false;
      return;
    }
    this.loadProject(id);
  }

  goBack(): void {
    this.router.navigate(['..'], { relativeTo: this.route });
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'draft': return 'Draft';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'in_progress': return 'status--progress';
      case 'completed': return 'status--completed';
      case 'cancelled': return 'status--cancelled';
      case 'draft': return 'status--draft';
      default: return '';
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'high': return 'priority--high';
      case 'medium': return 'priority--medium';
      case 'low': return 'priority--low';
      default: return '';
    }
  }

  getTypeLabel(type?: string): string {
    switch (type) {
      case 'creation': return 'Creation';
      case 'development': return 'Development';
      case 'audit': return 'Audit';
      case 'consulting': return 'Consulting';
      case 'other': return 'Other';
      default: return 'Not specified';
    }
  }

  formatDate(date?: string): string {
    if (!date) return '—';
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(date));
  }

  getDaysRemaining(): number | null {
    if (!this.project?.due_date) return null;
    const diff = new Date(this.project.due_date).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  private loadProject(id: number): void {
    this.isLoading = true;
    this.projectService.getById(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (project) => {
          this.project = project;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to load project.';
          this.cdr.detectChanges();
        },
      });
  }
}
