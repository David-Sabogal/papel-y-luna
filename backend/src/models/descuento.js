'use strict';

module.exports = (sequelize, DataTypes) => {
  const Descuento = sequelize.define('Descuento', {
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    tipo:   {
      type: DataTypes.ENUM('porcentaje', 'fijo'),
      allowNull: false,
    },
    valor:  { type: DataTypes.FLOAT, allowNull: false },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { tableName: 'Descuentos' });

  Descuento.associate = (models) => {
    Descuento.hasMany(models.Venta, { foreignKey: 'descuentoId' });
  };

  return Descuento;
};