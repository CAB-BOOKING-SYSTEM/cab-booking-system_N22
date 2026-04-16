const cron = require('node-cron');
const { redisClient } = require('../config/redisConfig');
const { publishEvent } = require('../rabbitmq/producer');

// Chạy mỗi 5 phút
function startSurgeAIJob() {
  cron.schedule('*/5 * * * *', async () => {
    console.log('🔄 Running Surge AI job...');
    
    try {
      const zones = ['CENTER', 'AIRPORT', 'SUBURB'];
      
      for (const zone of zones) {
        // Lấy supply (số driver online) và demand (số request pending)
        const supply = await redisClient.get(`drivers:${zone}:online:count`) || 0;
        const demand = await redisClient.get(`requests:${zone}:pending:count`) || 0;
        
        // Tính surge theo công thức: min(max(1, Demand/(Supply+1)), 3)
        let surge = demand / (parseInt(supply) + 1);
        surge = Math.min(Math.max(surge, 1), 3);
        surge = Math.round(surge * 10) / 10;
        
        // Lấy surge cũ
        const oldSurge = await redisClient.get(`surge:${zone}`) || 1.0;
        
        // Lưu surge mới vào Redis
        await redisClient.set(`surge:${zone}`, surge);
        
        console.log(`📍 ${zone}: Supply=${supply}, Demand=${demand}, Surge=${surge}x (old=${oldSurge}x)`);
        
        // Gửi event nếu surge thay đổi
        if (surge !== parseFloat(oldSurge)) {
          await publishEvent('pricing.surge.updated', {
            zone: zone,
            oldMultiplier: parseFloat(oldSurge),
            newMultiplier: surge,
            supply: parseInt(supply),
            demand: parseInt(demand),
            calculatedAt: new Date().toISOString()
          });
        }
      }
      
      // Surge global
      const totalSupply = await redisClient.get('drivers:online:count') || 0;
      const totalDemand = await redisClient.get('requests:pending:count') || 0;
      let globalSurge = totalDemand / (parseInt(totalSupply) + 1);
      globalSurge = Math.min(Math.max(globalSurge, 1), 3);
      globalSurge = Math.round(globalSurge * 10) / 10;
      await redisClient.set('surge:global', globalSurge);
      
      console.log(`🌍 Global: Supply=${totalSupply}, Demand=${totalDemand}, Surge=${globalSurge}x`);
      
    } catch (error) {
      console.error('❌ Surge AI job failed:', error.message);
    }
  });
  
  console.log('✅ Surge AI job scheduled (every 5 minutes)');
}

module.exports = { startSurgeAIJob };