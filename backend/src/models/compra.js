'use strict';

module.exports = (sequelize, DataTypes) => {
  const Compra = sequelize.define('Compra', {
    proveedorId:   { type: DataTypes.INTEGER, allowNull: true },
    metodoPago:    {
      type: DataTypes.ENUM('Efectivo', 'Nequi', 'Consignacion'),
      allowNull: false,
    },
    total:         { type: DataTypes.FLOAT, allowNull: false },
    observaciones: { type: DataTypes.TEXT },
    usuarioId:     { type: DataTypes.INTEGER },
  }, { tableName: 'Compras' });

  Compra.associate = (models) => {
    Compra.belongsTo(models.Proveedor, { foreignKey: 'proveedorId' });
    Compra.hasMany(models.CompraItem,  { foreignKey: 'compraId' });
    Compra.belongsTo(models.Usuario,   { foreignKey: 'usuarioId' });
  };

  return Compra;
};