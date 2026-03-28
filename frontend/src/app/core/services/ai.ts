import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AiService {
  private apiUrl = `${environment.apiUrl}/ai`;

  constructor(private http: HttpClient) {}

  generateBusinessPlan(projectId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/generate-business-plan`, { project_id: projectId });
  }

  getRecommendations(clientId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/recommendations`, { client_id: clientId });
  }

  predictRisk(data: { annual_revenue: number; estimated_budget: number; sector_code: number }): Observable<any> {
    return this.http.post(`${this.apiUrl}/predict-risk`, data);
  }
}
