import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserRole } from '../models';

export interface AdminUser {
  id: number;
  email: string;
  role: UserRole;
  first_name?: string;
  last_name?: string;
  nom?: string;
  prenom?: string;
  created_at?: string;
}

export interface AdminUserDetails extends AdminUser {
  projects_linked_count: number;
}

export interface AdminProjectStatusBucket {
  statut: string;
  count: number;
}

export interface AdminProjectRiskBucket {
  niveau_risque: string;
  count: number;
}

export interface AdminUsersByRoleBucket {
  role: UserRole;
  count: number;
}

export interface AdminHighRiskProject {
  id: number;
  titre: string;
  client: string;
  statut: string;
  niveau_risque: string;
  created_at?: string;
  expert_assigne?: string;
}

export interface AdminStatsResponse {
  users_count: number;
  clients_count: number;
  projects_count: number;
  high_risk_count: number;
  recent_users: AdminUser[];
  projects_by_status: AdminProjectStatusBucket[];
  projects_by_risk: AdminProjectRiskBucket[];
  users_by_role: AdminUsersByRoleBucket[];
  high_risk_projects: AdminHighRiskProject[];
}

export interface AdminActivityItem {
  action: string;
  user_name: string;
  created_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly baseUrl = `${environment.apiUrl}/admin`;
  private readonly usersApiUrl = `${this.baseUrl}/users`;

  constructor(private http: HttpClient) {}

  getStats(): Observable<AdminStatsResponse> {
    return this.http.get<AdminStatsResponse>(`${this.baseUrl}/stats`);
  }

  getActivity(): Observable<AdminActivityItem[]> {
    return this.http.get<AdminActivityItem[]>(`${this.baseUrl}/activity`);
  }

  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(this.usersApiUrl);
  }

  getUserDetails(id: number): Observable<AdminUserDetails> {
    return this.http.get<AdminUserDetails>(`${this.usersApiUrl}/${id}`);
  }

  updateUserRole(id: number, role: UserRole): Observable<AdminUser> {
    return this.http.put<AdminUser>(`${this.usersApiUrl}/${id}/role`, { role });
  }

  deleteUser(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.usersApiUrl}/${id}`);
  }
}
