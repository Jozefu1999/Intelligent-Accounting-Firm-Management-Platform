const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  client_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'clients',
      key: 'id',
    },
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  type: {
    type: DataTypes.ENUM('creation', 'development', 'audit', 'consulting', 'other'),
  },
  status: {
    type: DataTypes.ENUM('draft', 'in_progress', 'completed', 'cancelled'),
    defaultValue: 'draft',
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium',
  },
  risk_score: {
    type: DataTypes.DECIMAL(5, 2),
  },
  estimated_budget: {
    type: DataTypes.DECIMAL(15, 2),
  },
  start_date: {
    type: DataTypes.DATEONLY,
  },
  due_date: {
    type: DataTypes.DATEONLY,
  },
}, {
  tableName: 'projects',
  timestamps: true,
  underscored: true,
});

module.exports = Project;
