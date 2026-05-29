import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Client, CreateClientPayload } from '../models';

export interface PlatformClient {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  client_id: number | null;
  status: 'pending' | 'registered' | 'active';
  projects: { id: number; name: string; status: string; priority: string; type: string }[];
}

export interface AssignProjectPayload {
  user_id: number;
  project_id: number;
}

@Injectable({
  providedIn: 'root',
})
export class ClientService {
  private apiUrl = `${environment.apiUrl}/clients`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Client[]> {
    return this.http.get<Client[]>(this.apiUrl);
  }

  getMyProfile(): Observable<Client> {
    return this.http.get<Client>(`${this.apiUrl}/me`);
  }

  updateMyProfile(data: Partial<Client>): Observable<Client> {
    return this.http.put<Client>(`${this.apiUrl}/me`, data);
  }

  getPlatformClients(search?: string, status?: string): Observable<PlatformClient[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (status) params = params.set('status', status);
    return this.http.get<PlatformClient[]>(`${this.apiUrl}/platform`, { params });
  }

  assignProject(payload: AssignProjectPayload): Observable<{ message: string; project: any; client: any }> {
    return this.http.post<{ message: string; project: any; client: any }>(`${this.apiUrl}/assign-project`, payload);
  }

  unassignProject(projectId: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/unassign-project`, { project_id: projectId });
  }

  getById(id: number): Observable<Client> {
    return this.http.get<Client>(`${this.apiUrl}/${id}`);
  }

  create(client: CreateClientPayload): Observable<Client> {
    return this.http.post<Client>(this.apiUrl, client);
  }

  update(id: number, client: Partial<Client>): Observable<Client> {
    return this.http.put<Client>(`${this.apiUrl}/${id}`, client);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
