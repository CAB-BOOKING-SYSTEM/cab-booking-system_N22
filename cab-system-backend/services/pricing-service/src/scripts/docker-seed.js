// scripts/docker-seed.js
const { MongoClient } = require('mongodb');

const seedData = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/pricing_db';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('pricing_db');
    
    // Clear existing data
    await db.collection('pricings').deleteMany({});
    await db.collection('surges').deleteMany({});
    await db.collection('promotions').deleteMany({});
    
    // Insert pricing data
    await db.collection('pricings').insertMany([
      { vehicleType: 'car', baseFare: 10000, perKmRate: 5000, perMinuteRate: 1000 },
      { vehicleType: 'suv', baseFare: 15000, perKmRate: 7000, perMinuteRate: 1200 },
      { vehicleType: 'bike', baseFare: 5000, perKmRate: 3000, perMinuteRate: 500 }
    ]);
    
    // Insert surge data
    await db.collection('surges').insertMany([
      { zone: 'CENTER', multiplier: 1.5 },
      { zone: 'AIRPORT', multiplier: 2.0 },
      { zone: 'SUBURB', multiplier: 1.0 }
    ]);
    
    // Insert promotion data
    await db.collection('promotions').insertMany([
      {
        code: 'WELCOME50',
        type: 'fixed',
        value: 50000,
        minTripValue: 100000,
        validFrom: new Date('2025-01-01'),
        validTo: new Date('2026-12-31'),
        usageLimit: 1000,
        applicableVehicleTypes: ['car', 'suv'],
        applicableZones: ['CENTER', 'AIRPORT'],
        isActive: true
      },
      {
        code: 'SAVE20',
        type: 'percentage',
        value: 20,
        maxDiscount: 30000,
        minTripValue: 50000,
        validFrom: new Date('2025-01-01'),
        validTo: new Date('2026-12-31'),
        usageLimit: 500,
        applicableVehicleTypes: ['car', 'suv', 'bike'],
        applicableZones: ['CENTER', 'SUBURB'],
        isActive: true
      }
    ]);
    
    console.log('✅ Seed data created successfully');
  } catch (error) {
    console.error('❌ Seed error:', error);
  } finally {
    await client.close();
  }
};

seedData();