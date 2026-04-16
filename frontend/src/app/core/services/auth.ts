import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, User, UserRole } from '../models';
import { getHomeForRole, normalizeRole } from '../utils/role-home';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly tokenKey = 'token';
  private readonly userKey = 'user';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    const token = this.getToken();
    const user = this.readStoredUser();
    const tokenRole = this.getRoleFromToken(token);

    if (token && user) {
      this.currentUserSubject.next(this.normalizeUser(user, tokenRole));
    }

    if (token && !user) {
      const tokenUser = this.buildUserFromToken(token);
      if (tokenUser) {
        this.currentUserSubject.next(tokenUser);
      }
    }

    if (!token && user) {
      localStorage.removeItem(this.userKey);
    }
  }

  private decodeTokenPayload(token: string | null): Record<string, unknown> | null {
    if (!token) {
      return null;
    }

    const tokenParts = token.split('.');
    if (tokenParts.length < 2) {
      return null;
    }

    try {
      const base64 = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
      const paddedBase64 = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`;
      const decoded = atob(paddedBase64);
      return JSON.parse(decoded) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private getRoleFromToken(token: string | null): UserRole | null {
    const payload = this.decodeTokenPayload(token);
    if (!payload) {
      return null;
    }

    const roleCandidate = payload['role'];
    if (typeof roleCandidate !== 'string' || roleCandidate.trim().length === 0) {
      return null;
    }

    return normalizeRole(roleCandidate);
  }

  private buildUserFromToken(token: string): User | null {
    const payload = this.decodeTokenPayload(token);
    if (!payload) {
      return null;
    }

    const role = this.getRoleFromToken(token) ?? 'visiteur';
    const idCandidate = payload['id'];
    const emailCandidate = payload['email'];

    return {
      id: typeof idCandidate === 'number' ? idCandidate : 0,
      email: typeof emailCandidate === 'string' ? emailCandidate : '',
      first_name: '',
      last_name: '',
      prenom: '',
      nom: '',
      role,
    };
  }

  private normalizeUser(user: User, tokenRole?: UserRole | null): User {
    const resolvedRole = tokenRole ?? normalizeRole(user.role);

    return {
      ...user,
      first_name: user.first_name ?? user.prenom ?? '',
      last_name: user.last_name ?? user.nom ?? '',
      prenom: user.prenom ?? user.first_name ?? '',
      nom: user.nom ?? user.last_name ?? '',
      role: resolvedRole,
    };
  }

  private readStoredUser(): User | null {
    const storedUser = localStorage.getItem(this.userKey);

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as User;
    } catch {
      localStorage.removeItem(this.userKey);
      return null;
    }
  }

  private setSession(token: string, user: User): void {
    const normalizedUser = this.normalizeUser(user, this.getRoleFromToken(token));

    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(normalizedUser));
    this.currentUserSubject.next(normalizedUser);
  }

  private clearSession(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUserSubject.next(null);
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap((res) => {
        this.setSession(res.token, res.user);
      })
    );
  }

  register(data: { email: string; password: string; first_name: string; last_name: string; role: UserRole }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data).pipe(
      tap((res) => {
        this.setSession(res.token, res.user);
      })
    );
  }

  updateProfile(data: {
    email?: string;
    first_name?: string;
    last_name?: string;
    nom?: string;
    prenom?: string;
    password?: string;
  }): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/profile`, data).pipe(
      tap((user) => {
        const tokenRole = this.getRoleFromToken(this.getToken());
        const normalizedUser = this.normalizeUser(user, tokenRole);
        localStorage.setItem(this.userKey, JSON.stringify(normalizedUser));
        this.currentUserSubject.next(normalizedUser);
      })
    );
  }

  changePassword(data: { currentPassword: string; newPassword: string }): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/change-password`, data);
  }

  fetchCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me`).pipe(
      tap((user) => {
        const tokenRole = this.getRoleFromToken(this.getToken());
        const normalizedUser = this.normalizeUser(user, tokenRole);
        localStorage.setItem(this.userKey, JSON.stringify(normalizedUser));
        this.currentUserSubject.next(normalizedUser);
      })
    );
  }

  initializeSession(): Observable<boolean> {
    if (!this.getToken()) {
      this.currentUserSubject.next(null);
      return of(false);
    }

    return this.fetchCurrentUser().pipe(
      map(() => true),
      catchError(() => {
        this.clearSession();
        return of(false);
      })
    );
  }

  logout(): void {
    this.clearSession();
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return !!this.getToken() && !!this.currentUserSubject.value;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getCurrentRole(): UserRole {
    const currentUserRole = this.currentUserSubject.value?.role;
    if (currentUserRole) {
      return normalizeRole(currentUserRole);
    }

    const tokenRole = this.getRoleFromToken(this.getToken());
    if (tokenRole) {
      return tokenRole;
    }

    const storedUserRole = this.readStoredUser()?.role;
    return normalizeRole(storedUserRole);
  }

  getHomeForCurrentUser(): string {
    return getHomeForRole(this.getCurrentRole());
  }

  getHomeForRole(role: string | undefined | null): string {
    return getHomeForRole(role);
  }
}
