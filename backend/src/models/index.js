const User = require('./User');
const Client = require('./Client');
const Project = require('./Project');
const Document = require('./Document');
const AiBusinessPlan = require('./AiBusinessPlan');
const ContactMessage = require('./ContactMessage');

// Associations
User.hasMany(Client, { foreignKey: 'assigned_expert_id', as: 'clients' });
Client.belongsTo(User, { foreignKey: 'assigned_expert_id', as: 'assignedExpert' });

Client.hasMany(Project, { foreignKey: 'client_id', as: 'projects' });
Project.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

Client.hasMany(Document, { foreignKey: 'client_id', as: 'documents' });
Document.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

Project.hasMany(Document, { foreignKey: 'project_id', as: 'documents' });
Document.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

User.hasMany(Document, { foreignKey: 'uploaded_by', as: 'uploadedDocuments' });
Document.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

Project.hasMany(AiBusinessPlan, { foreignKey: 'project_id', as: 'businessPlans' });
AiBusinessPlan.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

User.hasMany(AiBusinessPlan, { foreignKey: 'generated_by', as: 'generatedPlans' });
AiBusinessPlan.belongsTo(User, { foreignKey: 'generated_by', as: 'generator' });

User.hasMany(ContactMessage, { foreignKey: 'user_id', as: 'contactMessages' });
ContactMessage.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Project.hasMany(ContactMessage, { foreignKey: 'project_id', as: 'contactMessages' });
ContactMessage.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

module.exports = {
  User,
  Client,
  Project,
  Document,
  AiBusinessPlan,
  ContactMessage,
};
