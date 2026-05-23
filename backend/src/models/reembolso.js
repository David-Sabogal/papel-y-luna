'use strict';

module.exports = (sequelize, DataTypes) => {
  const Reembolso = sequelize.define('Reembolso', {
    ventaId:       { type: DataTypes.INTEGER, allowNull: false },
    tipo:          { type: DataTypes.ENUM('total', 'parcial'), allowNull: false },
    montoTotal:    { type: DataTypes.FLOAT, allowNull: false },
    fuente:        { type: DataTypes.STRING(50), defaultValue: 'Caja' },
    observaciones: { type: DataTypes.TEXT },
    usuarioId:     { type: DataTypes.INTEGER },
  }, { tableName: 'Reembolsos' });

  Reembolso.associate = (models) => {
    Reembolso.belongsTo(models.Venta,   { foreignKey: 'ventaId' });
    Reembolso.hasMany(models.ReembolsoItem, { foreignKey: 'reembolsoId' });
    Reembolso.belongsTo(models.Usuario, { foreignKey: 'usuarioId' });
  };

  return Reembolso;
};