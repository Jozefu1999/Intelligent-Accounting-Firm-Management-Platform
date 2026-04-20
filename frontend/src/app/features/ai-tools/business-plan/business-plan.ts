import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { finalize, timeout } from 'rxjs';
import { AiBusinessPlan, BusinessPlanContent, Project } from '../../../core/models';
import { AiService } from '../../../core/services/ai';
import { ProjectService } from '../../../core/services/project';

interface PlanSectionMeta {
  key: string;
  title: string;
  hint: string;
}

@Component({
  selector: 'app-business-plan',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './business-plan.html',
  styleUrl: './business-plan.scss',
})
export class BusinessPlan implements OnInit {
  projects: Project[] = [];
  generatedPlan: AiBusinessPlan | null = null;
  isProjectsLoading = false;
  isGenerating = false;
  errorMessage = '';
  successMessage = '';

  readonly sections: PlanSectionMeta[] = [
    {
      key: 'executive_summary',
      title: 'Executive Summary',
      hint: 'Strategic overview for decision makers.',
    },
    {
      key: 'market_analysis',
      title: 'Market Analysis',
      hint: 'Context, trends, and positioning opportunities.',
    },
    {
      key: 'financial_projections',
      title: 'Financial Projections',
      hint: 'Expected revenue, costs, and profitability trajectory.',
    },
    {
      key: 'risks',
      title: 'Risks',
      hint: 'Main business risks and monitoring points.',
    },
    {
      key: 'recommendations',
      title: 'Recommendations',
      hint: 'Action plan to secure execution.',
    },
  ];

  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);

  readonly form = this.formBuilder.nonNullable.group({
    projectId: [0, [Validators.required, Validators.min(1)]],
  });

  constructor(
    private aiService: AiService,
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  get selectedProject(): Project | null {
    const selectedId = this.form.controls.projectId.value;
    return this.projects.find((project) => project.id === selectedId) ?? null;
  }

  loadProjects(): void {
    this.isProjectsLoading = true;
    this.errorMessage = '';

    this.projectService.getAll()
      .pipe(timeout(15000))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .pipe(finalize(() => {
        this.isProjectsLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (projects) => {
          this.projects = projects ?? [];

          if (this.projects.length > 0 && this.form.controls.projectId.value <= 0) {
            this.form.controls.projectId.setValue(this.projects[0].id);
          }

          this.cdr.detectChanges();
        },
        error: (error: unknown) => {
          this.projects = [];
          this.errorMessage = this.getErrorMessage(
            error,
            'Le chargement des projets a depasse le delai autorise.',
            'Impossible de charger les projets pour la generation du business plan.',
          );
          this.cdr.detectChanges();
        },
      });
  }

  generateBusinessPlan(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const projectId = this.form.controls.projectId.value;
    if (projectId <= 0) {
      this.errorMessage = 'Selectionnez un projet avant de lancer la generation.';
      this.cdr.detectChanges();
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isGenerating = true;

    this.aiService.generateBusinessPlan(projectId)
      .pipe(timeout(45000))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .pipe(finalize(() => {
        this.isGenerating = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          this.generatedPlan = this.normalizePlan(response);
          this.successMessage = 'Business plan genere avec succes.';
          this.cdr.detectChanges();
        },
        error: (error: unknown) => {
          this.generatedPlan = null;
          this.errorMessage = this.getErrorMessage(
            error,
            'La generation IA a pris trop de temps. Reessayez dans un instant.',
            'La generation du business plan a echoue. Verifiez la configuration IA.',
          );
          this.cdr.detectChanges();
        },
      });
  }

  formatSectionValue(sectionKey: string): string {
    const rawValue = this.generatedPlan?.content?.[sectionKey];

    if (typeof rawValue === 'string') {
      return rawValue.trim().length > 0 ? rawValue : 'Aucune information disponible.';
    }

    if (Array.isArray(rawValue)) {
      if (rawValue.length === 0) {
        return 'Aucune information disponible.';
      }

      return rawValue
        .map((item) => {
          if (typeof item === 'string') {
            return `- ${item}`;
          }

          return `- ${JSON.stringify(item)}`;
        })
        .join('\n');
    }

    if (rawValue && typeof rawValue === 'object') {
      return JSON.stringify(rawValue, null, 2);
    }

    return 'Aucune information disponible.';
  }

  private normalizePlan(response: AiBusinessPlan | null | undefined): AiBusinessPlan {
    const fallbackProjectId = this.form.controls.projectId.value;
    const fallback: AiBusinessPlan = {
      id: 0,
      project_id: fallbackProjectId > 0 ? fallbackProjectId : 0,
      content: {},
    };

    if (!response || typeof response !== 'object') {
      return fallback;
    }

    const rawContent = response.content;

    if (rawContent && typeof rawContent === 'object' && !Array.isArray(rawContent)) {
      return {
        ...response,
        content: rawContent,
      };
    }

    if (typeof rawContent === 'string') {
      try {
        const parsedContent = JSON.parse(rawContent) as unknown;

        if (parsedContent && typeof parsedContent === 'object' && !Array.isArray(parsedContent)) {
          return {
            ...response,
            content: parsedContent as BusinessPlanContent,
          };
        }
      } catch {
        return {
          ...response,
          content: {
            executive_summary: rawContent,
          },
        };
      }
    }

    return {
      ...response,
      content: {},
    };
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
          return 'Le modele xAI configure est indisponible. Verifiez XAI_MODEL dans backend/.env (exemple: grok-4).';
        }

        if (normalizedBackendMessage.includes('gemini api key is invalid')) {
          return 'La cle API Gemini est invalide ou non autorisee. Verifiez GEMINI_API_KEY dans backend/.env.';
        }

        if (normalizedBackendMessage.includes('xai api key is invalid')) {
          return 'La cle API xAI est invalide ou non autorisee. Verifiez XAI_API_KEY dans backend/.env.';
        }

        if (normalizedBackendMessage.includes('invalid api key')
          || normalizedBackendMessage.includes('unauthorized')) {
          return 'La cle API IA est invalide ou non autorisee. Verifiez la configuration du provider dans backend/.env.';
        }

        if (normalizedBackendMessage.includes('quota')
          || normalizedBackendMessage.includes('resource_exhausted')
          || normalizedBackendMessage.includes('rate limit')) {
          if (normalizedBackendMessage.includes('xai') || normalizedBackendMessage.includes('grok')) {
            return 'La limite xAI est atteinte. Verifiez la facturation/limites xAI puis reessayez.';
          }

          if (normalizedBackendMessage.includes('gemini')) {
            return 'Le quota Gemini est atteint. Reessayez plus tard ou reduisez le volume des requetes.';
          }

          return 'La limite du provider IA est atteinte. Reessayez plus tard ou reduisez le volume des requetes.';
        }

        return backendMessage;
      }

      if (error.status === 0) {
        return 'Le serveur API est inaccessible. Verifiez que le backend est lance.';
      }
    }

    return defaultMessage;
  }
}
