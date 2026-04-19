const VALID_ROLES = ['expert_comptable', 'assistant', 'administrateur', 'visiteur'];

const ROLE_ALIASES = {
  expert_comptable: 'expert_comptable',
  expert: 'expert_comptable',
  comptable_expert: 'expert_comptable',
  expertcomptable: 'expert_comptable',
  assistant: 'assistant',
  assistante: 'assistant',
  administrateur: 'administrateur',
  admin: 'administrateur',
  administrator: 'administrateur',
  visiteur: 'visiteur',
  client: 'visiteur',
  customer: 'visiteur',
};

const normalizeRoleKey = (role) => role
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase()
  .replace(/[\s-]+/g, '_');

const normalizeRole = (role) => {
  if (typeof role !== 'string' || role.trim().length === 0) {
    return 'visiteur';
  }

  const normalizedRole = normalizeRoleKey(role);
  const aliasedRole = ROLE_ALIASES[normalizedRole];

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
    return 'visiteur';
  }

  return 'visiteur';
};

const isValidRole = (role) => {
  if (typeof role !== 'string' || role.trim().length === 0) {
    return false;
  }

  const normalizedRole = normalizeRoleKey(role);

  return VALID_ROLES.includes(normalizedRole)
    || Object.prototype.hasOwnProperty.call(ROLE_ALIASES, normalizedRole);
};

module.exports = {
  VALID_ROLES,
  normalizeRole,
  isValidRole,
};
