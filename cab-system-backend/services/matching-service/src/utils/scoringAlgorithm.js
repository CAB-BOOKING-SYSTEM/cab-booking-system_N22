 class ScoringAlgorithm {
  calculateScore(distanceKm, rating, acceptanceRate, avgResponseTime, completedTrips) {
    // Normalize distance: closer is better (max 5km)
    const distanceScore = Math.max(0, 1 - distanceKm / 5);
    
    // Normalize rating: 0-5 scale
    const ratingScore = rating / 5;
    
    // Acceptance rate: 0-1 scale
    const acceptanceScore = acceptanceRate || 0.9;
    
    // Response time: lower is better (max 60 seconds)
    const responseScore = Math.max(0, 1 - (avgResponseTime || 30) / 60);
    
    // Experience score: more trips is better (cap at 1000)
    const experienceScore = Math.min(1, (completedTrips || 0) / 1000);
    
    // Weighted sum
    const totalScore = 
      distanceScore * 0.35 +
      ratingScore * 0.30 +
      acceptanceScore * 0.15 +
      responseScore * 0.10 +
      experienceScore * 0.10;
    
    return parseFloat(totalScore.toFixed(4));
  }

  calculateETARemaining(distanceKm, trafficFactor = 1.0) {
    // Average speed: 30 km/h in city
    const avgSpeedKmph = 30;
    const hours = distanceKm / avgSpeedKmph;
    const seconds = hours * 3600 * trafficFactor;
    return Math.ceil(seconds);
  }

  calculateSurgeMultiplier(demandLevel, supplyLevel, timeFactor) {
    // demandLevel: 0-1 (higher is more demand)
    // supplyLevel: 0-1 (higher is more supply)
    // timeFactor: 0-1 (peak hour factor)
    
    const ratio = demandLevel / Math.max(supplyLevel, 0.1);
    let multiplier = 1.0;
    
    if (ratio > 1.5) multiplier = 1.2;
    if (ratio > 2.0) multiplier = 1.5;
    if (ratio > 3.0) multiplier = 2.0;
    if (ratio > 4.0) multiplier = 3.0;
    
    // Apply time factor
    multiplier = multiplier * (1 + timeFactor * 0.5);
    
    return Math.min(multiplier, 5.0);
  }
}

module.exports = new ScoringAlgorithm();
