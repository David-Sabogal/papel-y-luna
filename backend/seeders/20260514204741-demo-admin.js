'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface) => {
    const hash = await bcrypt.hash('admin123', 10);
    const hash2 = await bcrypt.hash('cajero123', 10);
    await queryInterface.bulkInsert('Usuarios', [
      {
        username: 'admin',
        email: 'admin@ftvanguard.com',
        password: hash,
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        username: 'cajero',
        email: 'cajero@ftvanguard.com',
        password: hash2,
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], {});
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('Usuarios', null, {});
  },
};