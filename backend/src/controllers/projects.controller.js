const { Op } = require('sequelize');
const { Project, Client } = require('../models');
const { normalizeRole } = require('../utils/roles');
const { resolveClientIdsForUser } = require('../utils/client-scope');

const parseNumericId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getAll = async (req, res, next) => {
  try {
    const requestedClientId = req.query.client_id;
    const normalizedRole = normalizeRole(req.user.role);
    const where = {};

    if (normalizedRole === 'visiteur') {
      const ownedClientIds = await resolveClientIdsForUser(req.user);

      if (!ownedClientIds.length) {
        return res.json([]);
      }

      if (requestedClientId && requestedClientId !== 'me') {
        const parsedClientId = parseNumericId(requestedClientId);
        if (!parsedClientId || !ownedClientIds.includes(parsedClientId)) {
          return res.status(403).json({ message: 'Forbidden. You can only access your own projects.' });
        }

        where.client_id = parsedClientId;
      } else {
        where.client_id = {
          [Op.in]: ownedClientIds,
        };
      }
    } else if (requestedClientId && requestedClientId !== 'me') {
      const parsedClientId = parseNumericId(requestedClientId);
      if (!parsedClientId) {
        return res.status(400).json({ message: 'Invalid client_id query value.' });
      }

      where.client_id = parsedClientId;
    }

    const projects = await Project.findAll({
      where: Object.keys(where).length ? where : undefined,
      include: [{ model: Client, as: 'client', attributes: ['id', 'company_name'] }],
      order: [['created_at', 'DESC']],
    });

    res.json(projects);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [{ model: Client, as: 'client', attributes: ['id', 'company_name'] }],
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    if (normalizeRole(req.user.role) === 'visiteur') {
      const ownedClientIds = await resolveClientIdsForUser(req.user);

      if (!ownedClientIds.includes(project.client_id)) {
        return res.status(403).json({ message: 'Forbidden. You can only access your own projects.' });
      }
    }

    res.json(project);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    if (normalizeRole(req.user.role) === 'visiteur') {
      return res.status(403).json({ message: 'Forbidden. Client role has read-only access to projects.' });
    }

    const project = await Project.create(req.body);
    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    if (normalizeRole(req.user.role) === 'visiteur') {
      return res.status(403).json({ message: 'Forbidden. Client role has read-only access to projects.' });
    }

    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }
    await project.update(req.body);
    res.json(project);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    if (normalizeRole(req.user.role) === 'visiteur') {
      return res.status(403).json({ message: 'Forbidden. Client role has read-only access to projects.' });
    }

    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }
    await project.destroy();
    res.json({ message: 'Project deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove };
