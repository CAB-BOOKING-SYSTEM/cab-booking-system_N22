"""
AI Platform - Model Serving API (FastAPI)
Provides prediction endpoints for ETA, Surge Pricing, Fraud Detection,
Driver Matching Score, and Demand Forecast.

Covers: TC41 (ETA range), TC42 (Surge), TC43 (Fraud), TC44 (Top-3 drivers),
        TC45 (Forecast), TC46 (model_version), TC47 (latency < 200ms),
        TC50 (input validation)
"""
import os
import time
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from typing import List, Optional, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

# ─── APP SETUP ───────────────────────────────────────────────
app = FastAPI(
    title="Cab Booking AI Platform",
    description="ML Model Serving API for ETA, Surge, Fraud, Matching & Forecast",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'models')


# ─── MODEL LOADING ──────────────────────────────────────────
class ModelRegistry:
    """Loads and caches trained model bundles from disk."""

    def __init__(self):
        self.models = {}

    def load(self, name: str, version: str = 'latest'):
        key = f"{name}_{version}"
        if key not in self.models:
            path = os.path.join(MODEL_DIR, f"{name}_{version}.joblib")
            if not os.path.exists(path):
                raise FileNotFoundError(f"Model not found: {path}")
            self.models[key] = joblib.load(path)
        return self.models[key]

    def get_version(self, name: str) -> str:
        bundle = self.load(name, 'latest')
        return bundle.get('version', 'unknown')

    def get_training_stats(self, name: str) -> dict:
        bundle = self.load(name, 'latest')
        return bundle.get('training_stats', {})


registry = ModelRegistry()


# ─── REQUEST / RESPONSE SCHEMAS ─────────────────────────────

# --- ETA ---
class ETARequest(BaseModel):
    distance_km: float = Field(..., description="Trip distance in km")
    hour_of_day: int = Field(default=12, ge=0, le=23)
    day_of_week: int = Field(default=3, ge=0, le=6)
    traffic_index: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    traffic_level: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Alias for traffic_index (TC7)")
    is_rain: int = Field(default=0, ge=0, le=1)

    @field_validator('distance_km')
    @classmethod
    def validate_distance(cls, v):
        # TC50: reject absurd values, don't crash
        if v <= 0:
            raise ValueError("distance_km must be > 0")
        if v > 200:
            raise ValueError(f"distance_km={v} is unreasonably large (max 200km). Possible outlier.")
        return v

    def get_traffic_index(self) -> float:
        """Return traffic_index, accepting traffic_level as alias (TC7)."""
        if self.traffic_index is not None:
            return self.traffic_index
        if self.traffic_level is not None:
            return self.traffic_level
        return 0.5  # default


class ETAResponse(BaseModel):
    eta_minutes: float
    eta_seconds: float
    distance_km: float
    model_version: str
    latency_ms: float


# --- Surge ---
class SurgeRequest(BaseModel):
    demand_index: float = Field(..., ge=0, le=10)
    supply_ratio: float = Field(default=0.5, ge=0.01, le=1.0)
    hour_of_day: int = Field(default=12, ge=0, le=23)
    is_holiday: int = Field(default=0, ge=0, le=1)
    is_event: int = Field(default=0, ge=0, le=1)


class SurgeResponse(BaseModel):
    surge_multiplier: float
    demand_index: float
    model_version: str
    latency_ms: float


# --- Pricing (TC8) ---
class PricingRequest(BaseModel):
    distance_km: float = Field(..., gt=0, description="Trip distance in km")
    demand_index: float = Field(default=1.0, ge=0, le=10)
    vehicle_type: str = Field(default="4_seat")


class PricingResponse(BaseModel):
    base_fare: float
    distance_fare: float
    surge_multiplier: float
    total_price: float
    currency: str
    distance_km: float
    model_version: str
    latency_ms: float


