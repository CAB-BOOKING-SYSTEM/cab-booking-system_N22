/**
 * Test Case 62: ETA Service Under Load
 * ======================================
 * Mục tiêu: Chứng minh Redis Cache giúp hệ thống đạt latency < 200ms
 *           ngay cả khi có tải cao (50 VUs liên tục trong 30 giây).
 *
 * Chạy: k6 run test_load_eta.js
 *
 * Lưu ý: Gọi THẲNG vào pricing-service:3006 (không qua Gateway)
 *        để tránh bị chặn bởi globalLimiter (100 req/min/IP).
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

// ─── Custom Metrics ────────────────────────────────────────────────────────────
const cacheHitLatency  = new Trend('cache_hit_latency_ms');
const cacheMissLatency = new Trend('cache_miss_latency_ms');
const cacheHits        = new Counter('cache_hits');
const cacheMisses      = new Counter('cache_misses');
const successRate      = new Rate('success_rate');
// Sửa dòng này:

// ─── Test Configuration ────────────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '5s',  target: 10 },  // Ramp-up: 0→10 VUs trong 5s
    { duration: '20s', target: 50 },  // Tải đỉnh: giữ 50 VUs trong 20s
    { duration: '5s',  target: 0  },  // Ramp-down: 50→0 VUs trong 5s
  ],
  thresholds: {
    // Điều kiện PASS chính: 95% request phải nhanh hơn 200ms
    http_req_duration:    ['p(95)<200'],
    // Ít nhất 95% request phải thành công (status 200)
    success_rate:         ['rate>0.95'],
    // Cache hit latency phải < 50ms (Redis phải cực nhanh)
    cache_hit_latency_ms: ['p(95)<50'],
  },
};

// ─── Tọa độ test (cố định để tận dụng Redis Cache) ───────────────────────────
// Sử dụng cùng 1 tọa độ → Redis sẽ cache từ request đầu tiên
// → Các request sau trả về từ RAM (< 5ms)
const FIXED_PAYLOAD = JSON.stringify({
  pickupLat:  10.8222,
  pickupLng:  106.6875,
  dropoffLat: 10.7946,
  dropoffLng: 106.7223,
});

// ─── Địa chỉ target ───────────────────────────────────────────────────────────
// GỌI THẲNG VÀO PRICING-SERVICE để bypass Gateway rate limiter
// Trong Docker: http://localhost:3006/api/v1/eta
// Từ máy host:  http://localhost:3006/api/v1/eta

const TARGET_URL = 'http://host.docker.internal:3006/api/v1/eta';
const HEADERS = { 'Content-Type': 'application/json' };

// ─── Main Test Function ────────────────────────────────────────────────────────
export default function () {
  const startTime = Date.now();
  const res = http.post(TARGET_URL, FIXED_PAYLOAD, { headers: HEADERS });
  const duration = Date.now() - startTime;

  // Đánh dấu thành công/thất bại
  const isSuccess = res.status === 200;
  successRate.add(isSuccess);

  if (isSuccess) {
    let body;
    try {
      body = res.json();
    } catch (_) {
      body = null;
    }

    // Phân loại cache hit / miss từ response
    const isCacheHit = body && body.data && body.data.source === 'cache' ||
                       res.headers['X-Cache'] === 'HIT' ||
                       duration < 20; // Heuristic: < 20ms gần như chắc chắn là cache hit

    if (isCacheHit) {
      cacheHitLatency.add(duration);
      cacheHits.add(1);
    } else {
      cacheMissLatency.add(duration);
      cacheMisses.add(1);
    }

    // Kiểm tra dữ liệu trả về hợp lệ
    check(res, {
      '✅ status 200':         (r) => r.status === 200,
      '✅ has eta_minutes':    () => body && body.data && body.data.eta_minutes !== undefined,
      '✅ has distance_km':   () => body && body.data && body.data.distance_km !== undefined,
      '✅ latency < 200ms':   () => duration < 200,
    });
  } else {
    // Log lỗi nếu bị rate limit (429) hoặc lỗi khác
    check(res, {
      '❌ status 200': (r) => r.status === 200,
    });
    console.warn(`Request failed: status=${res.status}, body=${res.body.substring(0, 100)}`);
  }

  // Mỗi VU nghỉ 100ms → tạo ra ~10 req/s/VU × 50 VUs = ~500 req/s
  sleep(0.1);
}

// ─── Summary Report ───────────────────────────────────────────────────────────
export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration
    ? data.metrics.http_req_duration.values['p(95)'].toFixed(2)
    : 'N/A';
  const totalReqs  = data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0;
  const rps        = data.metrics.http_reqs ? data.metrics.http_reqs.values.rate.toFixed(1) : 0;
  const hitCount   = data.metrics.cache_hits   ? data.metrics.cache_hits.values.count   : 0;
  const missCount  = data.metrics.cache_misses ? data.metrics.cache_misses.values.count : 0;
  const hitRatio   = totalReqs > 0 ? ((hitCount / totalReqs) * 100).toFixed(1) : 0;

  const passed = p95 !== 'N/A' && parseFloat(p95) < 200;

  const report = `
╔══════════════════════════════════════════════════════════╗
║        Test Case 62: ETA Service Under Load              ║
╠══════════════════════════════════════════════════════════╣
║  Kết quả: ${passed ? '✅ PASS' : '❌ FAIL'}                                       ║
╠══════════════════════════════════════════════════════════╣
║  Tổng requests:      ${String(totalReqs).padEnd(34)}║
║  Throughput:         ${String(rps + ' req/s').padEnd(34)}║
║  Latency p(95):      ${String(p95 + 'ms  (threshold: < 200ms)').padEnd(34)}║
╠══════════════════════════════════════════════════════════╣
║  Cache Hits:         ${String(hitCount + ' (' + hitRatio + '%)').padEnd(34)}║
║  Cache Misses:       ${String(missCount).padEnd(34)}║
╚══════════════════════════════════════════════════════════╝
`;

  console.log(report);

  // Ghi báo cáo ra file để nộp
  return {
    'load_test_report.txt': report + '\n\nRaw metrics:\n' + JSON.stringify(data.metrics, null, 2),
    stdout: report,
  };
}
