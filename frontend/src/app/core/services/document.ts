import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Document } from '../models';

@Injectable({
  providedIn: 'root',
})
export class DocumentService {
  private apiUrl = `${environment.apiUrl}/documents`;

  constructor(private http: HttpClient) {}

  upload(file: File, data: { client_id?: number; project_id?: number; category?: string }): Observable<Document> {
    const formData = new FormData();
    formData.append('file', file);
    if (data.client_id) formData.append('client_id', data.client_id.toString());
    if (data.project_id) formData.append('project_id', data.project_id.toString());
    if (data.category) formData.append('category', data.category);
    return this.http.post<Document>(`${this.apiUrl}/upload`, formData);
  }

  download(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/download`, { responseType: 'blob' });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
