import { UserRole } from '../models';

const ROLE_HOME_MAP: Record<UserRole, string> = {
  expert_comptable: '/expert/dashboard',
  assistant: '/assistant/dashboard',
  administrateur: '/admin/dashboard',
  client: '/client/dashboard',
};

const ROLE_LABEL_MAP: Record<UserRole, string> = {
  expert_comptable: 'Expert Comptable',
  assistant: 'Assistant',
  administrateur: 'Administrateur',
  client: 'Client',
};

const roleAliases: Record<string, UserRole> = {
  expert_comptable: 'expert_comptable',
  expert: 'expert_comptable',
  comptable_expert: 'expert_comptable',
  expertcomptable: 'expert_comptable',
  assistant: 'assistant',
  assistante: 'assistant',
  administrateur: 'administrateur',
  admin: 'administrateur',
  administrator: 'administrateur',
  client: 'client',
  visiteur: 'client',
  customer: 'client',
};

const normalizeRoleKey = (role: string): string => role
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase()
  .replace(/[\s-]+/g, '_');

export const normalizeRole = (role: string | undefined | null): UserRole => {
  if (!role) {
    return 'client';
  }

  const normalizedRole = normalizeRoleKey(role);
  const aliasedRole = roleAliases[normalizedRole];

  if (aliasedRole) {
    return aliasedRole;
  }

  if (normalizedRole.includes('admin')) {
    return 'administrateur';
  }

  if (normalizedRole.includes('expert')) {
    return 'expert_comptable';
  }

  if (normalizedRole.includes('assist')) {
    return 'assistant';
  }

  if (normalizedRole.includes('client') || normalizedRole.includes('visit')) {
    return 'client';
  }

  return 'client';
};

export const getHomeForRole = (role: string | undefined | null): string => {
  const normalizedRole = normalizeRole(role);
  return ROLE_HOME_MAP[normalizedRole];
};

export const getRoleLabel = (role: string | undefined | null): string => {
  const normalizedRole = normalizeRole(role);
  return ROLE_LABEL_MAP[normalizedRole];
};
