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

    if (token && user) {
      this.currentUserSubject.next(this.normalizeUser(user));
    }

    if (!token && user) {
      localStorage.removeItem(this.userKey);
    }
  }

  private normalizeUser(user: User): User {
    return {
      ...user,
      first_name: user.first_name ?? user.prenom ?? '',
      last_name: user.last_name ?? user.nom ?? '',
      prenom: user.prenom ?? user.first_name ?? '',
      nom: user.nom ?? user.last_name ?? '',
      role: normalizeRole(user.role),
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
    const normalizedUser = this.normalizeUser(user);

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
        const normalizedUser = this.normalizeUser(user);
        localStorage.setItem(this.userKey, JSON.stringify(normalizedUser));
        this.currentUserSubject.next(normalizedUser);
      })
    );
  }

  fetchCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me`).pipe(
      tap((user) => {
        const normalizedUser = this.normalizeUser(user);
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

  getHomeForCurrentUser(): string {
    return getHomeForRole(this.currentUserSubject.value?.role);
  }

  getHomeForRole(role: string | undefined | null): string {
    return getHomeForRole(role);
  }
}
