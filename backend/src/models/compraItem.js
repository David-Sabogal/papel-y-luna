'use strict';

module.exports = (sequelize, DataTypes) => {
  const CompraItem = sequelize.define('CompraItem', {
    compraId:       { type: DataTypes.INTEGER, allowNull: false },
    productoId:     { type: DataTypes.INTEGER, allowNull: true }, // null si el producto fue eliminado
    nombreProducto: { type: DataTypes.STRING(150) },
    cantidad:       { type: DataTypes.INTEGER, allowNull: false },
    costoUnitario:  { type: DataTypes.FLOAT, allowNull: false },
    subtotal:       { type: DataTypes.FLOAT, allowNull: false },
  }, { tableName: 'CompraItems' });

  CompraItem.associate = (models) => {
    CompraItem.belongsTo(models.Compra,   { foreignKey: 'compraId' });
    CompraItem.belongsTo(models.Producto, { foreignKey: 'productoId' });
  };

  return CompraItem;
};