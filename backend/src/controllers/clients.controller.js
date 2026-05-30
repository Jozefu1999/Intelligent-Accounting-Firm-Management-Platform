const { Client, User, Project } = require('../models');
const { normalizeRole } = require('../utils/roles');
const { Op } = require('sequelize');

const clientInclude = [
  { model: User, as: 'assignedExpert', attributes: ['id', 'first_name', 'last_name'] },
  { model: Project, as: 'projects', attributes: ['id', 'name', 'status', 'priority'] },
];

const normalizeEmailValue = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  const normalizedValue = value.trim().toLowerCase();
  const [localPart, ...domainParts] = normalizedValue.split('@');

  if (!localPart || domainParts.length === 0) {
    return normalizedValue;
  }

  const normalizedDomain = domainParts.join('@')
    .replace(/\.+/g, '.')
    .replace(/^\./, '')
    .replace(/\.$/, '');

  return `${localPart}@${normalizedDomain}`;
};

const normalizeCreatePayload = (body = {}) => {
  const clientData = { ...body };

  const companyName = body.company_name ?? body.name;
  const username = body.contact_person ?? body.username;
  const email = body.email ?? body.mail;
  const address = body.address ?? body.adresse;

  if (typeof companyName === 'string') {
    clientData.company_name = companyName.trim();
  }

  if (typeof username === 'string') {
    clientData.contact_person = username.trim();
  }

  if (typeof body.phone === 'string') {
    clientData.phone = body.phone.trim();
  }

  if (typeof email === 'string') {
    const normalizedEmail = normalizeEmailValue(email);
    if (normalizedEmail) {
      clientData.email = normalizedEmail;
    } else {
      delete clientData.email;
    }
  }

  if (typeof address === 'string') {
    clientData.address = address.trim();
  }

  delete clientData.name;
  delete clientData.username;
  delete clientData.mail;
  delete clientData.adresse;
  delete clientData.project_name;
  delete clientData.projectName;

  return clientData;
};

const isAssistantUser = (user) => normalizeRole(user?.role) === 'assistant';

const isAssistantOwner = (client, userId) => Number(client?.assigned_expert_id) === Number(userId);

const normalizeClientStatusFilter = (rawStatus) => {
  if (typeof rawStatus !== 'string') {
    return null;
  }

  const status = rawStatus.trim().toLowerCase();
  if (!status) {
    return null;
  }

  if (status === 'actif') {
    return 'active';
  }

  if (status === 'inactif') {
    return 'inactive';
  }

  if (['active', 'inactive', 'prospect'].includes(status)) {
    return status;
  }

  return null;
};

