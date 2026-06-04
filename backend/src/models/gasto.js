'use strict';

module.exports = (sequelize, DataTypes) => {
  const Gasto = sequelize.define('Gasto', {
    descripcion: { type: DataTypes.STRING(200), allowNull: false },
    categoria: {
      type: DataTypes.ENUM('servicios', 'gasolina', 'mantenimiento', 'arriendo', 'nomina', 'publicidad', 'otro'),
      defaultValue: 'otro',
    },
    monto:     { type: DataTypes.FLOAT, allowNull: false },
    fecha:     { type: DataTypes.DATEONLY, allowNull: false },
    usuarioId: { type: DataTypes.INTEGER },
  }, { tableName: 'Gastos' });

  Gasto.associate = (models) => {
    Gasto.belongsTo(models.Usuario, { foreignKey: 'usuarioId' });
  };

  return Gasto;
};