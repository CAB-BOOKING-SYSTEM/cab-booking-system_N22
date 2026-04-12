
-- Bảng matching_requests
CREATE TABLE IF NOT EXISTS matching_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id UUID NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    pickup_lat DECIMAL(10,8) NOT NULL,
    pickup_lng DECIMAL(11,8) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'failed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng matching_results
CREATE TABLE IF NOT EXISTS matching_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES matching_requests(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL,
    distance_km DECIMAL(8,2),
    ai_score DECIMAL(5,4),
    was_fallback BOOLEAN DEFAULT FALSE,
    matched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng driver_availability_cache
CREATE TABLE IF NOT EXISTS driver_availability_cache (
    driver_id UUID PRIMARY KEY,
    last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    current_zone VARCHAR(50),
    is_available BOOLEAN DEFAULT TRUE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_matching_requests_status ON matching_requests(status, created_at);
CREATE INDEX IF NOT EXISTS idx_matching_results_driver ON matching_results(driver_id, matched_at);
CREATE INDEX IF NOT EXISTS idx_matching_requests_ride ON matching_requests(ride_id);
EOF