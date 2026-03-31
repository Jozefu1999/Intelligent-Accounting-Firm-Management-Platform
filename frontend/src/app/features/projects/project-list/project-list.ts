import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ProjectForm } from '../project-form/project-form';

@Component({
  selector: 'app-project-list',
  imports: [CommonModule, MatButtonModule, ProjectForm],
  templateUrl: './project-list.html',
  styleUrl: './project-list.scss',
})
export class ProjectList implements OnInit {
  projects: any[] = [];
  clients: any[] = [];
  showModal = false;
  selectedProject: any = null;
  isLoading = false;
  errorMessage = '';
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadProjects();
    this.loadClients();
  }

  loadProjects(): void {
    this.http.get<any[]>(`${this.apiUrl}/projects`, this.authOptions()).subscribe({
      next: (response) => {
        this.projects = (response ?? []).map((project) => this.normalizeProject(project));
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Erreur lors du chargement des projets.';
      },
    });
  }

  loadClients(): void {
    this.http.get<any[]>(`${this.apiUrl}/clients`, this.authOptions()).subscribe({
      next: (response) => {
        this.clients = (response ?? []).map((client) => ({
          ...client,
          nom: client.nom ?? client.company_name ?? '',
        }));
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Erreur lors du chargement des clients.';
      },
    });
  }

  openAddModal(): void {
    this.selectedProject = null;
    this.showModal = true;
    this.errorMessage = '';
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedProject = null;
  }

  onFormSubmit(formValue: any): void {
    this.isLoading = true;
    this.errorMessage = '';

    const payload = this.toApiPayload(formValue);
    const request$ = this.selectedProject !== null
      ? this.http.put<any>(`${this.apiUrl}/projects/${this.selectedProject.id}`, payload, this.authOptions())
      : this.http.post<any>(`${this.apiUrl}/projects`, payload, this.authOptions());

    request$
      .pipe(finalize(() => {
        this.isLoading = false;
      }))
      .subscribe({
        next: () => {
          this.closeModal();
          this.loadProjects();
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'Une erreur est survenue.';
        },
      });
  }

  deleteProject(id: number): void {
    if (confirm('Supprimer ce projet ?')) {
      this.http.delete<void>(`${this.apiUrl}/projects/${id}`, this.authOptions()).subscribe({
        next: () => this.loadProjects(),
        error: (error) => {
          this.errorMessage = error?.error?.message || 'Erreur lors de la suppression du projet.';
        },
      });
    }
  }

  openEditModal(project: any): void {
    this.selectedProject = { ...project };
    this.showModal = true;
    this.errorMessage = '';
  }

  private authOptions(): { headers: HttpHeaders } {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${localStorage.getItem('token') ?? ''}`,
      }),
    };
  }

  private normalizeProject(project: any): any {
    return {
      ...project,
      titre: project.titre ?? project.name ?? '',
      client_nom: project.client_nom ?? project.client?.nom ?? project.client?.company_name ?? '',
      type: this.typeFromApi(project.type),
      statut: project.statut ?? this.statusFromApi(project.status),
      priority: this.priorityFromApi(project.priority),
    };
  }

  private toApiPayload(formValue: any): any {
    return {
      name: formValue.titre,
      description: formValue.description,
      type: this.typeToApi(formValue.type),
      status: this.statusToApi(formValue.statut),
      priority: this.priorityToApi(formValue.priority),
      client_id: Number(formValue.client_id),
    };
  }

  private typeFromApi(type: string | null | undefined): string {
    switch (type) {
      case 'audit':
        return 'audit';
      case 'consulting':
      case 'development':
        return 'conseil';
      case 'creation':
        return 'comptabilite';
      case 'other':
      default:
        return 'fiscalite';
    }
  }

  private typeToApi(type: string | null | undefined): string {
    switch (type) {
      case 'audit':
        return 'audit';
      case 'comptabilite':
        return 'creation';
      case 'conseil':
        return 'consulting';
      case 'fiscalite':
      case 'juridique':
      default:
        return 'other';
    }
  }

  private statusFromApi(status: string | null | undefined): string {
    switch (status) {
      case 'completed':
        return 'terminé';
      case 'cancelled':
        return 'suspendu';
      case 'in_progress':
      case 'draft':
      default:
        return 'en_cours';
    }
  }

  private statusToApi(status: string | null | undefined): string {
    switch (status) {
      case 'terminé':
        return 'completed';
      case 'suspendu':
        return 'cancelled';
      case 'en_cours':
      default:
        return 'in_progress';
    }
  }

  private priorityFromApi(priority: string | null | undefined): string {
    switch (priority) {
      case 'low':
        return 'faible';
      case 'high':
        return 'élevée';
      case 'medium':
      default:
        return 'moyenne';
    }
  }

  private priorityToApi(priority: string | null | undefined): string {
    switch (priority) {
      case 'faible':
        return 'low';
      case 'élevée':
      case 'critique':
        return 'high';
      case 'moyenne':
      default:
        return 'medium';
    }
  }
}
