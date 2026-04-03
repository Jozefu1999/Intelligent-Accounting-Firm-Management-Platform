const { User } = require('../models');
const { isValidRole, normalizeRole } = require('../utils/roles');

const getAll = async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password_hash'] },
    });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash'] },
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const { first_name, last_name, email, role } = req.body;

    if (role && !isValidRole(role)) {
      return res.status(400).json({ message: 'Invalid role value.' });
    }

    const normalizedRole = role ? normalizeRole(role) : user.role;

    await user.update({ first_name, last_name, email, role: normalizedRole });

    const userData = user.toJSON();
    delete userData.password_hash;
    res.json(userData);
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    await user.destroy();
    res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, update, remove };
