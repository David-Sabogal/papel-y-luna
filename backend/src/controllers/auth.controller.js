const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    const existe = await Usuario.findOne({ where: { username } });
    if (existe) {
      return res.status(409).json({ error: 'El username ya está en uso' });
    }

    // El hook beforeCreate hashea la contraseña automáticamente
    const user = await Usuario.create({ username, email, password, role: 'USER' });

    res.status(201).json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const user = await Usuario.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const valid = await user.validarPassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { sub: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      token,
      token_type: 'bearer',
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (err) { next(err); }
};

exports.me = (req, res) => {
  res.json(req.user);
};