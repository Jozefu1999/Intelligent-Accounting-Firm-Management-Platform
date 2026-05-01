import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../../core/services/admin';
import { MlModelInfo, MlStatusResponse } from '../../../core/models';

@Component({
  selector: 'app-admin-ml-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-ml.component.html',
  styleUrl: './admin-ml.component.css',
})
export class AdminMlComponent implements OnInit {
  models: MlModelInfo[] = [];
  isLoading = true;
  retrainingModel: string | null = null;
  successMessage = '';
  errorMessage = '';

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadStatus();
  }

  loadStatus(): void {
    this.isLoading = true;
    this.adminService.getMlStatus().subscribe({
      next: (res: MlStatusResponse) => {
        this.models = Object.values(res.models);
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load model status.';
        this.isLoading = false;
      },
    });
  }

  retrain(model: 'risk' | 'classification' | 'all'): void {
    if (this.retrainingModel) return;

    this.retrainingModel = model;
    this.successMessage = '';
    this.errorMessage = '';

    this.adminService.retrainModel({ model }).subscribe({
      next: (res) => {
        this.successMessage = res.message;
        this.retrainingModel = null;
        // Poll status after a short delay to reflect running state
        setTimeout(() => this.loadStatus(), 1500);
      },
      error: (err) => {
        this.errorMessage = err?.error?.message ?? 'Failed to start retraining.';
        this.retrainingModel = null;
      },
    });
  }

  getModelLabel(model: string): string {
    const labels: Record<string, string> = {
      risk: 'Risk Prediction',
      classification: 'Project Classification',
    };
    return labels[model] ?? model;
  }

  getAccuracyDisplay(info: MlModelInfo): string {
    if (info.running) return 'Training...';
    if (info.accuracy !== null) return `${info.accuracy}%`;
    return info.exists ? 'Unknown' : 'Not trained';
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  }
}
