import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { ProjectService } from '../../../core/services/project';
import { Project } from '../../../core/models';

@Component({
  selector: 'app-project-list',
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule],
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

  loadProjects(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.projectService.getAll()
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
          this.errorMessage = 'Unable to load projects. Please try again.';
          this.cdr.detectChanges();
        },
      });
  }

  deleteProject(id: number): void {
    if (confirm('Are you sure you want to delete this project?')) {
      this.projectService.delete(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => {
          this.projects = this.projects.filter((p) => p.id !== id);
          this.cdr.detectChanges();
        },
      });
    }
  }
}
