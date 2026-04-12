const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Ride = sequelize.define("Ride", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  driverId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  pickupLocation: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  dropoffLocation: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM(
      "CREATED",
      "MATCHING",
      "ASSIGNED",
      "PICKUP",
      "IN_PROGRESS",
      "COMPLETED",
      "PAID"
    ),
    defaultValue: "CREATED",
  },
  fare: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: "rides",
  timestamps: true,
});

module.exports = Ride;