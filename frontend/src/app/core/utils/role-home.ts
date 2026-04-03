import { UserRole } from '../models';

const ROLE_HOME_MAP: Record<UserRole, string> = {
  expert_comptable: '/dashboard',
  assistant: '/assistant-dashboard',
  administrateur: '/admin-dashboard',
  visiteur: '/client-dashboard',
};

const ROLE_LABEL_MAP: Record<UserRole, string> = {
  expert_comptable: 'Expert Comptable',
  assistant: 'Assistant',
  administrateur: 'Administrateur',
  visiteur: 'Client / Visiteur',
};

const roleAliases: Record<string, UserRole> = {
  expert_comptable: 'expert_comptable',
  expert: 'expert_comptable',
  assistant: 'assistant',
  administrateur: 'administrateur',
  admin: 'administrateur',
  visiteur: 'visiteur',
  client: 'visiteur',
};

export const normalizeRole = (role: string | undefined | null): UserRole => {
  if (!role) {
    return 'visiteur';
  }

  return roleAliases[role] ?? 'visiteur';
};

export const getHomeForRole = (role: string | undefined | null): string => {
  const normalizedRole = normalizeRole(role);
  return ROLE_HOME_MAP[normalizedRole];
};

export const getRoleLabel = (role: string | undefined | null): string => {
  const normalizedRole = normalizeRole(role);
  return ROLE_LABEL_MAP[normalizedRole];
};