# --- Fraud ---
class FraudRequest(BaseModel):
    trip_amount: float = Field(..., gt=0)
    trip_distance_km: float = Field(..., gt=0)
    payment_method: int = Field(default=0, ge=0, le=2)
    num_trips_last_hour: int = Field(default=0, ge=0)
    avg_trip_amount: float = Field(default=50000, gt=0)
    distance_from_usual_area_km: float = Field(default=0, ge=0)
    time_since_last_trip_min: float = Field(default=60, ge=0)


class FraudResponse(BaseModel):
    fraud_score: float
    is_flagged: bool
    threshold: float
    model_version: str
    latency_ms: float


# --- Matching ---
class DriverFeature(BaseModel):
    driver_id: str
    distance_km: float = Field(..., ge=0)
    driver_rating: float = Field(default=5.0, ge=1.0, le=5.0)
    acceptance_rate: float = Field(default=0.9, ge=0.0, le=1.0)
    avg_response_time_sec: float = Field(default=30, ge=0)
    completed_trips: int = Field(default=0, ge=0)
    eta_minutes: float = Field(default=5, ge=0)
    price_estimate: float = Field(default=30000, ge=0)


class MatchingRequest(BaseModel):
    drivers: List[DriverFeature]
    top_n: int = Field(default=3, ge=1, le=10)


class ScoredDriver(BaseModel):
    driver_id: str
    match_score: float
    distance_km: float
    driver_rating: float
    eta_minutes: float
    price_estimate: float


class MatchingResponse(BaseModel):
    top_drivers: List[ScoredDriver]
    total_candidates: int
    model_version: str
    latency_ms: float


# --- Forecast ---
class ForecastRequest(BaseModel):
    zone_id: str = Field(default='zone_A')
    hour: int = Field(default=12, ge=0, le=23)
    day_of_week: int = Field(default=3, ge=0, le=6)
    month: int = Field(default=6, ge=1, le=12)


class ForecastResponse(BaseModel):
    timestamp: str
    zone_id: str
    predicted_demand: int
    model_version: str
    latency_ms: float


# --- Drift ---
class DriftCheckRequest(BaseModel):
    model_name: str
    current_data: dict


class DriftCheckResponse(BaseModel):
    model_name: str
    drift_detected: bool
    drifted_features: List[str]
    details: dict


# ─── ENDPOINTS ───────────────────────────────────────────────

