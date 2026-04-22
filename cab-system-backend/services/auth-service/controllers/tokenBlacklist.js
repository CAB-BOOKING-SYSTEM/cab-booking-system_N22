import redisClient from '../core/redis.js';

class TokenBlacklistService {
  constructor(client = redisClient) {
    this.client = client;
  }

  async blacklistToken(token, expiresIn) {
    const key = `blacklist:${token}`;
    await this.client.set(key, JSON.stringify({
      blacklistedAt: new Date().toISOString(),
      reason: 'user_logout'
    }), { EX: expiresIn });
  }

  async isBlacklisted(token) {
    const key = `blacklist:${token}`;
    const exists = await this.client.exists(key);
    return exists === 1;
  }

  async revokeUserTokens(userId, tokens = []) {
    if (tokens.length === 0) {
      const pattern = `user:${userId}:sessions:*`;
      const sessionKeys = await this.client.keys(pattern);
      for (const sessionKey of sessionKeys) {
        await this.client.del(sessionKey);
      }
    } else {
      for (const token of tokens) {
        await this.client.del(`user:${userId}:token:${token}`);
      }
    }
  }

  async storeSession(userId, sessionId, deviceInfo, expiresIn) {
    const key = `user:${userId}:sessions:${sessionId}`;
    await this.client.set(key, JSON.stringify({
      deviceInfo,
      createdAt: new Date().toISOString()
    }), { EX: expiresIn });
  }

  async getUserSessions(userId) {
    const pattern = `user:${userId}:sessions:*`;
    const keys = await this.client.keys(pattern);
    const sessions = {};
    for (const key of keys) {
      const sessionId = key.split(':').pop();
      const data = await this.client.get(key);
      sessions[sessionId] = JSON.parse(data || '{}');
    }
    return sessions;
  }
}

export default TokenBlacklistService;
