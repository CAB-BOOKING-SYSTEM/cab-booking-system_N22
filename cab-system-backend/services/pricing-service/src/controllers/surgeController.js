const surgeRepository = require('../repositories/surgeRepository');
const { successResponse, errorResponse } = require('../utils/responseUtil');
const { redisClient } = require('../config/redisConfig');
const { getKnownZones } = require('../utils/zoneUtil');
const { isSurgeFeatureEnabled } = require('../config/featureFlags');

const readLiveSurge = async (zone) => {
  const raw = await redisClient.get(`surge:${zone}`);
  if (!raw) {
    return null;
  }

  try {
    const data = JSON.parse(raw);
    return {
      zone,
      multiplier: parseFloat(data.multiplier || 1.0),
      modelVersion: data.modelVersion || 'unknown',
      source: data.source || 'redis',
      updatedAt: data.updatedAt || null,
    };
  } catch {
    return {
      zone,
      multiplier: parseFloat(raw || 1.0),
      modelVersion: 'legacy-v1',
      source: 'legacy',
      updatedAt: null,
    };
  }
};

const getAllSurges = async (req, res) => {
  try {
    if (!isSurgeFeatureEnabled()) {
      const surges = await surgeRepository.getAllSurgeZones();
      return successResponse(res, surges);
    }

    const persistedSurges = await surgeRepository.getAllSurgeZones();
    const persistedByZone = new Map(
      persistedSurges.map((surge) => [surge.zone, surge])
    );

    const merged = [];
    for (const zone of getKnownZones()) {
      const live = await readLiveSurge(zone);
      const persisted = persistedByZone.get(zone);

      if (live) {
        merged.push({
          ...(persisted || { zone, multiplier: 1.0 }),
          ...live,
        });
      } else if (persisted) {
        merged.push(persisted);
      } else {
        merged.push({
          zone,
          multiplier: 1.0,
          modelVersion: 'default-no-cache',
          source: 'default',
        });
      }
    }

    return successResponse(res, merged);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getSurgeByZone = async (req, res) => {
  try {
    if (!isSurgeFeatureEnabled()) {
      const multiplier = await surgeRepository.getSurge(req.params.zone);
      return successResponse(res, { zone: req.params.zone, multiplier });
    }

    const zone = req.params.zone;
    const liveSurge = await readLiveSurge(zone);

    if (liveSurge) {
      return successResponse(res, liveSurge);
    }

    const multiplier = await surgeRepository.getSurge(zone);
    return successResponse(res, {
      zone,
      multiplier,
      modelVersion: 'db-fallback',
      source: 'postgres',
    });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const createSurge = async (req, res) => {
  try {
    const surge = await surgeRepository.createSurge(req.body.zone, req.body.multiplier);
    if (isSurgeFeatureEnabled()) {
      await redisClient.set(`surge:${req.body.zone}`, JSON.stringify({
        multiplier: parseFloat(req.body.multiplier),
        modelVersion: 'manual-override',
        source: 'manual-api',
        updatedAt: new Date().toISOString(),
      }));
    }
    return successResponse(res, surge, 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const updateSurge = async (req, res) => {
  try {
    const surge = await surgeRepository.updateSurge(req.params.zone, req.body.multiplier);
    if (isSurgeFeatureEnabled()) {
      await redisClient.set(`surge:${req.params.zone}`, JSON.stringify({
        multiplier: parseFloat(req.body.multiplier),
        modelVersion: 'manual-override',
        source: 'manual-api',
        updatedAt: new Date().toISOString(),
      }));
    }
    return successResponse(res, surge);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const deleteSurge = async (req, res) => {
  try {
    const deleted = await surgeRepository.deleteSurge(req.params.zone);
    if (!deleted) {
      return errorResponse(res, 'Zone not found', 404);
    }
    if (isSurgeFeatureEnabled()) {
      await redisClient.del(`surge:${req.params.zone}`);
    }
    return successResponse(res, { message: 'Deleted successfully' });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = {
  getAllSurges,
  getSurgeByZone,
  createSurge,
  updateSurge,
  deleteSurge
};
