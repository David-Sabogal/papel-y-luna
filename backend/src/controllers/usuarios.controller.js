const { Usuario } = require('../models');

exports.list = async (req, res, next) => {
  try {
    const users = await Usuario.findAll({
      attributes: { exclude: ['password'] },
    });
    res.json(users);
  } catch (err) { next(err); }
};

exports.show = async (req, res, next) => {
  try {
    const u = await Usuario.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
    });
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(u);
  } catch (err) { next(err); }
};

exports.updateRole = async (req, res, next) => {
  try {
    const u = await Usuario.findByPk(req.params.id);
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
    const { role } = req.body;
    if (!['USER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'role debe ser USER o ADMIN' });
    }
    await u.update({ role });
    res.json({ id: u.id, username: u.username, role: u.role });
  } catch (err) { next(err); }
};

exports.destroy = async (req, res, next) => {
  try {
    const u = await Usuario.findByPk(req.params.id);
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
    await u.destroy();
    res.status(204).send();
  } catch (err) { next(err); }
};