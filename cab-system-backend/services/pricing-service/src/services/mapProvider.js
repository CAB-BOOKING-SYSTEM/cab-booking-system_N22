/**
 * mapProvider.js
 *
 * Wrapper trung gian để gọi API nhà cung cấp bản đồ bên ngoài.
 * Hiện hỗ trợ:
 *   - Google Maps Directions API  (MAP_PROVIDER=google, yêu cầu GOOGLE_MAPS_API_KEY)
 *   - OSRM public / self-hosted   (MAP_PROVIDER=osrm,  tùy chọn OSRM_BASE_URL)
 *   - Here Routing API            (MAP_PROVIDER=here,  yêu cầu HERE_API_KEY)
 *
 * Nếu API lỗi hoặc timeout, hàm ném ra lỗi để caller (etaService) tự fallback
 * về công thức Haversine — không bao giờ chặn luồng đặt xe.
 *
 * Biến môi trường:
 *   MAP_PROVIDER        = google | osrm | here          (mặc định: osrm)
 *   GOOGLE_MAPS_API_KEY = <key>
 *   OSRM_BASE_URL       = http://router.project-osrm.org  (mặc định)
 *   HERE_API_KEY        = <key>
 *   MAP_API_TIMEOUT_MS  = 5000  (ms, mặc định 5 s)
 */

const https = require('https');
const http  = require('http');

const PROVIDER       = (process.env.MAP_PROVIDER       || 'osrm').toLowerCase();
const TIMEOUT_MS     = parseInt(process.env.MAP_API_TIMEOUT_MS || '5000', 10);
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const OSRM_BASE_URL  = (process.env.OSRM_BASE_URL || 'http://router.project-osrm.org').replace(/\/$/, '');
const HERE_API_KEY   = process.env.HERE_API_KEY || '';

// --------------------------------------------------------------------------
// Tiện ích: fetch với timeout
// --------------------------------------------------------------------------
function fetchWithTimeout(url, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`mapProvider: JSON parse error — ${e.message}`));
          }
        } else {
          reject(new Error(`mapProvider: HTTP ${res.statusCode} from ${url}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`mapProvider: Request timeout after ${timeoutMs}ms`));
    });
  });
}

// --------------------------------------------------------------------------
// Google Maps Directions API
// --------------------------------------------------------------------------
async function _fetchGoogle(pickupLat, pickupLng, dropoffLat, dropoffLng) {
  if (!GOOGLE_API_KEY) throw new Error('mapProvider [google]: GOOGLE_MAPS_API_KEY không được cấu hình');

  const url =
    `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=${pickupLat},${pickupLng}` +
    `&destination=${dropoffLat},${dropoffLng}` +
    `&mode=driving` +
    `&departure_time=now` +          // bật traffic real-time
    `&traffic_model=best_guess` +
    `&key=${GOOGLE_API_KEY}`;

  const json = await fetchWithTimeout(url);

  if (json.status !== 'OK' || !json.routes || !json.routes.length) {
    throw new Error(`mapProvider [google]: status=${json.status}`);
  }

  const leg = json.routes[0].legs[0];
  const distanceKm  = leg.distance.value / 1000;                    // metres → km
  // Ưu tiên duration_in_traffic (có traffic real-time); fallback về duration
  const durationMin = ((leg.duration_in_traffic || leg.duration).value) / 60; // seconds → minutes

  return { distanceKm, durationMin, provider: 'google' };
}

// --------------------------------------------------------------------------
// OSRM (Open Source Routing Machine)
// --------------------------------------------------------------------------
async function _fetchOsrm(pickupLat, pickupLng, dropoffLat, dropoffLng) {
  // Endpoint: /route/v1/driving/{lng,lat};{lng,lat}?overview=false
  const url =
    `${OSRM_BASE_URL}/route/v1/driving/` +
    `${pickupLng},${pickupLat};${dropoffLng},${dropoffLat}` +
    `?overview=false`;

  const json = await fetchWithTimeout(url);

  if (json.code !== 'Ok' || !json.routes || !json.routes.length) {
    throw new Error(`mapProvider [osrm]: code=${json.code}`);
  }

  const route = json.routes[0];
  const distanceKm  = route.distance / 1000;     // metres → km
  const durationMin = route.duration / 60;        // seconds → minutes

  return { distanceKm, durationMin, provider: 'osrm' };
}

// --------------------------------------------------------------------------
// Here Routing API v8
// --------------------------------------------------------------------------
async function _fetchHere(pickupLat, pickupLng, dropoffLat, dropoffLng) {
  if (!HERE_API_KEY) throw new Error('mapProvider [here]: HERE_API_KEY không được cấu hình');

  const url =
    `https://router.hereapi.com/v8/routes` +
    `?transportMode=car` +
    `&origin=${pickupLat},${pickupLng}` +
    `&destination=${dropoffLat},${dropoffLng}` +
    `&return=summary` +
    `&apikey=${HERE_API_KEY}`;

  const json = await fetchWithTimeout(url);

  if (!json.routes || !json.routes.length) {
    throw new Error('mapProvider [here]: Không có kết quả tuyến đường');
  }

  const summary = json.routes[0].sections[0].summary;
  const distanceKm  = summary.length / 1000;      // metres → km
  const durationMin = summary.duration / 60;       // seconds → minutes

  return { distanceKm, durationMin, provider: 'here' };
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

/**
 * Lấy khoảng cách đường bộ và thời gian di chuyển từ nhà cung cấp bản đồ.
 *
 * @param {number} pickupLat
 * @param {number} pickupLng
 * @param {number} dropoffLat
 * @param {number} dropoffLng
 * @returns {Promise<{ distanceKm: number, durationMin: number, provider: string }>}
 * @throws {Error} Khi API lỗi / timeout — caller phải tự xử lý fallback
 */
async function getRouteInfo(pickupLat, pickupLng, dropoffLat, dropoffLng) {
  switch (PROVIDER) {
    case 'google':
      return _fetchGoogle(pickupLat, pickupLng, dropoffLat, dropoffLng);
    case 'here':
      return _fetchHere(pickupLat, pickupLng, dropoffLat, dropoffLng);
    case 'osrm':
    default:
      return _fetchOsrm(pickupLat, pickupLng, dropoffLat, dropoffLng);
  }
}

module.exports = { getRouteInfo, PROVIDER };
