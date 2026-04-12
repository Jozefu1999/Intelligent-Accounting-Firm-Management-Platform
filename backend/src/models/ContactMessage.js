const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ContactMessage = sequelize.define('ContactMessage', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  nom: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: { isEmail: true },
  },
  sujet: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'projects',
      key: 'id',
    },
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  statut: {
    type: DataTypes.ENUM('envoye', 'lu', 'repondu'),
    defaultValue: 'envoye',
  },
}, {
  tableName: 'contact_messages',
  timestamps: true,
  updatedAt: false,
  underscored: true,
});

module.exports = ContactMessage;
