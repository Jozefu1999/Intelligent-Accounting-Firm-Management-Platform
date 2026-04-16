const { fn, col, Op } = require('sequelize');
const { User, Client, Project, Document } = require('../models');
const { isValidRole, normalizeRole } = require('../utils/roles');

const getFullName = (firstName, lastName) => {
  return [firstName || '', lastName || '']
    .join(' ')
    .trim();
};

const mapUser = (user) => ({
  id: user.id,
  email: user.email,
  first_name: user.first_name,
  last_name: user.last_name,
  prenom: user.first_name,
  nom: user.last_name,
  role: normalizeRole(user.role),
  created_at: user.created_at || user.createdAt,
});

const mapStatusToUi = (status) => {
  switch (status) {
    case 'completed':
      return 'termine';
    case 'cancelled':
      return 'suspendu';
    default:
      return 'en_cours';
  }
};

const mapRiskScoreToUi = (riskScore) => {
  const numericScore = Number(riskScore);
  if (Number.isNaN(numericScore)) {
    return 'faible';
  }

  if (numericScore >= 67) {
    return 'eleve';
  }

  if (numericScore >= 34) {
    return 'moyen';
  }

  return 'faible';
};

const toTimestamp = (value) => {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const getUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'email', 'first_name', 'last_name', 'role', 'created_at'],
      order: [['created_at', 'DESC']],
    });

    res.json(users.map(mapUser));
  } catch (error) {
    next(error);
  }
};

