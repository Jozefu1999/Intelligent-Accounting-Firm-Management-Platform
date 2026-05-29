import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth';
import { User } from '../../../core/models';

interface DashboardStats {
  totalClients: number;
  totalProjects: number;
  activeProjects: number;
  highRiskProjects: number;
}

interface StatusItem {
  statut: string;
  count: number;
}

interface RiskItem {
  niveau_risque: string;
  count: number;
}

interface DashboardResponse {
  stats: DashboardStats;
  recentProjects: RecentProject[];
  recentClients: RecentClient[];
  projectsByStatus: StatusItem[];
  projectsByRisk: RiskItem[];
}

interface RecentProject {
  id: number;
  titre: string;
  statut: string;
  niveau_risque?: string;
  client_nom?: string;
  created_at?: string;
}

interface RecentClient {
  id: number;
  nom: string;
  secteur?: string;
  statut?: string;
  created_at?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, DatePipe],
  providers: [DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  today = new Date();
  stats: DashboardStats = {
    totalClients: 0,
    totalProjects: 0,
    activeProjects: 0,
    highRiskProjects: 0,
  };
  recentProjects: RecentProject[] = [];
  recentClients: RecentClient[] = [];
  projectsByStatus: StatusItem[] = [];
  projectsByRisk: RiskItem[] = [];
  isLoading = true;
  currentUser: User | null = null;
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.isLoading = true;

    this.http.get<DashboardResponse>(`${environment.apiUrl}/dashboard/stats`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res) => {
          this.stats = res?.stats ?? this.stats;
          this.recentProjects = res?.recentProjects ?? [];
          this.recentClients = res?.recentClients ?? [];
          this.projectsByStatus = res?.projectsByStatus ?? [];
          this.projectsByRisk = res?.projectsByRisk ?? [];
          this.cdr.detectChanges();
        },
        error: () => {
          this.cdr.detectChanges();
        },
      });
  }

  getStatusClass(statut: string): string {
    if (statut === 'en_cours') {
      return 'badge-active';
    }

    if (statut === 'terminé' || statut === 'termine' || statut === 'completed') {
      return 'badge-done';
    }

    if (statut === 'suspendu') {
      return 'badge-paused';
    }

    return 'badge-default';
  }

  getRiskClass(risk: string): string {
    if (risk === 'faible') {
      return 'risk-low';
    }

    if (risk === 'moyen') {
      return 'risk-medium';
    }

    if (risk === 'élevé' || risk === 'eleve' || risk === 'high') {
      return 'risk-high';
    }

    return 'risk-low';
  }

  getStatusLabel(statut: string): string {
    if (statut === 'en_cours') {
      return 'In progress';
    }

    if (statut === 'terminé' || statut === 'termine' || statut === 'completed') {
      return 'Completed';
    }

    if (statut === 'suspendu') {
      return 'Suspended';
    }

    return statut || 'Unknown';
  }

  getRiskLabel(risk: string): string {
    if (risk === 'faible') {
      return 'Low';
    }

    if (risk === 'moyen') {
      return 'Medium';
    }

    if (risk === 'élevé' || risk === 'eleve' || risk === 'high') {
      return 'High';
    }

    return risk || 'Low';
  }

  getClientStatusLabel(status: string): string {
    if (status === 'actif') {
      return 'Active';
    }

    if (status === 'inactif') {
      return 'Inactive';
    }

    return status || 'Active';
  }

  getProgressWidth(count: number, total: number): string {
    return total > 0 ? `${((count / total) * 100).toFixed(0)}%` : '0%';
  }

  getClientInitial(name: string | null | undefined): string {
    if (!name || !name.length) {
      return '?';
    }

    return name.charAt(0).toUpperCase();
  }

  trackByIndex(index: number): number {
    return index;
  }
}
