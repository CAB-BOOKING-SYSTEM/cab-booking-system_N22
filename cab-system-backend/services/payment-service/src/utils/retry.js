// services/payment-service/src/utils/retry.js
module.exports = async function retry(fn, times = 3, baseDelay = 1000) {
  let lastError;
  for (let i = 0; i < times; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const delay = baseDelay * Math.pow(2, i); // exponential backoff
      console.log(`🔁 Retry ${i + 1}/${times} sau ${delay}ms — lý do: ${err.message}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
};