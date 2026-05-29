import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { debounceTime, Subject, finalize } from 'rxjs';
import { ClientService, PlatformClient, AssignProjectPayload } from '../../../core/services/client';
import { ProjectService } from '../../../core/services/project';
import { Project } from '../../../core/models';

@Component({
  selector: 'app-client-list',
  imports: [CommonModule, FormsModule, RouterModule, MatButtonModule, MatIconModule],
  templateUrl: './client-list.html',
  styleUrl: './client-list.scss',
})
export class ClientList implements OnInit {
  clients: PlatformClient[] = [];
  filteredClients: PlatformClient[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  searchQuery = '';
  statusFilter = '';

  // Expanded client rows
  expandedClientId: number | null = null;

  // Assign project modal
  showAssignModal = false;
  assignTarget: PlatformClient | null = null;
  selectedProjectId: number | null = null;
  availableProjects: Project[] = [];
  isAssigning = false;
  assignError = '';

  // Unassign
  unassigningProjectId: number | null = null;

  private readonly destroyRef = inject(DestroyRef);
  private searchSubject = new Subject<string>();

  constructor(
    private clientService: ClientService,
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadClients();

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

  onStatusFilterChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.statusFilter = '';
    this.applyFilters();
  }

  toggleExpand(client: PlatformClient): void {
    this.expandedClientId = this.expandedClientId === client.id ? null : client.id;
    this.cdr.detectChanges();
  }

  openAssignModal(client: PlatformClient): void {
    this.assignTarget = client;
    this.selectedProjectId = null;
    this.assignError = '';
    this.showAssignModal = true;

    // Load available projects (exclude already assigned to this client)
    this.projectService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (projects) => {
          const assignedIds = client.projects.map(p => p.id);
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

    const payload: AssignProjectPayload = {
      user_id: this.assignTarget.id,
      project_id: this.selectedProjectId,
    };

    this.clientService.assignProject(payload)
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
          this.loadClients();
        },
        error: (err) => {
          this.assignError = err.error?.message || 'Failed to assign project.';
          this.cdr.detectChanges();
        },
      });
  }

  unassignProject(client: PlatformClient, projectId: number, projectName: string): void {
    this.unassigningProjectId = projectId;
    this.cdr.detectChanges();

    this.clientService.unassignProject(projectId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.unassigningProjectId = null;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.successMessage = `"${projectName}" removed from ${client.first_name} ${client.last_name}.`;
          this.loadClients();
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

  getStatusLabel(status: string): string {
    switch (status) {
      case 'active': return 'Active';
      case 'registered': return 'Registered';
      case 'pending': return 'Pending';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'badge-active';
      case 'registered': return 'badge-registered';
      case 'pending': return 'badge-pending';
      default: return '';
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  }

  private loadClients(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.clientService.getPlatformClients()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (data) => {
          this.clients = data ?? [];
          this.applyFilters();
          this.cdr.detectChanges();
        },
        error: () => {
          this.clients = [];
          this.filteredClients = [];
          this.errorMessage = 'Unable to load clients. Please try again.';
          this.cdr.detectChanges();
        },
      });
  }

  private applyFilters(): void {
    let result = [...this.clients];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter((c) =>
        c.first_name.toLowerCase().includes(q) ||
        c.last_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      );
    }

    if (this.statusFilter) {
      result = result.filter((c) => c.status === this.statusFilter);
    }

    this.filteredClients = result;
    this.cdr.detectChanges();
  }
}
