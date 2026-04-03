const { User } = require('../models');
const { isValidRole, normalizeRole } = require('../utils/roles');

const mapUser = (user) => ({
  id: user.id,
  email: user.email,
  first_name: user.first_name,
  last_name: user.last_name,
  prenom: user.first_name,
  nom: user.last_name,
  role: normalizeRole(user.role),
  created_at: user.created_at || user.createdAt,
});

const getUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'email', 'first_name', 'last_name', 'role', 'created_at'],
      order: [['created_at', 'DESC']],
    });

    res.json(users.map(mapUser));
  } catch (error) {
    next(error);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!isValidRole(role)) {
      return res.status(400).json({ message: 'Invalid role value.' });
    }

    const normalizedRole = normalizeRole(role);

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    await user.update({ role: normalizedRole });

    res.json(mapUser(user));
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const authenticatedUserId = Number(req.user.id);

    if (userId === authenticatedUserId) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    await user.destroy();
    res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  updateUserRole,
  deleteUser,
};
