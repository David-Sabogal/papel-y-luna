'use strict';

module.exports = (sequelize, DataTypes) => {
  const Producto = sequelize.define('Producto', {
    nombre:      { type: DataTypes.STRING(150), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    precio:      { type: DataTypes.FLOAT, allowNull: false },
    costo:       { type: DataTypes.FLOAT, defaultValue: 0 },
    categoriaId: { type: DataTypes.INTEGER },
    imagen:      { type: DataTypes.STRING(500) },
    badge:       { type: DataTypes.STRING(50) },
    codigoInterno:  { type: DataTypes.STRING(50) },
    codigoBarras:   { type: DataTypes.STRING(50) },
    unidadVenta: {
      type: DataTypes.ENUM('unidad', 'medida'),
      defaultValue: 'unidad',
    },
    stock:           { type: DataTypes.FLOAT, defaultValue: 0 },
    trackInventory:  { type: DataTypes.BOOLEAN, defaultValue: false },
    colors: {
      type: DataTypes.TEXT,
      get() {
        const val = this.getDataValue('colors');
        return val ? JSON.parse(val) : null;
      },
      set(val) {
        this.setDataValue('colors', val ? JSON.stringify(val) : null);
      },
    },
  }, { tableName: 'Productos' });

  Producto.associate = (models) => {
    Producto.belongsTo(models.Categoria, { foreignKey: 'categoriaId' });
    Producto.belongsToMany(models.Venta, {
      through: models.VentaItem,
      foreignKey: 'productoId',
      otherKey: 'ventaId',
    });
  };

  return Producto;
};