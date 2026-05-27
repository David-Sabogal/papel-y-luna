'use strict';

module.exports = (sequelize, DataTypes) => {
  const VentaItem = sequelize.define('VentaItem', {
    ventaId:         { type: DataTypes.INTEGER, allowNull: false },
    productoId:      { type: DataTypes.INTEGER, allowNull: true },
    nombreProducto:  { type: DataTypes.STRING(150) }, // se guarda al crear para no perderlo
    quantity:        { type: DataTypes.INTEGER, allowNull: false },
    price:           { type: DataTypes.FLOAT,   allowNull: false },
    subtotal:        { type: DataTypes.FLOAT,   allowNull: false },
    selectedColor:   { type: DataTypes.STRING(50) },
  }, {
    tableName: 'VentaItems',
  });

  VentaItem.associate = (models) => {
    VentaItem.belongsTo(models.Venta,    { foreignKey: 'ventaId' });
    VentaItem.belongsTo(models.Producto, { foreignKey: 'productoId' , onDelete: 'SET NULL'});
  };

  return VentaItem;
};