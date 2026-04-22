module.exports = async function retry(fn, times = 3) {
  let lastError;

  for (let i = 0; i < times; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.log(`🔁 Retry ${i + 1}`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  throw lastError;
};