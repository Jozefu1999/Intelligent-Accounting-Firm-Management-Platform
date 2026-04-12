const { Project, Client } = require('../models');

const getAll = async (req, res, next) => {
  try {
    const projects = await Project.findAll({
      include: [{ model: Client, as: 'client', attributes: ['id', 'company_name'] }],
    });
    res.json(projects);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [{ model: Client, as: 'client', attributes: ['id', 'company_name'] }],
    });
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }
    res.json(project);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const project = await Project.create(req.body);
    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }
    await project.update(req.body);
    res.json(project);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }
    await project.destroy();
    res.json({ message: 'Project deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove };
