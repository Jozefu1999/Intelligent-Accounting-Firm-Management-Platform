const { Client, User, Project } = require('../models');

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

const getAll = async (req, res, next) => {
  try {
    const clients = await Client.findAll({ include: clientInclude });
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
    res.json(client);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const clientData = normalizeCreatePayload(req.body);
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

    const clientData = normalizeCreatePayload(req.body);
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
    await client.destroy();
    res.json({ message: 'Client deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove };
