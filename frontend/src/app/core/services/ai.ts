import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AiBusinessPlan,
  AiRecommendationsResponse,
  RiskPredictionRequest,
  RiskPredictionResponse,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class AiService {
  private apiUrl = `${environment.apiUrl}/ai`;

  constructor(private http: HttpClient) {}

  generateBusinessPlan(projectId: number): Observable<AiBusinessPlan> {
    return this.http.post<AiBusinessPlan>(`${this.apiUrl}/generate-business-plan`, { project_id: projectId });
  }

  getRecommendations(clientId: number): Observable<AiRecommendationsResponse> {
    return this.http.post<AiRecommendationsResponse>(`${this.apiUrl}/recommendations`, { client_id: clientId });
  }

  predictRisk(data: RiskPredictionRequest): Observable<RiskPredictionResponse> {
    return this.http.post<RiskPredictionResponse>(`${this.apiUrl}/predict-risk`, data);
  }
}
