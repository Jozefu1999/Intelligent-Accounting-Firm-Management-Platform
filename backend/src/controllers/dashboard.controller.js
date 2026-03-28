const { Client, Project, User } = require('../models');
const { Op } = require('sequelize');

const getStats = async (req, res, next) => {
  try {
    const totalClients = await Client.count();
    const totalProjects = await Project.count();
    const totalUsers = await User.count();

    const activeClients = await Client.count({ where: { status: 'active' } });
    const projectsByStatus = await Project.findAll({
      attributes: [
        'status',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
      ],
      group: ['status'],
    });

    const clientsByRisk = await Client.findAll({
      attributes: [
        'risk_level',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
      ],
      group: ['risk_level'],
    });

    res.json({
      totalClients,
      totalProjects,
      totalUsers,
      activeClients,
      projectsByStatus,
      clientsByRisk,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStats };
