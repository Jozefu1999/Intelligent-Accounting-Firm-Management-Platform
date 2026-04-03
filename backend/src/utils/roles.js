const VALID_ROLES = ['expert_comptable', 'assistant', 'administrateur', 'visiteur'];

const ROLE_ALIASES = {
  expert_comptable: 'expert_comptable',
  expert: 'expert_comptable',
  assistant: 'assistant',
  administrateur: 'administrateur',
  admin: 'administrateur',
  visiteur: 'visiteur',
  client: 'visiteur',
};

const normalizeRole = (role) => {
  if (!role) {
    return 'visiteur';
  }

  return ROLE_ALIASES[role] || 'visiteur';
};

const isValidRole = (role) => {
  if (typeof role !== 'string' || role.length === 0) {
    return false;
  }

  return VALID_ROLES.includes(role)
    || Object.prototype.hasOwnProperty.call(ROLE_ALIASES, role);
};

module.exports = {
  VALID_ROLES,
  normalizeRole,
  isValidRole,
};
