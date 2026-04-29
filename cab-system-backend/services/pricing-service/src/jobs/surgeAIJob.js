const cron = require('node-cron');
const { redisClient } = require('../config/redisConfig');
const { publishEvent } = require('../rabbitmq/producer');

// === MODEL VERSION ===
const MODEL_VERSION = 'random-forest-v1.0.0';

// Chạy mỗi 5 phút
function startSurgeAIJob() {
  cron.schedule('*/5 * * * *', async () => {
    console.log('🔄 Running Surge AI job...');
    console.log(`   🤖 Model version: ${MODEL_VERSION}`);
    
    try {
      const zones = ['CENTER', 'AIRPORT', 'SUBURB'];
      
      for (const zone of zones) {
        // Lấy supply và demand
        const supply = parseInt(await redisClient.get(`drivers:${zone}:online:count`) || 0);
        const demand = parseInt(await redisClient.get(`requests:${zone}:pending:count`) || 0);
        
        // Tính surge
        let surge;
        if (supply === 0) {
          surge = Math.max(1.0, demand);
        } else {
          surge = demand / supply;
        }
        
        // Giới hạn surge từ 1.0 đến 3.0
        surge = Math.min(Math.max(surge, 1.0), 3.0);
        surge = Math.round(surge * 10) / 10;
        
        // Lấy surge cũ
        let oldSurge = 1.0;
        const oldRaw = await redisClient.get(`surge:${zone}`);
        if (oldRaw) {
          try {
            const oldData = JSON.parse(oldRaw);
            oldSurge = oldData.multiplier;
          } catch {
            oldSurge = parseFloat(oldRaw);
          }
        }
        
        // Lưu surge mới vào Redis (kèm model version)
        const surgeData = {
          multiplier: surge,
          modelVersion: MODEL_VERSION,
          updatedAt: new Date().toISOString()
        };
        await redisClient.set(`surge:${zone}`, JSON.stringify(surgeData));
        
        console.log(`📍 ${zone}: Supply=${supply}, Demand=${demand}, Surge=${surge}x (old=${oldSurge}x)`);
        console.log(`   🤖 Model: ${MODEL_VERSION}`);
        
        // Gửi event nếu surge thay đổi
        if (surge !== oldSurge) {
          await publishEvent('pricing.surge.updated', {
            zone: zone,
            oldMultiplier: oldSurge,
            newMultiplier: surge,
            supply: supply,
            demand: demand,
            modelVersion: MODEL_VERSION,
            calculatedAt: new Date().toISOString()
          });
        }
      }
      
      // Surge global
      const totalSupply = parseInt(await redisClient.get('drivers:online:count') || 0);
      const totalDemand = parseInt(await redisClient.get('requests:pending:count') || 0);
      
      let globalSurge;
      if (totalSupply === 0) {
        globalSurge = Math.max(1.0, totalDemand);
      } else {
        globalSurge = totalDemand / totalSupply;
      }
      globalSurge = Math.min(Math.max(globalSurge, 1.0), 3.0);
      globalSurge = Math.round(globalSurge * 10) / 10;
      
      const globalSurgeData = {
        multiplier: globalSurge,
        modelVersion: MODEL_VERSION,
        updatedAt: new Date().toISOString()
      };
      await redisClient.set('surge:global', JSON.stringify(globalSurgeData));
      
      console.log(`🌍 Global: Supply=${totalSupply}, Demand=${totalDemand}, Surge=${globalSurge}x`);
      console.log(`   🤖 Model: ${MODEL_VERSION}`);
      
    } catch (error) {
      console.error('❌ Surge AI job failed:', error.message);
    }
  });
  
  console.log('✅ Surge AI job scheduled (every 5 minutes)');
  console.log(`   🤖 Model version: ${MODEL_VERSION}`);
}

module.exports = { startSurgeAIJob };