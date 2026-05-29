const { User, Project } = require('../models');

/**
 * GET /api/assistants/platform
 * Returns all assistants assigned to the current expert with their projects.
 */
const getMyAssistants = async (req, res, next) => {
  try {
    const expertId = req.user.id;

    const assistants = await User.findAll({
      where: {
        role: 'assistant',
        assigned_expert_id: expertId,
      },
      attributes: ['id', 'first_name', 'last_name', 'email', 'created_at'],
      order: [['created_at', 'DESC']],
    });

    const result = await Promise.all(assistants.map(async (assistant) => {
      const projects = await Project.findAll({
        where: { assigned_to: assistant.id },
        attributes: ['id', 'name', 'status', 'priority', 'type'],
      });

      return {
        id: assistant.id,
        first_name: assistant.first_name,
        last_name: assistant.last_name,
        email: assistant.email,
        created_at: assistant.created_at,
        projects,
      };
    }));

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/assistants/assign-project
 * Body: { assistant_id, project_id }
 */
const assignProject = async (req, res, next) => {
  try {
    const { assistant_id, project_id } = req.body;

    if (!assistant_id || !project_id) {
      return res.status(400).json({ message: 'assistant_id and project_id are required.' });
    }

    const assistant = await User.findOne({
      where: { id: assistant_id, role: 'assistant' },
    });

    if (!assistant) {
      return res.status(404).json({ message: 'Assistant not found.' });
    }

    const project = await Project.findByPk(project_id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    await project.update({ assigned_to: assistant_id });

    res.json({ message: 'Project assigned to assistant successfully.', project });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/assistants/unassign-project
 * Body: { project_id }
 */
const unassignProject = async (req, res, next) => {
  try {
    const { project_id } = req.body;

    if (!project_id) {
      return res.status(400).json({ message: 'project_id is required.' });
    }

    const project = await Project.findByPk(project_id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    await project.update({ assigned_to: null });

    res.json({ message: 'Project unassigned from assistant successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyAssistants, assignProject, unassignProject };
