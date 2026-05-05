const cron = require('node-cron');
const { redisClient } = require('../config/redisConfig');
const { publishEvent } = require('../rabbitmq/producer');
const Surge = require('../models/surgeModel');
const { computeSurge } = require('../services/surgeIntelligenceService');
const { getKnownZones } = require('../utils/zoneUtil');

// === MODEL VERSION ===
const MODEL_VERSION = 'phase1-intelligent-surge-v1';

// Chạy mỗi 5 phút
function startSurgeAIJob() {
  cron.schedule('*/5 * * * *', async () => {
    console.log('🔄 Running Surge AI job...');
    console.log(`   🤖 Default model version: ${MODEL_VERSION}`);
    
    try {
      const zones = getKnownZones();
      
      for (const zone of zones) {
        const supply = parseInt(await redisClient.get(`drivers:${zone}:online:count`) || 0);
        const demand = parseInt(await redisClient.get(`requests:${zone}:pending:count`) || 0);
        const surgePrediction = await computeSurge({ zone, supply, demand });
        const surge = surgePrediction.multiplier;
        
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
        
        const surgeData = {
          multiplier: surge,
          modelVersion: surgePrediction.modelVersion,
          source: surgePrediction.source,
          features: surgePrediction.features,
          fallbackReason: surgePrediction.fallbackReason || null,
          updatedAt: new Date().toISOString(),
        };
        await redisClient.set(`surge:${zone}`, JSON.stringify(surgeData));
        await Surge.create(zone, surge);
        
        console.log(`📍 ${zone}: Supply=${supply}, Demand=${demand}, Surge=${surge}x (old=${oldSurge}x)`);
        console.log(`   🤖 Model: ${surgePrediction.modelVersion} via ${surgePrediction.source}`);
        
        if (surge !== oldSurge) {
          await publishEvent('pricing.surge.updated', {
            zone: zone,
            oldMultiplier: oldSurge,
            newMultiplier: surge,
            supply: supply,
            demand: demand,
            modelVersion: surgePrediction.modelVersion,
            source: surgePrediction.source,
            features: surgePrediction.features,
            calculatedAt: new Date().toISOString()
          });
        }
      }
      
      const totalSupply = parseInt(await redisClient.get('drivers:online:count') || 0);
      const totalDemand = parseInt(await redisClient.get('requests:pending:count') || 0);
      const globalPrediction = await computeSurge({
        zone: 'GLOBAL',
        supply: totalSupply,
        demand: totalDemand,
      });
      
      const globalSurgeData = {
        multiplier: globalPrediction.multiplier,
        modelVersion: globalPrediction.modelVersion,
        source: globalPrediction.source,
        features: globalPrediction.features,
        fallbackReason: globalPrediction.fallbackReason || null,
        updatedAt: new Date().toISOString()
      };
      await redisClient.set('surge:global', JSON.stringify(globalSurgeData));
      
      console.log(`🌍 Global: Supply=${totalSupply}, Demand=${totalDemand}, Surge=${globalPrediction.multiplier}x`);
      console.log(`   🤖 Model: ${globalPrediction.modelVersion} via ${globalPrediction.source}`);
      
    } catch (error) {
      console.error('❌ Surge AI job failed:', error.message);
    }
  });
  
  console.log('✅ Surge AI job scheduled (every 5 minutes)');
  console.log(`   🤖 Default model version: ${MODEL_VERSION}`);
}

module.exports = { startSurgeAIJob };
