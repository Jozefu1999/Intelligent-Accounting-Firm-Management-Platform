import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, ViewRef, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { catchError, finalize, forkJoin, of, timeout } from 'rxjs';
import { Client, Document, Project } from '../../../core/models';
import { ClientService } from '../../../core/services/client';
import { DocumentService } from '../../../core/services/document';
import { ProjectService } from '../../../core/services/project';

type UiStatus = 'en_cours' | 'termine' | 'suspendu';
type ProjectType = NonNullable<Project['type']>;

@Component({
  selector: 'app-assistant-projets-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './assistant-projets.component.html',
  styleUrl: './assistant-projets.component.css',
})
export class AssistantProjetsComponent implements OnInit {
  projects: Project[] = [];
  documents: Document[] = [];
  clients: Client[] = [];

  private readonly formBuilder = inject(FormBuilder);

  isLoading = false;
  showModal = false;
  showCreateModal = false;
  isCreating = false;
  selectedProject: Project | null = null;
  selectedProjectDocuments: Document[] = [];
  searchTerm = '';

  errorMessage = '';
  successMessage = '';
  documentsWarningMessage = '';

  readonly createProjectForm = this.formBuilder.nonNullable.group({
    clientId: ['', [Validators.required]],
    name: ['', [Validators.required, Validators.maxLength(255)]],
    type: ['development' as ProjectType, [Validators.required]],
    status: ['in_progress' as Project['status'], [Validators.required]],
    priority: ['medium' as Project['priority'], [Validators.required]],
    startDate: [''],
    dueDate: [''],
    description: [''],
  });

  readonly statusOptions: ReadonlyArray<{ label: string; value: UiStatus }> = [
    { label: 'En cours', value: 'en_cours' },
    { label: 'Termine', value: 'termine' },
    { label: 'Suspendu', value: 'suspendu' },
  ];

  readonly createStatusOptions: ReadonlyArray<{ label: string; value: Project['status'] }> = [
    { label: 'Brouillon', value: 'draft' },
    { label: 'En cours', value: 'in_progress' },
    { label: 'Termine', value: 'completed' },
    { label: 'Suspendu', value: 'cancelled' },
  ];

  readonly projectTypeOptions: ReadonlyArray<{ label: string; value: ProjectType }> = [
    { label: 'Creation', value: 'creation' },
    { label: 'Developpement', value: 'development' },
    { label: 'Audit', value: 'audit' },
    { label: 'Conseil', value: 'consulting' },
    { label: 'Autre', value: 'other' },
  ];

  readonly projectPriorityOptions: ReadonlyArray<{ label: string; value: Project['priority'] }> = [
    { label: 'Haute', value: 'high' },
    { label: 'Moyenne', value: 'medium' },
    { label: 'Basse', value: 'low' },
  ];

  constructor(
    private projectService: ProjectService,
    private documentService: DocumentService,
    private clientService: ClientService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadProjects();
    this.loadClients();
  }

  get displayedProjects(): Project[] {
    const query = this.searchTerm.trim().toLowerCase();
    if (!query) {
      return this.projects;
    }

    return this.projects.filter((project) => {
      const name = project.name.toLowerCase();
      const client = (project.client?.company_name ?? '').toLowerCase();
      const type = (project.type ?? '').toLowerCase();
      const status = this.getStatusLabel(project.status).toLowerCase();

      return name.includes(query) || client.includes(query) || type.includes(query) || status.includes(query);
    });
  }

