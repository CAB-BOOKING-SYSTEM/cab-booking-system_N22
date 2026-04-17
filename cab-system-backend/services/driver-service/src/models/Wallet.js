const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  driverId: { type: String, required: true, unique: true, index: true },
  balance: { type: Number, default: 0, min: 0 }, // Số dư hiện tại
  totalEarned: { type: Number, default: 0 }, // Tổng đã kiếm được
  totalWithdrawn: { type: Number, default: 0 }, // Tổng đã rút
  pendingWithdraw: { type: Number, default: 0 }, // Đang chờ rút
  transactions: [{
    id: { type: String, required: true },
    type: { type: String, enum: ['earn', 'withdraw', 'refund', 'bonus'], required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed', 'cancelled'], default: 'completed' },
    description: { type: String },
    rideId: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Wallet', walletSchema);