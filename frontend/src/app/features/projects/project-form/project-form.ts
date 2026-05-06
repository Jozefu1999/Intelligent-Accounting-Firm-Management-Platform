import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { finalize, timeout } from 'rxjs';
import { Client, Project } from '../../../core/models';
import { ClientService } from '../../../core/services/client';
import { ProjectService } from '../../../core/services/project';

@Component({
  selector: 'app-project-form',
  imports: [CommonModule, FormsModule, RouterModule, MatButtonModule, MatIconModule],
  templateUrl: './project-form.html',
  styleUrl: './project-form.scss',
})
export class ProjectForm implements OnInit {
  clients: Client[] = [];

  listRoute = '/projects';
  isAssistantContext = false;

  selectedClientId = '';
  name = '';
  description = '';
  type: Project['type'] = 'creation';
  status: Project['status'] = 'draft';
  priority: Project['priority'] = 'medium';
  startDate = '';
  dueDate = '';

  isEditMode = false;
  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  private readonly destroyRef = inject(DestroyRef);

  private projectId: number | null = null;

  constructor(
    private readonly projectService: ProjectService,
    private readonly clientService: ClientService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.isAssistantContext = this.router.url.startsWith('/assistant/');
    this.listRoute = this.isAssistantContext ? '/assistant/projets' : '/projects';

    this.loadClients();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      return;
    }

    const parsedId = Number(idParam);
    if (Number.isNaN(parsedId)) {
      this.errorMessage = 'Invalid project identifier.';
      this.cdr.detectChanges();
      return;
    }

    this.projectId = parsedId;
    this.isEditMode = true;
    this.loadProject(parsedId);
  }

  onSubmit(): void {
    if (this.isSubmitting) {
      return;
    }

    const validationError = this.getValidationError();
    if (validationError) {
      this.errorMessage = validationError;
      return;
    }

    const payload: Partial<Project> = {
      client_id: Number(this.selectedClientId),
      name: this.name.trim(),
      description: this.description.trim() || undefined,
      type: this.type,
      status: this.status,
      priority: this.priority,
      start_date: this.startDate || undefined,
      due_date: this.dueDate || undefined,
    };

    this.errorMessage = '';
    this.isSubmitting = true;

    if (this.isEditMode && this.projectId) {
      this.projectService.update(this.projectId, payload)
        .pipe(
          timeout(15000),
          takeUntilDestroyed(this.destroyRef),
          finalize(() => {
            this.isSubmitting = false;
            this.cdr.detectChanges();
          }),
        )
        .subscribe({
          next: () => {
            this.router.navigateByUrl(this.listRoute);
            this.cdr.detectChanges();
          },
          error: (error) => {
            this.errorMessage = this.extractErrorMessage(error, 'Unable to update project.');
            this.cdr.detectChanges();
          },
        });

      return;
    }

    this.projectService.create(payload)
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.router.navigateByUrl(this.listRoute);
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.errorMessage = this.extractErrorMessage(error, 'Unable to create project.');
          this.cdr.detectChanges();
        },
      });
  }

  private loadClients(): void {
    const clientsRequest = this.clientService.getAll();

    clientsRequest
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (clients) => {
          this.clients = clients ?? [];

          if (this.clients.length === 0) {
            this.errorMessage = this.isAssistantContext
              ? 'No client account is available for project assignment.'
              : 'No client account is available for project assignment.';
          }

          this.cdr.detectChanges();
        },
        error: (error) => {
          this.errorMessage = this.extractErrorMessage(error, 'Unable to load clients for project assignment.');
          this.cdr.detectChanges();
        },
      });
  }

  private loadProject(id: number): void {
    this.isLoading = true;
    this.errorMessage = '';

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
          this.selectedClientId = String(project.client_id);
          this.name = project.name ?? '';
          this.description = project.description ?? '';
          this.type = project.type ?? 'creation';
          this.status = project.status ?? 'draft';
          this.priority = project.priority ?? 'medium';
          this.startDate = project.start_date ?? '';
          this.dueDate = project.due_date ?? '';
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.errorMessage = this.extractErrorMessage(error, 'Unable to load project.');
          this.cdr.detectChanges();
        },
      });
  }

  private getValidationError(): string {
    if (!this.selectedClientId) {
      return 'Please select a client.';
    }

    if (!this.name.trim()) {
      return 'Project name is required.';
    }

    return '';
  }

  private extractErrorMessage(error: unknown, fallbackMessage: string): string {
    if (typeof error === 'object' && error !== null && 'name' in error) {
      const timeoutError = error as { name?: string };
      if (timeoutError.name === 'TimeoutError') {
        return 'Request timed out. Please check your server and try again.';
      }
    }

    if (typeof error === 'object' && error !== null && 'status' in error) {
      const httpError = error as { status?: number };
      if (httpError.status === 0) {
        return 'Cannot connect to server. Make sure backend is running on http://localhost:3000.';
      }
    }

    if (typeof error === 'object' && error !== null && 'error' in error) {
      const apiError = (error as {
        error?: { message?: string; errors?: Array<{ msg?: string }> };
      }).error;

      const firstValidationError = apiError?.errors?.[0]?.msg;
      if (typeof firstValidationError === 'string' && firstValidationError.trim()) {
        return firstValidationError;
      }

      if (typeof apiError?.message === 'string' && apiError.message.trim()) {
        return apiError.message;
      }
    }

    return fallbackMessage;
  }
}
