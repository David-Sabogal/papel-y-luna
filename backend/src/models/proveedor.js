'use strict';

module.exports = (sequelize, DataTypes) => {
  const Proveedor = sequelize.define('Proveedor', {
    nombre:   { type: DataTypes.STRING(150), allowNull: false },
    nit:      { type: DataTypes.STRING(30) },
    telefono: { type: DataTypes.STRING(20) },
    email:    { type: DataTypes.STRING(100) },
    direccion: { type: DataTypes.STRING(200) },
  }, { tableName: 'Proveedores' });

  Proveedor.associate = (models) => {
    Proveedor.hasMany(models.Compra, { foreignKey: 'proveedorId' });
  };

  return Proveedor;
};