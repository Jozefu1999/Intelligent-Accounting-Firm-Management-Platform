import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { finalize, timeout } from 'rxjs';
import { AiRecommendation, Client } from '../../../core/models';
import { AiService } from '../../../core/services/ai';
import { ClientService } from '../../../core/services/client';

@Component({
  selector: 'app-recommendations',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './recommendations.html',
  styleUrl: './recommendations.scss',
})
export class Recommendations implements OnInit {
  clients: Client[] = [];
  recommendations: AiRecommendation[] = [];
  isClientsLoading = false;
  isGenerating = false;
  errorMessage = '';
  successMessage = '';

  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);

  readonly form = this.formBuilder.nonNullable.group({
    clientId: [0, [Validators.required, Validators.min(1)]],
  });

  constructor(
    private aiService: AiService,
    private clientService: ClientService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadClients();
  }

  get selectedClient(): Client | null {
    const selectedId = this.form.controls.clientId.value;
    return this.clients.find((client) => client.id === selectedId) ?? null;
  }

  loadClients(): void {
    this.isClientsLoading = true;
    this.errorMessage = '';

    this.clientService.getAll()
      .pipe(timeout(15000))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .pipe(finalize(() => {
        this.isClientsLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (clients) => {
          this.clients = clients ?? [];

          if (this.clients.length > 0 && this.form.controls.clientId.value <= 0) {
            this.form.controls.clientId.setValue(this.clients[0].id);
          }

          this.cdr.detectChanges();
        },
        error: (error: unknown) => {
          this.clients = [];
          this.errorMessage = this.getErrorMessage(
            error,
            'Client loading exceeded the allowed timeout.',
            'Unable to load clients for AI recommendations.',
          );
          this.cdr.detectChanges();
        },
      });
  }

  generateRecommendations(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const clientId = this.form.controls.clientId.value;
    if (clientId <= 0) {
      this.errorMessage = 'Select a client before starting generation.';
      this.cdr.detectChanges();
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isGenerating = true;

    this.aiService.getRecommendations(clientId)
      .pipe(timeout(45000))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .pipe(finalize(() => {
        this.isGenerating = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          this.recommendations = this.normalizeRecommendations(response?.recommendations);
          this.successMessage = this.recommendations.length > 0
            ? 'Recommendations generated successfully.'
            : 'Generation completed without actionable recommendations.';
          this.cdr.detectChanges();
        },
        error: (error: unknown) => {
          this.recommendations = [];
          this.errorMessage = this.getErrorMessage(
            error,
            'AI generation timed out. Please try again shortly.',
            'Recommendation generation failed. Check AI configuration.',
          );
          this.cdr.detectChanges();
        },
      });
  }

  getPriorityLabel(priority: string): string {
    const normalized = this.normalizePriority(priority);

    if (normalized === 'high') {
      return 'High';
    }

    if (normalized === 'low') {
      return 'Low';
    }

    return 'Medium';
  }

  getPriorityClass(priority: string): string {
    const normalized = this.normalizePriority(priority);

    if (normalized === 'high') {
      return 'priority-high';
    }

    if (normalized === 'low') {
      return 'priority-low';
    }

    return 'priority-medium';
  }

  private normalizeRecommendations(rawRecommendations: unknown): AiRecommendation[] {
    if (!Array.isArray(rawRecommendations)) {
      return [];
    }

    return rawRecommendations
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map((item, index) => {
        const title = typeof item['title'] === 'string' ? item['title'] : `Recommendation ${index + 1}`;
        const description = typeof item['description'] === 'string'
          ? item['description']
          : 'No detailed description provided by the AI response.';
        const priority = this.normalizePriority(typeof item['priority'] === 'string' ? item['priority'] : 'medium');

        return {
          title,
          description,
          priority,
        };
      });
  }

  private normalizePriority(priority: string): 'high' | 'medium' | 'low' {
    const normalized = priority.trim().toLowerCase();

    if (normalized === 'high') {
      return 'high';
    }

    if (normalized === 'low') {
      return 'low';
    }

    return 'medium';
  }

  private getErrorMessage(error: unknown, timeoutMessage: string, defaultMessage: string): string {
    if (typeof error === 'object' && error !== null && 'name' in error) {
      const errorName = (error as { name?: string }).name;
      if (errorName === 'TimeoutError') {
        return timeoutMessage;
      }
    }

    if (error instanceof HttpErrorResponse) {
      const backendMessage =
        typeof error.error === 'object' && error.error !== null && 'message' in error.error
          ? (error.error as { message?: unknown }).message
          : undefined;

      if (typeof backendMessage === 'string' && backendMessage.trim().length > 0) {
        const normalizedBackendMessage = backendMessage.trim().toLowerCase();

        if (normalizedBackendMessage.includes('no active credits/licenses')
          || normalizedBackendMessage.includes("doesn't have any credits or licenses")) {
          return 'Le compte xAI n\'a pas de credits ou licence actifs. Activez la facturation dans la console xAI puis reessayez.';
        }

        if (normalizedBackendMessage.includes('model not found')
          || normalizedBackendMessage.includes('model "') && normalizedBackendMessage.includes('is unavailable')) {
          return 'The configured xAI model is unavailable. Check XAI_MODEL in backend/.env (example: grok-4).';
        }

        if (normalizedBackendMessage.includes('gemini api key is invalid')) {
          return 'The Gemini API key is invalid or unauthorized. Check GEMINI_API_KEY in backend/.env.';
        }

        if (normalizedBackendMessage.includes('xai api key is invalid')) {
          return 'The xAI API key is invalid or unauthorized. Check XAI_API_KEY in backend/.env.';
        }

        if (normalizedBackendMessage.includes('invalid api key')
          || normalizedBackendMessage.includes('unauthorized')) {
          return 'The AI API key is invalid or unauthorized. Check provider configuration in backend/.env.';
        }

        if (normalizedBackendMessage.includes('quota')
          || normalizedBackendMessage.includes('resource_exhausted')
          || normalizedBackendMessage.includes('rate limit')) {
          if (normalizedBackendMessage.includes('xai') || normalizedBackendMessage.includes('grok')) {
            return 'The xAI limit is reached. Check xAI billing/limits and try again.';
          }

          if (normalizedBackendMessage.includes('gemini')) {
            return 'Gemini quota is reached. Try again later or reduce request volume.';
          }

          return 'The AI provider limit is reached. Try again later or reduce request volume.';
        }

        return backendMessage;
      }

      if (error.status === 0) {
        return 'API server is unreachable. Verify that the backend is running.';
      }
    }

    return defaultMessage;
  }
}

