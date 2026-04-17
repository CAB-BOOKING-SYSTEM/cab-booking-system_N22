 
const Wallet = require('../models/Wallet');
const DriverEarning = require('../models/DriverEarning');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class WalletService {
  // Tạo ví cho tài xế mới
  async createWallet(driverId) {
    try {
      const existingWallet = await Wallet.findOne({ driverId });
      if (existingWallet) return existingWallet;
      
      const wallet = new Wallet({
        driverId,
        balance: 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        transactions: []
      });
      await wallet.save();
      logger.info(`Wallet created for driver ${driverId}`);
      return wallet;
    } catch (error) {
      logger.error('Error creating wallet:', error);
      throw error;
    }
  }

  // Lấy thông tin ví
  async getWallet(driverId) {
    try {
      let wallet = await Wallet.findOne({ driverId });
      if (!wallet) {
        wallet = await this.createWallet(driverId);
      }
      return wallet;
    } catch (error) {
      logger.error('Error getting wallet:', error);
      throw error;
    }
  }

  // Cộng tiền vào ví (khi hoàn thành chuyến)
  async addEarning(driverId, amount, rideId, description = '') {
    try {
      const wallet = await this.getWallet(driverId);
      
      const transaction = {
        id: uuidv4(),
        type: 'earn',
        amount: amount,
        status: 'completed',
        description: description || `Thu nhập từ chuyến ${rideId}`,
        rideId: rideId,
        createdAt: new Date()
      };
      
      wallet.balance += amount;
      wallet.totalEarned += amount;
      wallet.transactions.push(transaction);
      wallet.updatedAt = new Date();
      
      await wallet.save();
      
      logger.info(`Added ${amount} to wallet of driver ${driverId}`);
      return { success: true, balance: wallet.balance, transaction };
    } catch (error) {
      logger.error('Error adding earning:', error);
      throw error;
    }
  }

  // Yêu cầu rút tiền
  async requestWithdraw(driverId, amount, bankAccount) {
    try {
      if (amount < 10000) {
        throw new Error('Số tiền rút tối thiểu là 10,000đ');
      }
      
      const wallet = await this.getWallet(driverId);
      
      if (wallet.balance < amount) {
        throw new Error(`Số dư không đủ. Hiện tại: ${wallet.balance.toLocaleString()}đ`);
      }
      
      const transaction = {
        id: uuidv4(),
        type: 'withdraw',
        amount: amount,
        status: 'pending',
        description: `Rút tiền về tài khoản ${bankAccount?.bankName || 'ngân hàng'}`,
        createdAt: new Date()
      };
      
      wallet.balance -= amount;
      wallet.pendingWithdraw += amount;
      wallet.transactions.push(transaction);
      wallet.updatedAt = new Date();
      
      await wallet.save();
      
      logger.info(`Withdraw request of ${amount} from driver ${driverId}`);
      return { 
        success: true, 
        message: 'Yêu cầu rút tiền đã được ghi nhận, đang chờ xử lý',
        transaction,
        remainingBalance: wallet.balance
      };
    } catch (error) {
      logger.error('Error requesting withdraw:', error);
      throw error;
    }
  }

  // Xác nhận rút tiền thành công (gọi từ admin)
  async confirmWithdraw(driverId, transactionId) {
    try {
      const wallet = await Wallet.findOne({ driverId });
      if (!wallet) throw new Error('Wallet not found');
      
      const transaction = wallet.transactions.find(t => t.id === transactionId);
      if (!transaction) throw new Error('Transaction not found');
      if (transaction.status !== 'pending') throw new Error('Transaction already processed');
      
      transaction.status = 'completed';
      wallet.totalWithdrawn += transaction.amount;
      wallet.pendingWithdraw -= transaction.amount;
      wallet.updatedAt = new Date();
      
      await wallet.save();
      
      return { success: true, message: 'Rút tiền thành công' };
    } catch (error) {
      logger.error('Error confirming withdraw:', error);
      throw error;
    }
  }

  // Lấy lịch sử giao dịch
  async getTransactionHistory(driverId, page = 1, limit = 20) {
    try {
      const wallet = await this.getWallet(driverId);
      const transactions = wallet.transactions
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice((page - 1) * limit, page * limit);
      
      return {
        transactions,
        total: wallet.transactions.length,
        page,
        limit,
        balance: wallet.balance
      };
    } catch (error) {
      logger.error('Error getting transaction history:', error);
      throw error;
    }
  }

  // Cập nhật thu nhập từ DriverEarning (sync)
  async syncEarnings(driverId) {
    try {
      const earnings = await DriverEarning.find({ driverId });
      const totalEarned = earnings.reduce((sum, e) => sum + e.totalAmount, 0);
      
      const wallet = await this.getWallet(driverId);
      wallet.totalEarned = totalEarned;
      await wallet.save();
      
      return wallet;
    } catch (error) {
      logger.error('Error syncing earnings:', error);
      throw error;
    }
  }
}

module.exports = new WalletService();