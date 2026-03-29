const { Client, User } = require('../models');

const cleanOptionalString = (value, toLowerCase = false) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return undefined;
  }

  return toLowerCase ? trimmedValue.toLowerCase() : trimmedValue;
};

const getAll = async (req, res, next) => {
  try {
    const clients = await Client.findAll({
      include: [{ model: User, as: 'assignedExpert', attributes: ['id', 'first_name', 'last_name'] }],
    });
    res.json(clients);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const client = await Client.findByPk(req.params.id, {
      include: [{ model: User, as: 'assignedExpert', attributes: ['id', 'first_name', 'last_name'] }],
    });
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
    const {
      company_name,
      siret,
      address,
      city,
      phone,
      email,
      contact_person,
      annual_revenue,
      sector,
      risk_level,
      status,
      notes,
      assigned_expert_id,
    } = req.body;

    const normalizedCompanyName = cleanOptionalString(company_name);
    if (!normalizedCompanyName) {
      return res.status(400).json({ message: 'Company name is required.' });
    }

    let normalizedAnnualRevenue;
    if (annual_revenue !== undefined && annual_revenue !== null && annual_revenue !== '') {
      normalizedAnnualRevenue = Number(annual_revenue);
      if (Number.isNaN(normalizedAnnualRevenue) || normalizedAnnualRevenue < 0) {
        return res.status(400).json({ message: 'Annual revenue must be a valid positive number.' });
      }
    }

    const clientPayload = {
      company_name: normalizedCompanyName,
      siret: cleanOptionalString(siret),
      address: cleanOptionalString(address),
      city: cleanOptionalString(city),
      phone: cleanOptionalString(phone),
      email: cleanOptionalString(email, true),
      contact_person: cleanOptionalString(contact_person),
      annual_revenue: normalizedAnnualRevenue,
      sector: cleanOptionalString(sector),
      risk_level: cleanOptionalString(risk_level),
      status: cleanOptionalString(status),
      notes: cleanOptionalString(notes),
    };

    if (req.user.role === 'assistant') {
      clientPayload.assigned_expert_id = req.user.id;
    } else if (assigned_expert_id !== undefined && assigned_expert_id !== null && assigned_expert_id !== '') {
      const assignedUser = await User.findByPk(assigned_expert_id, {
        attributes: ['id', 'role'],
      });

      if (!assignedUser) {
        return res.status(400).json({ message: 'Assigned user not found.' });
      }

      if (!['expert', 'assistant'].includes(assignedUser.role)) {
        return res.status(400).json({ message: 'Assigned user must be expert or assistant.' });
      }

      clientPayload.assigned_expert_id = assignedUser.id;
    }

    const client = await Client.create(clientPayload);
    const createdClient = await Client.findByPk(client.id, {
      include: [{ model: User, as: 'assignedExpert', attributes: ['id', 'first_name', 'last_name'] }],
    });

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
    await client.update(req.body);
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
