'use strict';

module.exports = (sequelize, DataTypes) => {
  const ReembolsoItem = sequelize.define('ReembolsoItem', {
    reembolsoId:   { type: DataTypes.INTEGER, allowNull: false },
    ventaItemId:   { type: DataTypes.INTEGER, allowNull: false },
    productoId:    { type: DataTypes.INTEGER, allowNull: false },
    cantidad:      { type: DataTypes.INTEGER, allowNull: false },
    montoReembolso: { type: DataTypes.FLOAT, allowNull: false },
    retornaInventario: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { tableName: 'ReembolsoItems' });

  ReembolsoItem.associate = (models) => {
    ReembolsoItem.belongsTo(models.Reembolso, { foreignKey: 'reembolsoId' });
    ReembolsoItem.belongsTo(models.Producto,  { foreignKey: 'productoId' });
  };

  return ReembolsoItem;
};