@app.get("/health")
async def health():
    models_available = []
    for name in ['eta', 'surge', 'fraud', 'matching', 'demand_forecast']:
        try:
            registry.load(name, 'latest')
            models_available.append(name)
        except FileNotFoundError:
            pass
    return {
        "status": "healthy",
        "service": "ai-platform",
        "models_loaded": models_available,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/predict/eta", response_model=ETAResponse)
async def predict_eta(req: ETARequest):
    """
    Predict ETA for a trip (TC41).
    - distance=5km -> ETA > 0 and < 60 min
    - Returns model_version (TC46)
    """
    start = time.time()
    bundle = registry.load('eta', 'latest')
    model, scaler = bundle['model'], bundle['scaler']

    traffic_idx = req.get_traffic_index()

    features = pd.DataFrame([{
        'distance_km': req.distance_km,
        'hour_of_day': req.hour_of_day,
        'day_of_week': req.day_of_week,
        'traffic_index': traffic_idx,
        'is_rain': req.is_rain,
    }])

    eta = float(model.predict(scaler.transform(features))[0])
    eta = max(1.0, min(eta, 120.0))  # Clamp to safe range

    latency = (time.time() - start) * 1000
    return ETAResponse(
        eta_minutes=round(eta, 2),
        eta_seconds=round(eta * 60, 1),
        distance_km=req.distance_km,
        model_version=bundle['version'],
        latency_ms=round(latency, 2),
    )


@app.post("/predict/surge", response_model=SurgeResponse)
async def predict_surge(req: SurgeRequest):
    """
    Predict surge multiplier (TC42).
    - demand_index >= 2 -> surge > 1
    - Max 3.0
    """
    start = time.time()
    bundle = registry.load('surge', 'latest')
    model, scaler = bundle['model'], bundle['scaler']

    features = pd.DataFrame([{
        'demand_index': req.demand_index,
        'supply_ratio': req.supply_ratio,
        'hour_of_day': req.hour_of_day,
        'is_holiday': req.is_holiday,
        'is_event': req.is_event,
    }])

    surge = float(model.predict(scaler.transform(features))[0])
    surge = max(1.0, min(surge, 3.0))  # Clamp 1.0 - 3.0

    latency = (time.time() - start) * 1000
    return SurgeResponse(
        surge_multiplier=round(surge, 3),
        demand_index=req.demand_index,
        model_version=bundle['version'],
        latency_ms=round(latency, 2),
    )


@app.post("/predict/fraud", response_model=FraudResponse)
async def predict_fraud(req: FraudRequest):
    """
    Detect fraudulent transactions (TC43).
    - fraud_score > threshold -> is_flagged = true
    """
    start = time.time()
    bundle = registry.load('fraud', 'latest')
    model, scaler = bundle['model'], bundle['scaler']
    threshold = 0.5

    features = pd.DataFrame([{
        'trip_amount': req.trip_amount,
        'trip_distance_km': req.trip_distance_km,
        'payment_method': req.payment_method,
        'num_trips_last_hour': req.num_trips_last_hour,
        'avg_trip_amount': req.avg_trip_amount,
        'distance_from_usual_area_km': req.distance_from_usual_area_km,
        'time_since_last_trip_min': req.time_since_last_trip_min,
    }])

    fraud_score = float(model.predict_proba(scaler.transform(features))[0][1])
    is_flagged = fraud_score > threshold

    latency = (time.time() - start) * 1000
    return FraudResponse(
        fraud_score=round(fraud_score, 4),
        is_flagged=is_flagged,
        threshold=threshold,
        model_version=bundle['version'],
        latency_ms=round(latency, 2),
    )


@app.post("/predict/matching", response_model=MatchingResponse)
async def predict_matching(req: MatchingRequest):
    """
    Score and rank drivers for matching (TC44, TC51-TC53).
    - Returns exactly top_n drivers
    - Multi-objective: considers distance, rating, ETA, price
    """
    start = time.time()

    if not req.drivers:
        raise HTTPException(status_code=400, detail="No drivers provided")

    bundle = registry.load('matching', 'latest')
    model, scaler = bundle['model'], bundle['scaler']

    scored = []
    for d in req.drivers:
        features = pd.DataFrame([{
            'distance_km': d.distance_km,
            'driver_rating': d.driver_rating,
            'acceptance_rate': d.acceptance_rate,
            'avg_response_time_sec': d.avg_response_time_sec,
            'completed_trips': d.completed_trips,
            'eta_minutes': d.eta_minutes,
            'price_estimate': d.price_estimate,
        }])
        score = float(model.predict(scaler.transform(features))[0])
        score = max(0.0, min(score, 1.0))
        scored.append(ScoredDriver(
            driver_id=d.driver_id,
            match_score=round(score, 4),
            distance_km=d.distance_km,
            driver_rating=d.driver_rating,
            eta_minutes=d.eta_minutes,
            price_estimate=d.price_estimate,
        ))

    # Sort by score descending, take top N
    scored.sort(key=lambda x: x.match_score, reverse=True)
    top = scored[:req.top_n]

    latency = (time.time() - start) * 1000
    return MatchingResponse(
        top_drivers=top,
        total_candidates=len(req.drivers),
        model_version=bundle['version'],
        latency_ms=round(latency, 2),
    )


@app.post("/predict/forecast", response_model=ForecastResponse)
async def predict_forecast(req: ForecastRequest):
    """
    Predict demand for a zone at a given time (TC45).
    - Returns timestamp + predicted value
    """
    start = time.time()
    bundle = registry.load('demand_forecast', 'latest')
    model, scaler = bundle['model'], bundle['scaler']
    feature_names = bundle.get('feature_names', [])

    # Build feature vector matching training columns
    zone_cols = [c for c in feature_names if c.startswith('zone_')]
    features = {'hour': req.hour, 'day_of_week': req.day_of_week, 'month': req.month}
    for zc in zone_cols:
        features[zc] = 1 if zc == f'zone_{req.zone_id}' else 0

    df = pd.DataFrame([features])
    # Reorder to match training
    for col in feature_names:
        if col not in df.columns:
            df[col] = 0
    df = df[feature_names]

    demand = float(model.predict(scaler.transform(df))[0])
    demand = max(0, round(demand))

    latency = (time.time() - start) * 1000
    return ForecastResponse(
        timestamp=datetime.utcnow().isoformat(),
        zone_id=req.zone_id,
        predicted_demand=demand,
        model_version=bundle['version'],
        latency_ms=round(latency, 2),
    )


@app.post("/predict/pricing", response_model=PricingResponse)
async def predict_pricing(req: PricingRequest):
    """
    Calculate trip pricing with surge (TC8).
    - price > base fare
    - surge >= 1
    Uses surge model internally to compute surge_multiplier.
    """
    start = time.time()

    # Base fare constants (VND)
    BASE_FARE = 12000       # Mở cửa
    PER_KM_RATE = 8500      # Giá/km

    # Calculate distance-based fare
    distance_fare = req.distance_km * PER_KM_RATE

    # Get surge from model
    try:
        bundle = registry.load('surge', 'latest')
        model, scaler = bundle['model'], bundle['scaler']

        surge_features = pd.DataFrame([{
            'demand_index': req.demand_index,
            'supply_ratio': 0.5,
            'hour_of_day': datetime.utcnow().hour,
            'is_holiday': 0,
            'is_event': 0,
        }])
        surge = float(model.predict(scaler.transform(surge_features))[0])
        surge = max(1.0, min(surge, 3.0))
        model_ver = bundle['version']
    except Exception:
        surge = 1.0
        model_ver = 'fallback'

    total_price = round((BASE_FARE + distance_fare) * surge)

    latency = (time.time() - start) * 1000
    return PricingResponse(
        base_fare=BASE_FARE,
        distance_fare=round(distance_fare),
        surge_multiplier=round(surge, 3),
        total_price=total_price,
        currency="VND",
        distance_km=req.distance_km,
        model_version=model_ver,
        latency_ms=round(latency, 2),
    )


@app.get("/models/{model_name}/version")
async def get_model_version(model_name: str):
    """Return current model version (TC46)."""
    try:
        version = registry.get_version(model_name)
        return {"model_name": model_name, "model_version": version}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found")


@app.post("/drift/check", response_model=DriftCheckResponse)
async def check_drift(req: DriftCheckRequest):
    """
    Drift Detection endpoint (TC48).
    Compares incoming data statistics against training distribution.
    If mean shifts by > 2 standard deviations, trigger drift alert.
    """
    try:
        training_stats = registry.get_training_stats(req.model_name)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Model '{req.model_name}' not found")

    if not training_stats:
        return DriftCheckResponse(
            model_name=req.model_name,
            drift_detected=False,
            drifted_features=[],
            details={"message": "No training stats available for drift comparison"},
        )

    drifted_features = []
    details = {}

    for feature, stats in training_stats.items():
        if feature in req.current_data:
            current_val = req.current_data[feature]
            train_mean = stats.get('mean', 0)
            train_std = stats.get('std', 1)

            if train_std > 0:
                z_score = abs(current_val - train_mean) / train_std
                is_drifted = z_score > 2.0
                details[feature] = {
                    'current': current_val,
                    'train_mean': train_mean,
                    'train_std': train_std,
                    'z_score': round(z_score, 4),
                    'drifted': is_drifted,
                }
                if is_drifted:
                    drifted_features.append(feature)

    return DriftCheckResponse(
        model_name=req.model_name,
        drift_detected=len(drifted_features) > 0,
        drifted_features=drifted_features,
        details=details,
    )
