'use strict';

module.exports = (sequelize, DataTypes) => {
  const Categoria = sequelize.define('Categoria', {
    nombre: { type: DataTypes.STRING(80), allowNull: false },
    color:  { type: DataTypes.STRING(20) },
    icono:  { type: DataTypes.STRING(50) },
  }, { tableName: 'Categorias' });

  Categoria.associate = (models) => {
    Categoria.hasMany(models.Producto, { foreignKey: 'categoriaId' });
  };

  return Categoria;
};