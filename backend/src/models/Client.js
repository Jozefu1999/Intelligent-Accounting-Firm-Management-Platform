const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Client = sequelize.define('Client', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  company_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  siret: {
    type: DataTypes.STRING(14),
  },
  address: {
    type: DataTypes.TEXT,
  },
  city: {
    type: DataTypes.STRING(100),
  },
  phone: {
    type: DataTypes.STRING(20),
  },
  email: {
    type: DataTypes.STRING(255),
    validate: { isEmail: true },
  },
  contact_person: {
    type: DataTypes.STRING(200),
  },
  annual_revenue: {
    type: DataTypes.DECIMAL(15, 2),
  },
  sector: {
    type: DataTypes.STRING(100),
  },
  risk_level: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium',
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'prospect'),
    defaultValue: 'active',
  },
  notes: {
    type: DataTypes.TEXT,
  },
  assigned_expert_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id',
    },
  },
}, {
  tableName: 'clients',
  timestamps: true,
  underscored: true,
});

module.exports = Client;
