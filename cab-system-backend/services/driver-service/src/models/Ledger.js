const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema({
  driverId: {
    type: String,
    required: true,
    index: true,
    ref: 'Driver'
  },
  walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  transactionType: {
    type: String,
    enum: ['earn', 'withdraw', 'refund', 'bonus', 'adjustment'],
    required: true,
    index: true
  },
  // Foreign key references
  referenceId: {
    type: String,
    nullable: true,
    index: true
  },
  referenceType: {
    type: String,
    enum: ['booking', 'payment', 'withdrawal', 'manual', 'system'],
    nullable: true
  },
  // Additional details
  bookingId: {
    type: String,
    nullable: true,
    index: true
  },
  paymentId: {
    type: String,
    nullable: true,
    index: true
  },
  description: String,
  notes: String,
  
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'reversed'],
    default: 'completed',
    index: true
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'ledger_transactions',
  timestamps: true
});

// Compound index for efficient queries
ledgerSchema.index({ driverId: 1, createdAt: -1 });
ledgerSchema.index({ driverId: 1, transactionType: 1, createdAt: -1 });
ledgerSchema.index({ bookingId: 1 });
ledgerSchema.index({ paymentId: 1 });

module.exports = mongoose.model('Ledger', ledgerSchema);
