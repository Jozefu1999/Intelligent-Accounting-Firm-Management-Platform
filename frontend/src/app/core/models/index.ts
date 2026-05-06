export type UserRole = 'expert_comptable' | 'assistant' | 'administrateur' | 'visiteur';

export interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
  nom?: string;
  prenom?: string;
  role: UserRole;
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
  createdAt?: string;
  updatedAt?: string;
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
  createdAt?: string;
}

export interface ContactMessage {
  id: number;
  user_id: number;
  nom: string;
  email: string;
  sujet: string;
  project_id?: number | null;
  message: string;
  statut: 'envoye' | 'lu' | 'repondu';
  created_at?: string;
  createdAt?: string;
  project?: {
    id: number;
    name: string;
  };
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

export interface BusinessPlanContent {
  executive_summary?: string;
  market_analysis?: string;
  financial_projections?: string;
  risks?: string;
  recommendations?: string;
  [key: string]: unknown;
}

export interface AiBusinessPlan {
  id: number;
  project_id: number;
  generated_by?: number;
  content: BusinessPlanContent;
  created_at?: string;
  createdAt?: string;
}

export interface AiRecommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low' | string;
}

export interface AiRecommendationsResponse {
  recommendations: AiRecommendation[];
}

export interface RiskPredictionRequest {
  team_size: number;
  budget_usd: number;
  duration_months?: number;
  complexity_score?: number;
  stakeholder_count?: number;
  past_similar_projects?: number;
  success_rate?: number;
  budget_utilization?: number;
  change_request_frequency?: number;
  team_turnover_rate?: number;
  vendor_reliability?: number;
  schedule_pressure?: number;
  resource_availability?: number;
  technical_debt?: number;
  team_experience?: number;
  requirement_stability?: number;
  risk_management_maturity?: number;
  documentation_quality?: number;
  external_dependencies?: number;
}

export interface RiskPredictionResponse {
  risk_level: string;
  score: number;
  probabilities: {
    low: number;
    medium: number;
    high: number;
  };
  model?: {
    algorithm?: string;
    accuracy?: number;
    selected_features?: string[];
  };
}

export type ProjectType = 'creation' | 'development' | 'audit' | 'consulting' | 'other';

export interface ProjectClassificationRequest {
  annual_revenue: number;
  estimated_budget: number;
  sector_code: number | string;
  priority?: 'low' | 'medium' | 'high';
  duration_days?: number;
}

export interface ProjectClassificationResult {
  type: ProjectType;
  probability: number;
}

export interface ProjectClassificationResponse {
  predicted_type: ProjectType;
  confidence: number;
  sector_code?: number;
  probabilities: Record<ProjectType, number>;
  ranking: ProjectClassificationResult[];
}

export interface MlModelInfo {
  model: string;
  exists: boolean;
  lastModified: string | null;
  running: boolean;
  lastRun: string | null;
  accuracy: number | null;
  dataSource: string | null;
  error: string | null;
}

export interface MlStatusResponse {
  models: Record<string, MlModelInfo>;
}

export interface MlRetrainRequest {
  model: 'risk' | 'classification' | 'all';
}

export interface MlRetrainResponse {
  message: string;
  models: string[];
  startedAt: string;
}
