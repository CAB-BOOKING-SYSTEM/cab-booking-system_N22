const { query } = require('../config/dbConfig');

class Promotion {
  static async findAll() {
    const result = await query('SELECT * FROM promotions ORDER BY id');
    return result.rows;
  }

  static async findByCode(code) {
    const result = await query(
      `SELECT * FROM promotions 
       WHERE code = $1 AND is_active = true 
       AND valid_from <= CURRENT_TIMESTAMP 
       AND valid_to >= CURRENT_TIMESTAMP`,
      [code]
    );
    return result.rows[0];
  }

  static async create(data) {
    const {
      code, type, value, minTripValue, maxDiscount,
      validFrom, validTo, usageLimit, applicableVehicleTypes,
      applicableZones
    } = data;
    
    const result = await query(
      `INSERT INTO promotions (
        code, type, value, min_trip_value, max_discount,
        valid_from, valid_to, usage_limit, applicable_vehicle_types,
        applicable_zones
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [code, type, value, minTripValue || 0, maxDiscount || null,
       validFrom, validTo, usageLimit || null, applicableVehicleTypes || [],
       applicableZones || []]
    );
    return result.rows[0];
  }

  static async update(code, data) {
    const fields = [];
    const values = [];
    let idx = 1;
    
    if (data.type !== undefined) {
      fields.push(`type = $${idx++}`);
      values.push(data.type);
    }
    if (data.value !== undefined) {
      fields.push(`value = $${idx++}`);
      values.push(data.value);
    }
    if (data.minTripValue !== undefined) {
      fields.push(`min_trip_value = $${idx++}`);
      values.push(data.minTripValue);
    }
    if (data.maxDiscount !== undefined) {
      fields.push(`max_discount = $${idx++}`);
      values.push(data.maxDiscount);
    }
    if (data.validFrom !== undefined) {
      fields.push(`valid_from = $${idx++}`);
      values.push(data.validFrom);
    }
    if (data.validTo !== undefined) {
      fields.push(`valid_to = $${idx++}`);
      values.push(data.validTo);
    }
    if (data.usageLimit !== undefined) {
      fields.push(`usage_limit = $${idx++}`);
      values.push(data.usageLimit);
    }
    if (data.applicableVehicleTypes !== undefined) {
      fields.push(`applicable_vehicle_types = $${idx++}`);
      values.push(data.applicableVehicleTypes);
    }
    if (data.applicableZones !== undefined) {
      fields.push(`applicable_zones = $${idx++}`);
      values.push(data.applicableZones);
    }
    if (data.isActive !== undefined) {
      fields.push(`is_active = $${idx++}`);
      values.push(data.isActive);
    }
    
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(code);
    
    const result = await query(
      `UPDATE promotions SET ${fields.join(', ')} WHERE code = $${idx} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  static async delete(code) {
    const result = await query(
      'DELETE FROM promotions WHERE code = $1 RETURNING *',
      [code]
    );
    return result.rows[0];
  }

  static async incrementUsageCount(code) {
    const result = await query(
      `UPDATE promotions 
       SET used_count = used_count + 1, updated_at = CURRENT_TIMESTAMP
       WHERE code = $1 RETURNING *`,
      [code]
    );
    return result.rows[0];
  }
}

module.exports = Promotion;