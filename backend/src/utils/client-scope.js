const { Op } = require('sequelize');
const { User, Client, Project } = require('../models');

const normalizeEmail = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase();
};

const resolveClientIdsForUser = async (authUser) => {
  if (!authUser?.id) {
    return [];
  }

  const emailCandidates = [];

  if (authUser.email) {
    emailCandidates.push(normalizeEmail(authUser.email));
  }

  const persistedUser = await User.findByPk(authUser.id, {
    attributes: ['email'],
  });

  if (persistedUser?.email) {
    emailCandidates.push(normalizeEmail(persistedUser.email));
  }

  const uniqueEmails = [...new Set(emailCandidates.filter(Boolean))];

  if (!uniqueEmails.length) {
    return [];
  }

  const clients = await Client.findAll({
    attributes: ['id'],
    where: {
      email: {
        [Op.in]: uniqueEmails,
      },
    },
  });

  return clients.map((client) => client.id);
};

const getProjectIdsForClientIds = async (clientIds) => {
  if (!Array.isArray(clientIds) || clientIds.length === 0) {
    return [];
  }

  const projects = await Project.findAll({
    attributes: ['id'],
    where: {
      client_id: {
        [Op.in]: clientIds,
      },
    },
  });

  return projects.map((project) => project.id);
};

const hasProjectAccessByClientIds = async (projectId, clientIds) => {
  if (!Array.isArray(clientIds) || clientIds.length === 0) {
    return false;
  }

  const project = await Project.findOne({
    attributes: ['id'],
    where: {
      id: projectId,
      client_id: {
        [Op.in]: clientIds,
      },
    },
  });

  return Boolean(project);
};

module.exports = {
  resolveClientIdsForUser,
  getProjectIdsForClientIds,
  hasProjectAccessByClientIds,
};
