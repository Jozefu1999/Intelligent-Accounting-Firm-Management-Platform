const { fn, col } = require('sequelize');
const { Client, Project } = require('../models');

const mapStatusToFrench = (status) => {
  switch (status) {
    case 'in_progress':
    case 'draft':
      return 'en_cours';
    case 'completed':
      return 'terminé';
    case 'cancelled':
      return 'suspendu';
    default:
      return 'en_cours';
  }
};

const mapRiskScoreToFrench = (riskScore) => {
  const numericScore = Number(riskScore);
  if (Number.isNaN(numericScore)) {
    return 'faible';
  }

  if (numericScore >= 67) {
    return 'élevé';
  }

  if (numericScore >= 34) {
    return 'moyen';
  }

  return 'faible';
};

const getStats = async (req, res, next) => {
  try {
    const [totalClients, totalProjects, activeProjects, projectsForRisk, recentProjectRows, recentClientRows, groupedStatusRows] = await Promise.all([
      Client.count(),
      Project.count(),
      Project.count({ where: { status: 'in_progress' } }),
      Project.findAll({
        attributes: ['risk_score'],
        raw: true,
      }),
      Project.findAll({
        attributes: ['id', 'name', 'status', 'risk_score', 'createdAt'],
        include: [{
          model: Client,
          as: 'client',
          attributes: ['company_name'],
          required: false,
        }],
        order: [['createdAt', 'DESC']],
        limit: 5,
      }),
      Client.findAll({
        attributes: ['id', 'company_name', 'email', 'sector', 'status', 'createdAt'],
        order: [['createdAt', 'DESC']],
        limit: 5,
      }),
      Project.findAll({
        attributes: ['status', [fn('COUNT', col('id')), 'count']],
        group: ['status'],
        raw: true,
      }),
    ]);

    const riskBuckets = {
      faible: 0,
      moyen: 0,
      élevé: 0,
    };

    projectsForRisk.forEach((project) => {
      const riskLevel = mapRiskScoreToFrench(project.risk_score);
      riskBuckets[riskLevel] += 1;
    });

    const statusBuckets = {
      en_cours: 0,
      terminé: 0,
      suspendu: 0,
    };

    groupedStatusRows.forEach((row) => {
      const frenchStatus = mapStatusToFrench(row.status);
      statusBuckets[frenchStatus] += Number(row.count || 0);
    });

    const recentProjects = recentProjectRows.map((project) => {
      const plainProject = project.get({ plain: true });
      return {
        id: plainProject.id,
        titre: plainProject.name,
        statut: mapStatusToFrench(plainProject.status),
        niveau_risque: mapRiskScoreToFrench(plainProject.risk_score),
        client_nom: plainProject.client?.company_name || 'N/A',
        created_at: plainProject.createdAt,
      };
    });

    const recentClients = recentClientRows.map((client) => {
      const plainClient = client.get({ plain: true });
      return {
        id: plainClient.id,
        nom: plainClient.company_name,
        email: plainClient.email,
        secteur: plainClient.sector,
        statut: plainClient.status,
        created_at: plainClient.createdAt,
      };
    });

    const projectsByStatus = [
      { statut: 'en_cours', count: statusBuckets.en_cours },
      { statut: 'terminé', count: statusBuckets.terminé },
      { statut: 'suspendu', count: statusBuckets.suspendu },
    ];

    const projectsByRisk = [
      { niveau_risque: 'faible', count: riskBuckets.faible },
      { niveau_risque: 'moyen', count: riskBuckets.moyen },
      { niveau_risque: 'élevé', count: riskBuckets.élevé },
    ];

    res.json({
      stats: {
        totalClients,
        totalProjects,
        activeProjects,
        highRiskProjects: riskBuckets.élevé,
      },
      recentProjects,
      recentClients,
      projectsByStatus,
      projectsByRisk,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStats };
