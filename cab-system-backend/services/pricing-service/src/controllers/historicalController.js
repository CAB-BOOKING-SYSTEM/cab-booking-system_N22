const historicalRepository = require('../repositories/historicalRepository');
const { successResponse } = require('../utils/responseUtil');

const getHistory = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Kiểm tra tham số đầu vào
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing startDate or endDate parameter' 
      });
    }
    
    // Tạo date objects
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Set end date to end of day (23:59:59.999)
    end.setHours(23, 59, 59, 999);
    
    console.log('🔍 Querying from:', start.toISOString());
    console.log('🔍 Querying to:', end.toISOString());
    
    const data = await historicalRepository.getHistoryByDate(start, end);
    
    console.log('📊 Found:', data.length, 'records');
    
    return successResponse(res, data);
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

module.exports = { getHistory };