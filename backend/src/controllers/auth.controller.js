const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const { User } = require('../models');
const { isValidRole, normalizeRole } = require('../utils/roles');

const buildSafeUserPayload = (user) => ({
  id: user.id,
  email: user.email,
  first_name: user.first_name,
  last_name: user.last_name,
  prenom: user.first_name,
  nom: user.last_name,
  role: normalizeRole(user.role) || 'client',
  created_at: user.created_at || user.createdAt,
});

const ALLOWED_ROLES = [
  'admin',
  'expert',
  'assistant',
  'client',
  'expert_comptable',
  'administrateur',
];

const register = async (req, res, next) => {
  try {
    const { email, password, first_name, last_name, prenom, nom, role, assigned_expert_id } = req.body;
    const resolvedFirstName = first_name || prenom;
    const resolvedLastName = last_name || nom;
    const requestedRole = role || 'client';

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
      assigned_expert_id: resolvedRole === 'client' ? (assigned_expert_id || null) : null,
    });

    // Reload to ensure DB-persisted values (especially role ENUM)
    await user.reload();

    const finalRole = normalizeRole(user.role || resolvedRole);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: finalRole },
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

    const userRole = normalizeRole(user.role);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: userRole },
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

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'currentPassword and newPassword are required.' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ message: 'Mot de passe actuel incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await user.update({ password_hash: passwordHash });

    res.json({ message: 'Mot de passe modifie avec succes.' });
  } catch (error) {
    next(error);
  }
};

// ─── Google OAuth ────────────────────────────────────────────────────────────

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleLogin = async (req, res, next) => {
  try {
    const { credential, role } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required.' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, given_name, family_name } = payload;

    let user = await User.findOne({ where: { email } });

    if (!user) {
      // Create new user from Google data
      const resolvedRole = normalizeRole(role || 'client');
      user = await User.create({
        email,
        password_hash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
        first_name: given_name || 'User',
        last_name: family_name || '',
        role: resolvedRole,
      });
    }

    const userRole = normalizeRole(user.role) || 'client';

    const token = jwt.sign(
      { id: user.id, email: user.email, role: userRole },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      message: 'Google login successful.',
      token,
      user: buildSafeUserPayload(user),
    });
  } catch (error) {
    if (error.message?.includes('Token used too late') || error.message?.includes('Invalid token')) {
      return res.status(401).json({ message: 'Invalid Google credential.' });
    }
    next(error);
  }
};

// ─── Forgot Password ─────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const user = await User.findOne({ where: { email } });

    // Always respond success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If this email exists, a reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await user.update({
      reset_token: resetTokenHash,
      reset_token_expires: resetExpires,
    });

    // Send email
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    await transporter.sendMail({
      from: `"Clean Ledger" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Réinitialisation de votre mot de passe',
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #0f172a; font-size: 24px;">Réinitialisation du mot de passe</h2>
          <p style="color: #475569; font-size: 16px; line-height: 1.6;">
            Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour continuer :
          </p>
          <a href="${resetUrl}" style="display: inline-block; margin: 24px 0; padding: 14px 28px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Réinitialiser le mot de passe
          </a>
          <p style="color: #94a3b8; font-size: 14px;">
            Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.
          </p>
        </div>
      `,
    });

    res.json({ message: 'If this email exists, a reset link has been sent.' });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, email, password } = req.body;

    if (!token || !email || !password) {
      return res.status(400).json({ message: 'Token, email, and new password are required.' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({ where: { email } });

    if (!user || user.reset_token !== resetTokenHash) {
      return res.status(400).json({ message: 'Invalid or expired reset token.' });
    }

    if (new Date() > new Date(user.reset_token_expires)) {
      return res.status(400).json({ message: 'Reset token has expired.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await user.update({
      password_hash: passwordHash,
      reset_token: null,
      reset_token_expires: null,
    });

    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (error) {
    next(error);
  }
};

const getExperts = async (req, res, next) => {
  try {
    const experts = await User.findAll({
      where: { role: 'expert_comptable' },
      attributes: ['id', 'first_name', 'last_name', 'email'],
      order: [['last_name', 'ASC']],
    });
    res.json(experts);
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, updateProfile, changePassword, googleLogin, forgotPassword, resetPassword, getExperts };
