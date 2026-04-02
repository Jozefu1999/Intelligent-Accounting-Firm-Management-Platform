export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'expert' | 'assistant';
  created_at?: string;
  updated_at?: string;
}

export interface ClientProjectSummary {
  id: number;
  name: string;
  status?: string;
  priority?: string;
}

export interface CreateClientPayload {
  name: string;
  username: string;
  phone?: string;
  mail?: string;
  adresse?: string;
  company_name?: string;
  contact_person?: string;
  email?: string;
  address?: string;
}

export interface Client {
  id: number;
  company_name: string;
  siret?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  annual_revenue?: number;
  sector?: string;
  risk_level: 'low' | 'medium' | 'high';
  status: 'active' | 'inactive' | 'prospect';
  notes?: string;
  assigned_expert_id?: number;
  assignedExpert?: User;
  projects?: ClientProjectSummary[];
  created_at?: string;
  updated_at?: string;
}

export interface Project {
  id: number;
  client_id: number;
  name: string;
  description?: string;
  type?: 'creation' | 'development' | 'audit' | 'consulting' | 'other';
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  risk_score?: number;
  estimated_budget?: number;
  start_date?: string;
  due_date?: string;
  client?: Client;
  created_at?: string;
  updated_at?: string;
}

export interface Document {
  id: number;
  client_id?: number;
  project_id?: number;
  name: string;
  mime_type?: string;
  size_bytes?: number;
  file_path: string;
  category?: 'financial' | 'legal' | 'administrative' | 'report' | 'other';
  uploaded_by?: number;
  created_at?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface DashboardStats {
  totalClients: number;
  totalProjects: number;
  totalUsers: number;
  activeClients: number;
  projectsByStatus: { status: string; count: number }[];
  clientsByRisk: { risk_level: string; count: number }[];
}
