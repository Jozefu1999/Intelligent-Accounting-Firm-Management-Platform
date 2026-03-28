const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  client_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'clients',
      key: 'id',
    },
  },
  project_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'projects',
      key: 'id',
    },
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  mime_type: {
    type: DataTypes.STRING(100),
  },
  size_bytes: {
    type: DataTypes.BIGINT,
  },
  file_path: {
    type: DataTypes.STRING(500),
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM('financial', 'legal', 'administrative', 'report', 'other'),
  },
  uploaded_by: {
    type: DataTypes.INTEGER,
    references: {
      model: 'users',
      key: 'id',
    },
  },
}, {
  tableName: 'documents',
  timestamps: true,
  updatedAt: false,
  underscored: true,
});

module.exports = Document;
