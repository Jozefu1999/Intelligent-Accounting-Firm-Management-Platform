import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AssistantProject {
  id: number;
  name: string;
  status: string;
  priority: string;
  type: string;
}

export interface PlatformAssistant {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  projects: AssistantProject[];
}

export interface AssignAssistantProjectPayload {
  assistant_id: number;
  project_id: number;
}

@Injectable({
  providedIn: 'root',
})
export class AssistantService {
  private apiUrl = `${environment.apiUrl}/assistants`;

  constructor(private http: HttpClient) {}

  getPlatformAssistants(): Observable<PlatformAssistant[]> {
    return this.http.get<PlatformAssistant[]>(`${this.apiUrl}/platform`);
  }

  assignProject(payload: AssignAssistantProjectPayload): Observable<{ message: string; project: any }> {
    return this.http.post<{ message: string; project: any }>(`${this.apiUrl}/assign-project`, payload);
  }

  unassignProject(projectId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/unassign-project`, { project_id: projectId });
  }
}
