require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a SQLite establecida');

    await sequelize.sync({ force: false });
    console.log('✅ Tablas sincronizadas');

    app.listen(PORT, () => {
      console.log(`🚀 Backend corriendo en http://localhost:${PORT}`);
      console.log(`📋 API disponible en http://localhost:${PORT}/api`);
    });
  } catch (err) {
    console.error('❌ Error al iniciar:', err);
    process.exit(1);
  }
}

start();