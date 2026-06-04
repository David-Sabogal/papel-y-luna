'use strict';

module.exports = (sequelize, DataTypes) => {
  const Capital = sequelize.define('Capital', {
    descripcion: { type: DataTypes.STRING(200), allowNull: false },
    monto:       { type: DataTypes.FLOAT, allowNull: false },
    fecha:       { type: DataTypes.DATEONLY, allowNull: false },
    tipo: {
      type: DataTypes.ENUM('inicial', 'aporte'),
      defaultValue: 'aporte',
    },
    usuarioId: { type: DataTypes.INTEGER },
  }, { tableName: 'Capital' });

  Capital.associate = (models) => {
    Capital.belongsTo(models.Usuario, { foreignKey: 'usuarioId' });
  };

  return Capital;
};