import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { debounceTime, Subject, finalize } from 'rxjs';
import { AssistantService, PlatformAssistant, AssignAssistantProjectPayload } from '../../../core/services/assistant.service';
import { ProjectService } from '../../../core/services/project';
import { Project } from '../../../core/models';

@Component({
  selector: 'app-assistant-list',
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  templateUrl: './assistant-list.html',
  styleUrl: './assistant-list.scss',
})
export class AssistantList implements OnInit {
  assistants: PlatformAssistant[] = [];
  filteredAssistants: PlatformAssistant[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  searchQuery = '';

  // Expanded row
  expandedAssistantId: number | null = null;

  // Assign project modal
  showAssignModal = false;
  assignTarget: PlatformAssistant | null = null;
  selectedProjectId: number | null = null;
  availableProjects: Project[] = [];
  isAssigning = false;
  assignError = '';

  // Unassign
  unassigningProjectId: number | null = null;

  private readonly destroyRef = inject(DestroyRef);
  private searchSubject = new Subject<string>();

  constructor(
    private assistantService: AssistantService,
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadAssistants();

    this.searchSubject.pipe(
      debounceTime(300),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.applyFilters();
    });
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchQuery);
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.applyFilters();
  }

  toggleExpand(assistant: PlatformAssistant): void {
    this.expandedAssistantId = this.expandedAssistantId === assistant.id ? null : assistant.id;
    this.cdr.detectChanges();
  }

  openAssignModal(assistant: PlatformAssistant): void {
    this.assignTarget = assistant;
    this.selectedProjectId = null;
    this.assignError = '';
    this.showAssignModal = true;

    this.projectService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (projects) => {
          const assignedIds = assistant.projects.map(p => p.id);
          this.availableProjects = projects.filter(p => !assignedIds.includes(p.id));
          this.cdr.detectChanges();
        },
        error: () => {
          this.availableProjects = [];
          this.cdr.detectChanges();
        },
      });

    this.cdr.detectChanges();
  }

  closeAssignModal(): void {
    this.showAssignModal = false;
    this.assignTarget = null;
    this.cdr.detectChanges();
  }

  submitAssignProject(): void {
    if (!this.assignTarget || !this.selectedProjectId) {
      this.assignError = 'Please select a project to assign.';
      this.cdr.detectChanges();
      return;
    }

    this.isAssigning = true;
    this.assignError = '';

    const payload: AssignAssistantProjectPayload = {
      assistant_id: this.assignTarget.id,
      project_id: this.selectedProjectId,
    };

    this.assistantService.assignProject(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isAssigning = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          const projectName = this.availableProjects.find(p => p.id === this.selectedProjectId)?.name || 'Project';
          this.successMessage = `"${projectName}" assigned successfully.`;
          this.closeAssignModal();
          this.loadAssistants();
        },
        error: (err) => {
          this.assignError = err.error?.message || 'Failed to assign project.';
          this.cdr.detectChanges();
        },
      });
  }

  unassignProject(assistant: PlatformAssistant, projectId: number, projectName: string): void {
    this.unassigningProjectId = projectId;
    this.cdr.detectChanges();

    this.assistantService.unassignProject(projectId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.unassigningProjectId = null;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.successMessage = `"${projectName}" removed from ${assistant.first_name} ${assistant.last_name}.`;
          this.loadAssistants();
        },
        error: () => {
          this.errorMessage = 'Failed to unassign project. Please try again.';
          this.cdr.detectChanges();
        },
      });
  }

  clearSuccessMessage(): void {
    this.successMessage = '';
    this.cdr.detectChanges();
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  }

  private loadAssistants(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.assistantService.getPlatformAssistants()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (data) => {
          this.assistants = data ?? [];
          this.applyFilters();
          this.cdr.detectChanges();
        },
        error: () => {
          this.assistants = [];
          this.filteredAssistants = [];
          this.errorMessage = 'Unable to load assistants. Please try again.';
          this.cdr.detectChanges();
        },
      });
  }

  private applyFilters(): void {
    let result = [...this.assistants];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter((a) =>
        a.first_name.toLowerCase().includes(q) ||
        a.last_name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q)
      );
    }

    this.filteredAssistants = result;
    this.cdr.detectChanges();
  }
}
