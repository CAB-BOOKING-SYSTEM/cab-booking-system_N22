// tokenBlacklist.js
const redis = require('redis');
const { promisify } = require('util');

class TokenBlacklistService {
  constructor(redisClient) {
    this.client = redisClient;
    this.setAsync = promisify(redisClient.set).bind(redisClient);
    this.getAsync = promisify(redisClient.get).bind(redisClient);
    this.delAsync = promisify(redisClient.del).bind(redisClient);
    this.existsAsync = promisify(redisClient.exists).bind(redisClient);
  }

  /**
   * Thêm token vào blacklist
   * @param {string} token - JWT token
   * @param {number} expiresIn - Thời gian hết hạn (giây)
   */
  async blacklistToken(token, expiresIn) {
    const key = `token:blacklist:${token}`;
    await this.setAsync(key, JSON.stringify({
      blacklistedAt: new Date().toISOString(),
      reason: 'user_logout'
    }), 'EX', expiresIn);
  }

  /**
   * Kiểm tra token có bị blacklist hay không
   */
  async isBlacklisted(token) {
    const key = `token:blacklist:${token}`;
    const exists = await this.existsAsync(key);
    return exists === 1;
  }

  /**
   * Thu hồi tất cả refresh tokens của user
   */
  async revokeUserTokens(userId, tokens = []) {
    if (tokens.length === 0) {
      // Revoke tất cả tokens của user
      const key = `user:${userId}:sessions:*`;
      const sessionKeys = await promisify(this.client.keys)
        .bind(this.client)(key);
      
      for (const sessionKey of sessionKeys) {
        await this.delAsync(sessionKey);
      }
    } else {
      // Revoke specific tokens
      for (const token of tokens) {
        await this.delAsync(`user:${userId}:token:${token}`);
      }
    }
  }

  /**
   * Store active session
   */
  async storeSession(userId, sessionId, deviceInfo, expiresIn) {
    const key = `user:${userId}:sessions:${sessionId}`;
    await this.setAsync(key, JSON.stringify({
      deviceInfo,
      createdAt: new Date().toISOString()
    }), 'EX', expiresIn);
  }

  /**
   * Get all active sessions for user
   */
  async getUserSessions(userId) {
    const pattern = `user:${userId}:sessions:*`;
    const keys = await promisify(this.client.keys)
      .bind(this.client)(pattern);
    
    const sessions = {};
    for (const key of keys) {
      const sessionId = key.split(':').pop();
      const data = await this.getAsync(key);
      sessions[sessionId] = JSON.parse(data || '{}');
    }
    return sessions;
  }
}

module.exports = TokenBlacklistService;