const getUserDetails = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ message: 'Invalid user id.' });
    }

    const user = await User.findByPk(userId, {
      attributes: ['id', 'email', 'first_name', 'last_name', 'role', 'created_at'],
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const normalizedRole = normalizeRole(user.role);
    let projectsLinkedCount = 0;

    if (normalizedRole === 'expert_comptable') {
      projectsLinkedCount = await Project.count({
        include: [{
          model: Client,
          as: 'client',
          required: true,
          attributes: [],
          where: { assigned_expert_id: user.id },
        }],
      });
    } else if (normalizedRole === 'assistant') {
      projectsLinkedCount = await Document.count({
        where: {
          uploaded_by: user.id,
          project_id: {
            [Op.not]: null,
          },
        },
        distinct: true,
        col: 'project_id',
      });
    }

    res.json({
      ...mapUser(user),
      projects_linked_count: projectsLinkedCount,
    });
  } catch (error) {
    next(error);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!isValidRole(role)) {
      return res.status(400).json({ message: 'Invalid role value.' });
    }

    const normalizedRole = normalizeRole(role);

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    await user.update({ role: normalizedRole });

    res.json(mapUser(user));
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const authenticatedUserId = Number(req.user.id);

    if (userId === authenticatedUserId) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    await user.destroy();
    res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

const getStats = async (req, res, next) => {
  try {
    const [
      usersCount,
      clientsCount,
      projectsCount,
      highRiskCount,
      recentUsersRows,
      projectsByStatusRows,
      projectsForRiskRows,
      usersByRoleRows,
      highRiskProjectRows,
    ] = await Promise.all([
      User.count(),
      Client.count(),
      Project.count(),
      Project.count({
        where: {
          risk_score: {
            [Op.gte]: 67,
          },
        },
      }),
      User.findAll({
        attributes: ['id', 'email', 'first_name', 'last_name', 'role', 'created_at'],
        order: [['created_at', 'DESC']],
        limit: 5,
      }),
      Project.findAll({
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        group: ['status'],
        raw: true,
      }),
      Project.findAll({
        attributes: ['risk_score'],
        raw: true,
      }),
      User.findAll({
        attributes: ['role', [fn('COUNT', col('id')), 'count']],
        group: ['role'],
        raw: true,
      }),
      Project.findAll({
        attributes: ['id', 'name', 'status', 'risk_score', 'created_at'],
        where: {
          risk_score: {
            [Op.gte]: 67,
          },
        },
        include: [{
          model: Client,
          as: 'client',
          required: false,
          attributes: ['id', 'company_name', 'assigned_expert_id'],
          include: [{
            model: User,
            as: 'assignedExpert',
            required: false,
            attributes: ['first_name', 'last_name'],
          }],
        }],
        order: [['created_at', 'DESC']],
        limit: 5,
      }),
    ]);

    const statusBuckets = {
      en_cours: 0,
      termine: 0,
      suspendu: 0,
    };

    projectsByStatusRows.forEach((row) => {
      const bucketKey = mapStatusToUi(row.status);
      statusBuckets[bucketKey] += Number(row.count || 0);
    });

    const riskBuckets = {
      faible: 0,
      moyen: 0,
      eleve: 0,
    };

    projectsForRiskRows.forEach((row) => {
      const bucketKey = mapRiskScoreToUi(row.risk_score);
      riskBuckets[bucketKey] += 1;
    });

    const roleBuckets = {
      expert_comptable: 0,
      assistant: 0,
      administrateur: 0,
      visiteur: 0,
    };

    usersByRoleRows.forEach((row) => {
      const normalizedRole = normalizeRole(row.role);
      roleBuckets[normalizedRole] = Number(row.count || 0);
    });

    const recentUsers = recentUsersRows.map(mapUser);
    const highRiskProjects = highRiskProjectRows.map((project) => {
      const plainProject = project.get({ plain: true });
      const assignedExpert = plainProject.client?.assignedExpert;
      const assignedExpertName = getFullName(assignedExpert?.first_name, assignedExpert?.last_name) || 'Non assigne';

      return {
        id: plainProject.id,
        titre: plainProject.name,
        client: plainProject.client?.company_name || 'N/A',
        statut: mapStatusToUi(plainProject.status),
        niveau_risque: mapRiskScoreToUi(plainProject.risk_score),
        created_at: plainProject.created_at || plainProject.createdAt,
        expert_assigne: assignedExpertName,
      };
    });

    const projectsByStatus = [
      { statut: 'en_cours', count: statusBuckets.en_cours },
      { statut: 'termine', count: statusBuckets.termine },
      { statut: 'suspendu', count: statusBuckets.suspendu },
    ];

    const projectsByRisk = [
      { niveau_risque: 'faible', count: riskBuckets.faible },
      { niveau_risque: 'moyen', count: riskBuckets.moyen },
      { niveau_risque: 'eleve', count: riskBuckets.eleve },
    ];

    const usersByRole = [
      { role: 'expert_comptable', count: roleBuckets.expert_comptable },
      { role: 'assistant', count: roleBuckets.assistant },
      { role: 'administrateur', count: roleBuckets.administrateur },
      { role: 'visiteur', count: roleBuckets.visiteur },
    ];

    res.json({
      users_count: usersCount,
      clients_count: clientsCount,
      projects_count: projectsCount,
      high_risk_count: highRiskCount,
      recent_users: recentUsers,
      projects_by_status: projectsByStatus,
      projects_by_risk: projectsByRisk,
      users_by_role: usersByRole,
      high_risk_projects: highRiskProjects,
    });
  } catch (error) {
    next(error);
  }
};

const getActivity = async (req, res, next) => {
  try {
    const [recentClients, recentProjects, recentDocuments] = await Promise.all([
      Client.findAll({
        attributes: ['id', 'company_name', 'created_at'],
        include: [{
          model: User,
          as: 'assignedExpert',
          required: false,
          attributes: ['first_name', 'last_name'],
        }],
        order: [['created_at', 'DESC']],
        limit: 10,
      }),
      Project.findAll({
        attributes: ['id', 'name', 'created_at'],
        include: [{
          model: Client,
          as: 'client',
          required: false,
          attributes: ['id', 'company_name', 'assigned_expert_id'],
          include: [{
            model: User,
            as: 'assignedExpert',
            required: false,
            attributes: ['first_name', 'last_name'],
          }],
        }],
        order: [['created_at', 'DESC']],
        limit: 10,
      }),
      Document.findAll({
        attributes: ['id', 'name', 'project_id', 'created_at'],
        include: [
          {
            model: User,
            as: 'uploader',
            required: false,
            attributes: ['first_name', 'last_name'],
          },
          {
            model: Project,
            as: 'project',
            required: false,
            attributes: ['name'],
          },
        ],
        order: [['created_at', 'DESC']],
        limit: 10,
      }),
    ]);

    const clientActivities = recentClients.map((client) => {
      const plainClient = client.get({ plain: true });
      const userName = getFullName(plainClient.assignedExpert?.first_name, plainClient.assignedExpert?.last_name) || 'Systeme';

      return {
        action: `Nouveau client ${plainClient.company_name} ajoute`,
        user_name: userName,
        created_at: plainClient.created_at || plainClient.createdAt,
      };
    });

    const projectActivities = recentProjects.map((project) => {
      const plainProject = project.get({ plain: true });
      const userName = getFullName(
        plainProject.client?.assignedExpert?.first_name,
        plainProject.client?.assignedExpert?.last_name,
      ) || 'Systeme';

      return {
        action: `Projet ${plainProject.name} cree`,
        user_name: userName,
        created_at: plainProject.created_at || plainProject.createdAt,
      };
    });

    const documentActivities = recentDocuments.map((document) => {
      const plainDocument = document.get({ plain: true });
      const userName = getFullName(plainDocument.uploader?.first_name, plainDocument.uploader?.last_name) || 'Systeme';
      const projectLabel = plainDocument.project?.name
        ? ` sur ${plainDocument.project.name}`
        : '';

      return {
        action: `Document ${plainDocument.name} uploade${projectLabel}`,
        user_name: userName,
        created_at: plainDocument.created_at || plainDocument.createdAt,
      };
    });

    const activities = [
      ...clientActivities,
      ...projectActivities,
      ...documentActivities,
    ]
      .sort((left, right) => toTimestamp(right.created_at) - toTimestamp(left.created_at))
      .slice(0, 10);

    res.json(activities);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStats,
  getActivity,
  getUsers,
  getUserDetails,
  updateUserRole,
  deleteUser,
};
