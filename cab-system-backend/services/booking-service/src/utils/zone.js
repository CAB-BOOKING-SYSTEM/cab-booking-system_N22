function determineZone(lat, lng) {
  if (lat >= 10.75 && lat <= 10.8 && lng >= 106.65 && lng <= 106.72) {
    return 'CENTER';
  }

  if (lat >= 10.8 && lat <= 10.85 && lng >= 106.7 && lng <= 106.75) {
    return 'AIRPORT';
  }

  return 'SUBURB';
}

module.exports = {
  determineZone,
};
