'use strict';

module.exports = (sequelize, DataTypes) => {
  const Cliente = sequelize.define('Cliente', {
    nombre:    { type: DataTypes.STRING(150), allowNull: false },
    documento: { type: DataTypes.STRING(30) },
    telefono:  { type: DataTypes.STRING(20) },
    email:     { type: DataTypes.STRING(100) },
    saldoDebe: { type: DataTypes.FLOAT, defaultValue: 0 },
  }, { tableName: 'Clientes' });

  Cliente.associate = (models) => {
    Cliente.hasMany(models.Venta, { foreignKey: 'clienteId' });
  };

  return Cliente;
};