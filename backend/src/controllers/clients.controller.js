const { Client, User } = require('../models');

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
    const client = await Client.create(req.body);
    res.status(201).json(client);
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
