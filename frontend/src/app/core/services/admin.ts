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

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly apiUrl = `${environment.apiUrl}/admin/users`;

  constructor(private http: HttpClient) {}

  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(this.apiUrl);
  }

  updateUserRole(id: number, role: UserRole): Observable<AdminUser> {
    return this.http.put<AdminUser>(`${this.apiUrl}/${id}/role`, { role });
  }

  deleteUser(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