const getAll = async (req, res, next) => {
  try {
    const requestedStatus = normalizeClientStatusFilter(req.query?.status);
    const where = {};

    if (requestedStatus) {
      where.status = requestedStatus;
    }

    const clients = await Client.findAll({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: clientInclude,
    });
    res.json(clients);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const client = await Client.findByPk(req.params.id, { include: clientInclude });
    if (!client) {
      return res.status(404).json({ message: 'Client not found.' });
    }

    if (isAssistantUser(req.user) && !isAssistantOwner(client, req.user.id)) {
      return res.status(403).json({ message: 'Forbidden. You can only access clients linked to your account.' });
    }

    res.json(client);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const clientData = normalizeCreatePayload(req.body);

    if (isAssistantUser(req.user)) {
      clientData.assigned_expert_id = req.user.id;
    }

    const client = await Client.create(clientData);

    const createdClient = await Client.findByPk(client.id, { include: clientInclude });
    res.status(201).json(createdClient);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const client = await Client.findByPk(req.params.id);
    if (!client) {
      return res.status(404).json({ message: 'Client not found.' });
    }

    if (isAssistantUser(req.user) && !isAssistantOwner(client, req.user.id)) {
      return res.status(403).json({ message: 'Forbidden. You can only update clients linked to your account.' });
    }

    const clientData = normalizeCreatePayload(req.body);

    if (isAssistantUser(req.user)) {
      clientData.assigned_expert_id = req.user.id;
    }

    await client.update(clientData);
    res.json(client);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const client = await Client.findByPk(req.params.id);
    if (!client) {
      return res.status(404).json({ message: 'Client not found.' });
    }

    if (isAssistantUser(req.user) && !isAssistantOwner(client, req.user.id)) {
      return res.status(403).json({ message: 'Forbidden. You can only delete clients linked to your account.' });
    }

    await client.destroy();
    res.json({ message: 'Client deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

const getMyPlatformClients = async (req, res, next) => {
  try {
    const expertId = req.user.id;
    const { search, status } = req.query;

    // Find all client records assigned to this expert
    const clientRecords = await Client.findAll({
      where: { assigned_expert_id: expertId },
      include: [{ model: Project, as: 'projects', attributes: ['id', 'name', 'status', 'priority', 'type'] }],
    });

    // For each client record, find the matching user by email
    const result = await Promise.all(clientRecords.map(async (clientRecord) => {
      const user = clientRecord.email
        ? await User.findOne({
            where: { email: clientRecord.email, role: 'client' },
            attributes: ['id', 'first_name', 'last_name', 'email', 'created_at'],
          })
        : null;

      const projects = clientRecord.projects || [];
      let clientStatus = 'registered';
      if (projects.length > 0) {
        clientStatus = 'active';
      }

      return {
        id: user?.id || null,
        first_name: user?.first_name || clientRecord.contact_person?.split(' ')[0] || '',
        last_name: user?.last_name || clientRecord.contact_person?.split(' ').slice(1).join(' ') || '',
        email: clientRecord.email || user?.email || '',
        company_name: clientRecord.company_name,
        created_at: user?.created_at || clientRecord.created_at,
        client_id: clientRecord.id,
        status: clientStatus,
        projects,
      };
    }));

    // Apply search filter
    let filtered = result;
    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.first_name?.toLowerCase().includes(term) ||
          r.last_name?.toLowerCase().includes(term) ||
          r.email?.toLowerCase().includes(term) ||
          r.company_name?.toLowerCase().includes(term),
      );
    }

    // Apply status filter
    if (status) {
      filtered = filtered.filter((r) => r.status === status);
    }

    res.json(filtered);
  } catch (error) {
    next(error);
  }
};

const assignProject = async (req, res, next) => {
  try {
    const expertId = req.user.id;
    const { user_id, project_id } = req.body;

    if (!user_id || !project_id) {
      return res.status(400).json({ message: 'user_id and project_id are required.' });
    }

    // Verify the user is a client assigned to this expert (via clients table)
    const targetUser = await User.findOne({
      where: { id: user_id, role: 'client' },
      attributes: ['id', 'first_name', 'last_name', 'email'],
    });

    if (!targetUser) {
      return res.status(404).json({ message: 'Client user not found.' });
    }

    // Verify the client record is assigned to this expert
    const clientRecord = await Client.findOne({ where: { email: targetUser.email, assigned_expert_id: expertId } });
    if (!clientRecord) {
      return res.status(403).json({ message: 'Client user not found or not assigned to you.' });
    }

    // Verify the project exists
    const project = await Project.findByPk(project_id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    // Assign the project to this client
    await project.update({ client_id: clientRecord.id });

    res.json({ message: 'Project assigned successfully.', project, client: clientRecord });
  } catch (error) {
    next(error);
  }
};

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

    await project.update({ client_id: null });

    res.json({ message: 'Project unassigned successfully.' });
  } catch (error) {
    next(error);
  }
};

const getMyClientProfile = async (req, res, next) => {
  try {
    const userEmail = req.user.email;
    const client = await Client.findOne({
      where: { email: userEmail },
      include: [{ model: Project, as: 'projects', attributes: ['id', 'name', 'status', 'priority'] }],
    });

    if (!client) {
      return res.status(404).json({ message: 'No client profile found for your account.' });
    }

    res.json(client);
  } catch (error) {
    next(error);
  }
};

const updateMyClientProfile = async (req, res, next) => {
  try {
    const userEmail = req.user.email;
    const client = await Client.findOne({ where: { email: userEmail } });

    if (!client) {
      return res.status(404).json({ message: 'No client profile found for your account.' });
    }

    const allowedFields = ['company_name', 'siret', 'address', 'city', 'phone', 'sector', 'annual_revenue', 'contact_person', 'notes'];
    const updateData = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = typeof req.body[field] === 'string' ? req.body[field].trim() : req.body[field];
      }
    }

    await client.update(updateData);
    res.json(client);
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove, getMyPlatformClients, assignProject, unassignProject, getMyClientProfile, updateMyClientProfile };
