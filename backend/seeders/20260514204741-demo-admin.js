'use strict';
const bcrypt = require('bcrypt');

module.exports = {
  async up(queryInterface, Sequelize) {
    const hash = await bcrypt.hash('admin123', 10);
    await queryInterface.bulkInsert('Usuarios', [
      {
        username: 'admin',
        email: 'admin@papeyluna.com',
        password: hash,
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        username: 'cajero',
        email: 'cajero@papeyluna.com',
        password: await bcrypt.hash('cajero123', 10),
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Usuarios', null, {});
  },
};