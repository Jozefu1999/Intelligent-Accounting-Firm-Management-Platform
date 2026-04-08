const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { isValidRole, normalizeRole } = require('../utils/roles');

const buildSafeUserPayload = (user) => ({
  id: user.id,
  email: user.email,
  first_name: user.first_name,
  last_name: user.last_name,
  prenom: user.first_name,
  nom: user.last_name,
  role: normalizeRole(user.role),
  created_at: user.created_at || user.createdAt,
});

const ALLOWED_ROLES = [
  'admin',
  'expert',
  'assistant',
  'client',
  'expert_comptable',
  'administrateur',
  'visiteur',
];

const register = async (req, res, next) => {
  try {
    const { email, password, first_name, last_name, prenom, nom, role } = req.body;
    const resolvedFirstName = first_name || prenom;
    const resolvedLastName = last_name || nom;
    const requestedRole = role || 'visiteur';

    if (!email || !password || !resolvedFirstName || !resolvedLastName) {
      return res.status(400).json({ message: 'Missing required registration fields.' });
    }

    if (!isValidRole(requestedRole)) {
      return res.status(400).json({ message: 'Invalid role value.' });
    }

    const resolvedRole = normalizeRole(requestedRole);

    if (role && !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const user = await User.create({
      email,
      password_hash,
      first_name: resolvedFirstName,
      last_name: resolvedLastName,
      role: resolvedRole,
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: normalizeRole(user.role) },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully.',
      token,
      user: buildSafeUserPayload(user),
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: normalizeRole(user.role) },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      message: 'Login successful.',
      token,
      user: buildSafeUserPayload(user),
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash'] },
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json(buildSafeUserPayload(user));
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { email, first_name, last_name, prenom, nom, password } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const nextEmail = email || user.email;
    const nextFirstName = first_name || prenom || user.first_name;
    const nextLastName = last_name || nom || user.last_name;

    if (email && email !== user.email) {
      const alreadyUsed = await User.findOne({ where: { email } });
      if (alreadyUsed && alreadyUsed.id !== user.id) {
        return res.status(400).json({ message: 'Email already in use.' });
      }
    }

    const updates = {
      email: nextEmail,
      first_name: nextFirstName,
      last_name: nextLastName,
    };

    if (password && password.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      updates.password_hash = await bcrypt.hash(password, salt);
    }

    await user.update(updates);

    res.json(buildSafeUserPayload(user));
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, updateProfile };
