const cron = require('node-cron');
const axios = require('axios');
const { redisClient } = require('../config/redisConfig');
const { publishEvent } = require('../rabbitmq/producer');

// === AI Platform URL ===
const AI_PLATFORM_URL = process.env.AI_PLATFORM_URL || 'http://ai-platform:8080';
const MODEL_VERSION = 'random-forest-v1.0.0';

/**
 * Gọi AI Platform /predict/surge để lấy surge_multiplier từ mô hình ML.
 * Truyền đầy đủ context: demand_index, supply_ratio, hour_of_day, is_holiday, is_event.
 * Nếu AI lỗi → fallback rule-based.
 */
async function getAISurge(demandIndex, supplyRatio, hourOfDay, isHoliday = 0, isEvent = 0) {
  try {
    const response = await axios.post(
      `${AI_PLATFORM_URL}/predict/surge`,
      {
        demand_index: demandIndex,
        supply_ratio: Math.max(0.01, Math.min(supplyRatio, 1.0)),
        hour_of_day: hourOfDay,
        is_holiday: isHoliday,
        is_event: isEvent,
      },
      { timeout: 3000 }
    );

    const surge = response.data.surge_multiplier;
    const modelVer = response.data.model_version || MODEL_VERSION;
    return { surge, modelVersion: modelVer, source: 'ai-model' };
  } catch (error) {
    console.warn(`⚠️ AI Surge prediction failed: ${error.message}. Falling back to rule-based.`);
    return null;
  }
}

/**
 * Rule-based fallback: tính surge bằng demand/supply đơn giản.
 */
function ruleBasedSurge(demand, supply) {
  let surge;
  if (supply === 0) {
    surge = Math.max(1.0, demand);
  } else {
    surge = demand / supply;
  }
  // Giới hạn surge từ 1.0 đến 3.0
  surge = Math.min(Math.max(surge, 1.0), 3.0);
  surge = Math.round(surge * 10) / 10;
  return surge;
}

// Chạy mỗi 5 phút
function startSurgeAIJob() {
  cron.schedule('*/5 * * * *', async () => {
    console.log('🔄 Running Surge AI job...');
    console.log(`   🤖 AI Platform URL: ${AI_PLATFORM_URL}`);
    
    try {
      const zones = ['CENTER', 'AIRPORT', 'SUBURB'];
      const currentHour = new Date().getHours();
      
      for (const zone of zones) {
        // Lấy supply và demand từ Redis
        const supply = parseInt(await redisClient.get(`drivers:${zone}:online:count`) || 0);
        const demand = parseInt(await redisClient.get(`requests:${zone}:pending:count`) || 0);
        
        // Tính demand_index và supply_ratio cho AI model
        const demandIndex = Math.min(demand, 10); // Clamp 0-10 (model limit)
        const supplyRatio = supply > 0 ? Math.min(supply / Math.max(demand, 1), 1.0) : 0.01;
        
        let surge;
        let modelVersion;
        let source;
        
        // Ưu tiên gọi AI Platform, fallback rule-based
        const aiResult = await getAISurge(demandIndex, supplyRatio, currentHour);
        
        if (aiResult) {
          surge = aiResult.surge;
          modelVersion = aiResult.modelVersion;
          source = aiResult.source;
          console.log(`   🤖 AI Surge: zone=${zone}, surge=${surge}x (model: ${modelVersion})`);
        } else {
          surge = ruleBasedSurge(demand, supply);
          modelVersion = 'rule-based-fallback';
          source = 'rule-based';
          console.log(`   📐 Rule-based Surge: zone=${zone}, surge=${surge}x (fallback)`);
        }
        
        // Lấy surge cũ để so sánh
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
        
        // Lưu surge mới vào Redis (kèm model version + source)
        const surgeData = {
          multiplier: surge,
          modelVersion: modelVersion,
          source: source,
          supply: supply,
          demand: demand,
          updatedAt: new Date().toISOString()
        };
        await redisClient.set(`surge:${zone}`, JSON.stringify(surgeData));
        
        console.log(`📍 ${zone}: Supply=${supply}, Demand=${demand}, Surge=${surge}x (old=${oldSurge}x, source=${source})`);
        
        // Gửi event nếu surge thay đổi
        if (surge !== oldSurge) {
          await publishEvent('pricing.surge.updated', {
            zone: zone,
            oldMultiplier: oldSurge,
            newMultiplier: surge,
            supply: supply,
            demand: demand,
            modelVersion: modelVersion,
            source: source,
            calculatedAt: new Date().toISOString()
          });
        }
      }
      
      // Surge global
      const totalSupply = parseInt(await redisClient.get('drivers:online:count') || 0);
      const totalDemand = parseInt(await redisClient.get('requests:pending:count') || 0);
      
      const globalDemandIndex = Math.min(totalDemand, 10);
      const globalSupplyRatio = totalSupply > 0 ? Math.min(totalSupply / Math.max(totalDemand, 1), 1.0) : 0.01;
      
      let globalSurge;
      let globalModelVersion;
      let globalSource;
      
      const globalAI = await getAISurge(globalDemandIndex, globalSupplyRatio, new Date().getHours());
      
      if (globalAI) {
        globalSurge = globalAI.surge;
        globalModelVersion = globalAI.modelVersion;
        globalSource = globalAI.source;
      } else {
        globalSurge = ruleBasedSurge(totalDemand, totalSupply);
        globalModelVersion = 'rule-based-fallback';
        globalSource = 'rule-based';
      }
      
      const globalSurgeData = {
        multiplier: globalSurge,
        modelVersion: globalModelVersion,
        source: globalSource,
        updatedAt: new Date().toISOString()
      };
      await redisClient.set('surge:global', JSON.stringify(globalSurgeData));
      
      console.log(`🌍 Global: Supply=${totalSupply}, Demand=${totalDemand}, Surge=${globalSurge}x (source=${globalSource})`);
      
    } catch (error) {
      console.error('❌ Surge AI job failed:', error.message);
    }
  });
  
  console.log('✅ Surge AI job scheduled (every 5 minutes)');
  console.log(`   🤖 AI Platform URL: ${AI_PLATFORM_URL}`);
}

module.exports = { startSurgeAIJob };