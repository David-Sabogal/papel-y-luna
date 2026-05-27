'use strict';

module.exports = (sequelize, DataTypes) => {
  const Venta = sequelize.define('Venta', {
    estado: {
      type: DataTypes.ENUM('abierta', 'guardada', 'cerrada', 'anulada'),
      defaultValue: 'abierta',
    },
    clienteId:      { type: DataTypes.INTEGER },
    descuentoId:    { type: DataTypes.INTEGER },
    descuentoValor: { type: DataTypes.FLOAT, defaultValue: 0 },
    subtotal:       { type: DataTypes.FLOAT, defaultValue: 0 },
    iva:            { type: DataTypes.FLOAT, defaultValue: 0 },
    total:          { type: DataTypes.FLOAT, defaultValue: 0 },
    metodoPago: {
      type: DataTypes.ENUM('Efectivo', 'Nequi', 'Débito', 'Debe'),
    },
    valorRecibido:    { type: DataTypes.FLOAT, defaultValue: 0 },
    cambio:           { type: DataTypes.FLOAT, defaultValue: 0 },
    saldoDebe:        { type: DataTypes.FLOAT, defaultValue: 0 },
    fueCOrregida:     { type: DataTypes.BOOLEAN, defaultValue: false },
    corregidaPor:     { type: DataTypes.INTEGER },
    corregidaEn:      { type: DataTypes.DATE },
    snapshotAnterior: { type: DataTypes.TEXT },
    usuarioId:        { type: DataTypes.INTEGER },
  }, { tableName: 'Ventas' });

  Venta.associate = (models) => {
    Venta.hasMany(models.VentaItem,  { foreignKey: 'ventaId', as: 'items' });
    Venta.belongsTo(models.Cliente,  { foreignKey: 'clienteId' });
    Venta.belongsTo(models.Descuento,{ foreignKey: 'descuentoId' });
    Venta.belongsTo(models.Usuario,  { foreignKey: 'usuarioId' });
    Venta.hasMany(models.Reembolso,  { foreignKey: 'ventaId' });
    Venta.belongsToMany(models.Producto, {
      through: models.VentaItem,
      foreignKey: 'ventaId',
      otherKey: 'productoId',
    });
  };

  return Venta;
};