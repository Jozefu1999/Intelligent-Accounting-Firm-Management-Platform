const { ContactMessage, Project } = require('../models');
const { normalizeRole } = require('../utils/roles');
const { resolveClientIdsForUser, hasProjectAccessByClientIds } = require('../utils/client-scope');

const parseNumericId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const submitContactMessage = async (req, res, next) => {
  try {
    const { nom, email, sujet, project_id, message, user_id } = req.body;
    const authenticatedUserId = Number(req.user.id);
    const normalizedRole = normalizeRole(req.user.role);

    if (!nom || !email || !sujet || !message || !user_id) {
      return res.status(400).json({ message: 'nom, email, sujet, message and user_id are required.' });
    }

    if (Number(user_id) !== authenticatedUserId) {
      return res.status(403).json({ message: 'Forbidden. Invalid user context.' });
    }

    let normalizedProjectId = null;
    if (project_id !== undefined && project_id !== null && project_id !== '') {
      normalizedProjectId = parseNumericId(project_id);
      if (!normalizedProjectId) {
        return res.status(400).json({ message: 'Invalid project_id value.' });
      }

      if (normalizedRole === 'visiteur') {
        const ownedClientIds = await resolveClientIdsForUser(req.user);
        const hasAccess = await hasProjectAccessByClientIds(normalizedProjectId, ownedClientIds);

        if (!hasAccess) {
          return res.status(403).json({ message: 'Forbidden. Invalid project access.' });
        }
      }
    }

    const contact = await ContactMessage.create({
      user_id: authenticatedUserId,
      nom: String(nom).trim(),
      email: String(email).trim().toLowerCase(),
      sujet: String(sujet).trim(),
      project_id: normalizedProjectId,
      message: String(message).trim(),
      statut: 'envoye',
    });

    res.status(201).json({
      message: 'Message sent successfully.',
      contact,
    });
  } catch (error) {
    next(error);
  }
};

const getContactMessages = async (req, res, next) => {
  try {
    const requestedUserId = req.query.user_id;
    const authenticatedUserId = Number(req.user.id);

    if (requestedUserId && requestedUserId !== 'me') {
      const parsedRequestedUserId = parseNumericId(requestedUserId);

      if (!parsedRequestedUserId) {
        return res.status(400).json({ message: 'Invalid user_id query value.' });
      }

      if (parsedRequestedUserId !== authenticatedUserId) {
        return res.status(403).json({ message: 'Forbidden. Invalid user context.' });
      }
    }

    const messages = await ContactMessage.findAll({
      where: { user_id: authenticatedUserId },
      include: [{ model: Project, as: 'project', attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']],
    });

    res.json(messages);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitContactMessage,
  getContactMessages,
};
