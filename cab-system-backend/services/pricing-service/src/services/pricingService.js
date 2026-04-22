const { roundMoney } = require('../utils/mathUtil');

const calculateFare = ({
  baseFare,
  perKmRate,
  perMinuteRate,
  distance,
  duration,
  surgeMultiplier
}) => {
  const fare =
    (baseFare +
      distance * perKmRate +
      duration * perMinuteRate) * surgeMultiplier;

  return roundMoney(fare);
};

module.exports = { calculateFare };