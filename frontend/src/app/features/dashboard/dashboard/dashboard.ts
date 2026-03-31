import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';

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
  stats = {
    totalClients: 0,
    totalProjects: 0,
    activeProjects: 0,
    highRiskProjects: 0,
  };
  recentProjects: any[] = [];
  recentClients: any[] = [];
  projectsByStatus: any[] = [];
  projectsByRisk: any[] = [];
  isLoading = true;
  currentUser: any = null;
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        this.currentUser = {
          ...parsedUser,
          prenom: parsedUser.prenom ?? parsedUser.first_name ?? '',
          nom: parsedUser.nom ?? parsedUser.last_name ?? '',
        };
      } catch {
        this.currentUser = null;
      }
    }

    this.loadDashboard();
  }

  loadDashboard(): void {
    this.isLoading = true;

    this.http.get<any>(`${environment.apiUrl}/dashboard/stats`)
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
        error: (err) => {
          console.error(err);
          this.cdr.detectChanges();
        },
      });
  }

  getStatusClass(statut: string): string {
    if (statut === 'en_cours') {
      return 'badge-active';
    }

    if (statut === 'terminé') {
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

    if (risk === 'élevé') {
      return 'risk-high';
    }

    return 'risk-low';
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
}