  loadProjects(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.documentsWarningMessage = '';

    forkJoin({
      projects: this.projectService.getAll().pipe(
        timeout(12000),
        catchError(() => {
          this.errorMessage = 'Impossible de charger les projets assignes.';
          return of([] as Project[]);
        }),
      ),
      documents: this.documentService.getAll().pipe(
        timeout(12000),
        catchError(() => {
          this.documentsWarningMessage = 'Les documents n ont pas pu etre charges. Le reste de la page reste disponible.';
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
        this.errorMessage = 'Impossible de charger les projets assignes.';
        this.triggerUiUpdate();
      },
    });
  }

  loadClients(): void {
    this.clientService.getAll().subscribe({
      next: (clients) => {
        this.clients = clients ?? [];
        this.triggerUiUpdate();
      },
      error: () => {
        this.clients = [];
        this.triggerUiUpdate();
      },
    });
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.searchTerm = input?.value ?? '';
  }

  openCreateModal(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.resetCreateForm();
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    if (this.isCreating) {
      return;
    }

    this.showCreateModal = false;
  }

  createProject(): void {
    if (this.isCreating) {
      return;
    }

    if (this.createProjectForm.invalid) {
      this.createProjectForm.markAllAsTouched();
      this.errorMessage = 'Veuillez remplir les champs obligatoires du projet.';
      return;
    }

    const rawValue = this.createProjectForm.getRawValue();
    const clientId = Number(rawValue.clientId);

    if (Number.isNaN(clientId) || clientId <= 0) {
      this.errorMessage = 'Veuillez choisir un client valide.';
      return;
    }

    const payload: Partial<Project> = {
      client_id: clientId,
      name: rawValue.name.trim(),
      description: rawValue.description.trim() || undefined,
      type: rawValue.type,
      status: rawValue.status,
      priority: rawValue.priority,
      start_date: rawValue.startDate || undefined,
      due_date: rawValue.dueDate || undefined,
    };

    this.isCreating = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.projectService.create(payload)
      .pipe(finalize(() => {
        this.isCreating = false;
        this.triggerUiUpdate();
      }))
      .subscribe({
        next: () => {
          this.showCreateModal = false;
          this.successMessage = 'Projet cree avec succes.';
          this.loadProjects();
          this.triggerUiUpdate();
        },
        error: () => {
          this.errorMessage = 'Impossible de creer le projet.';
          this.triggerUiUpdate();
        },
      });
  }

  openModal(project: Project): void {
    this.selectedProject = project;
    this.selectedProjectDocuments = this.documents.filter((document) => document.project_id === project.id);
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedProject = null;
    this.selectedProjectDocuments = [];
  }

  updateStatus(project: Project, rawValue: string): void {
    const nextUiStatus = this.toUiStatus(rawValue);
    if (!nextUiStatus) {
      return;
    }

    const nextApiStatus = this.toApiStatus(nextUiStatus);
    if (nextApiStatus === project.status) {
      return;
    }

    const previousStatus = project.status;
    project.status = nextApiStatus;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      status: nextApiStatus,
      statut: nextUiStatus,
    } as unknown as Partial<Project>;

    this.projectService.update(project.id, payload).subscribe({
      next: (updatedProject) => {
        project.status = updatedProject?.status ?? nextApiStatus;
        this.successMessage = 'Statut mis a jour avec succes.';

        if (this.selectedProject?.id === project.id) {
          this.selectedProject = { ...project };
        }

        this.triggerUiUpdate();
      },
      error: () => {
        project.status = previousStatus;
        this.errorMessage = 'Echec de mise a jour du statut du projet.';
        this.triggerUiUpdate();
      },
    });
  }

  getStatusAlias(status: Project['status']): UiStatus {
    switch (status) {
      case 'completed':
        return 'termine';
      case 'cancelled':
        return 'suspendu';
      default:
        return 'en_cours';
    }
  }

  getStatusLabel(status: Project['status'] | undefined): string {
    switch (status) {
      case 'in_progress':
        return 'En cours';
      case 'completed':
        return 'Termine';
      case 'cancelled':
        return 'Suspendu';
      case 'draft':
        return 'Brouillon';
      default:
        return '-';
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
        return '-';
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
      default:
        return 'priority-pill priority-pill--low';
    }
  }

  isFieldInvalid(fieldName: 'clientId' | 'name'): boolean {
    const field = this.createProjectForm.controls[fieldName];
    return field.invalid && (field.dirty || field.touched);
  }

  getRiskLabel(project: Project): string {
    if (project.risk_score === null || project.risk_score === undefined) {
      return 'N/A';
    }

    return String(project.risk_score);
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

  private toUiStatus(rawValue: string): UiStatus | null {
    return this.statusOptions.some((option) => option.value === rawValue)
      ? (rawValue as UiStatus)
      : null;
  }

  private toApiStatus(uiStatus: UiStatus): Project['status'] {
    switch (uiStatus) {
      case 'termine':
        return 'completed';
      case 'suspendu':
        return 'cancelled';
      default:
        return 'in_progress';
    }
  }

  private resetCreateForm(): void {
    this.createProjectForm.reset({
      clientId: '',
      name: '',
      type: 'development',
      status: 'in_progress',
      priority: 'medium',
      startDate: '',
      dueDate: '',
      description: '',
    });
  }

  private triggerUiUpdate(): void {
    const view = this.cdr as ViewRef;
    if (!view.destroyed) {
      this.cdr.detectChanges();
    }
  }
}
