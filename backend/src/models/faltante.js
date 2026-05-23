'use strict';

module.exports = (sequelize, DataTypes) => {
  const Faltante = sequelize.define('Faltante', {
    nombreProducto: { type: DataTypes.STRING(150), allowNull: false },
    tipo: {
      type: DataTypes.ENUM('agotado', 'no_registrado'),
      allowNull: false,
    },
    cantidad:      { type: DataTypes.INTEGER },
    observacion:   { type: DataTypes.TEXT },
    estado: {
      type: DataTypes.ENUM('pendiente', 'resuelto', 'descartado'),
      defaultValue: 'pendiente',
    },
    productoId:    { type: DataTypes.INTEGER }, // si es agotado
    usuarioId:     { type: DataTypes.INTEGER },
  }, { tableName: 'Faltantes' });

  Faltante.associate = (models) => {
    Faltante.belongsTo(models.Producto, { foreignKey: 'productoId' });
    Faltante.belongsTo(models.Usuario,  { foreignKey: 'usuarioId' });
  };

  return Faltante;
};