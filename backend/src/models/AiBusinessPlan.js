const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AiBusinessPlan = sequelize.define('AiBusinessPlan', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'projects',
      key: 'id',
    },
  },
  content: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  generated_by: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id',
    },
  },
}, {
  tableName: 'ai_business_plans',
  timestamps: true,
  updatedAt: false,
  underscored: true,
});

module.exports = AiBusinessPlan;
