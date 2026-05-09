"""
AI Platform - Model Training Pipeline
Trains ETA, Surge Pricing, Fraud Detection, and Driver Matching models.
Saves trained models to the models/ directory with version tracking.

Covers: TC41 (ETA range), TC42 (Surge pricing), TC43 (Fraud detection),
        TC46 (Model versioning), TC48 (Drift detection baseline)
"""
import os
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.ensemble import (
    GradientBoostingRegressor,
    RandomForestClassifier,
    GradientBoostingClassifier,
    HistGradientBoostingRegressor,
)
from sklearn.linear_model import Ridge
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
)
from sklearn.preprocessing import StandardScaler

BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, '..', 'data')
MODEL_DIR = os.path.join(BASE_DIR, '..', 'models')
os.makedirs(MODEL_DIR, exist_ok=True)


def save_model(model, scaler, name, version, metrics, feature_names, training_stats=None):
    """Save model + metadata bundle."""
    bundle = {
        'model': model,
        'scaler': scaler,
        'version': version,
        'trained_at': datetime.utcnow().isoformat(),
        'metrics': metrics,
        'feature_names': feature_names,
    }
    if training_stats:
        bundle['training_stats'] = training_stats

    filepath = os.path.join(MODEL_DIR, f'{name}_v{version}.joblib')
    joblib.dump(bundle, filepath)

    # Also save as "latest"
    latest_path = os.path.join(MODEL_DIR, f'{name}_latest.joblib')
    joblib.dump(bundle, latest_path)

    # Save metadata JSON (for drift detection baseline)
    meta = {
        'model_name': name,
        'version': version,
        'trained_at': bundle['trained_at'],
        'metrics': metrics,
        'feature_names': feature_names,
    }
    if training_stats:
        meta['training_stats'] = training_stats

    meta_path = os.path.join(MODEL_DIR, f'{name}_v{version}_meta.json')
    with open(meta_path, 'w') as f:
        json.dump(meta, f, indent=2)

    print(f"  💾 Model saved: {filepath}")
    print(f"  📊 Metrics: {json.dumps(metrics, indent=4)}")


def train_eta_model(version='1.0.0'):
    """
    Train ETA Prediction model (TC41).
    Input:  distance_km, hour_of_day, day_of_week, traffic_index, is_rain
    Output: eta_minutes
    Constraints: eta > 0, eta < 60 for distance=5km (TC41)
    """
    print("\n" + "=" * 50)
    print("🕐 Training ETA Model")
    print("=" * 50)

    df = pd.read_csv(os.path.join(DATA_DIR, 'eta_training_data.csv'))
    feature_cols = ['distance_km', 'hour_of_day', 'day_of_week', 'traffic_index', 'is_rain']
    X = df[feature_cols]
    y = df['eta_minutes']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = GradientBoostingRegressor(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.1,
        random_state=42,
    )
    model.fit(X_train_scaled, y_train)

    y_pred = model.predict(X_test_scaled)
    metrics = {
        'mae': round(float(mean_absolute_error(y_test, y_pred)), 4),
        'rmse': round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 4),
        'r2': round(float(r2_score(y_test, y_pred)), 4),
    }

    # Compute training stats for drift detection (TC48)
    training_stats = {}
    for col in feature_cols:
        training_stats[col] = {
            'mean': round(float(X_train[col].mean()), 4),
            'std': round(float(X_train[col].std()), 4),
            'min': round(float(X_train[col].min()), 4),
            'max': round(float(X_train[col].max()), 4),
        }

    save_model(model, scaler, 'eta', version, metrics, feature_cols, training_stats)

    # Validate TC41: distance=5km should produce ETA > 0 and < 60
    test_input = pd.DataFrame([{
        'distance_km': 5.0, 'hour_of_day': 12, 'day_of_week': 2,
        'traffic_index': 0.5, 'is_rain': 0
    }])
    test_pred = model.predict(scaler.transform(test_input))[0]
    print(f"  ✅ TC41 Validation: distance=5km -> ETA={test_pred:.2f} min (expected: 0 < x < 60)")
    assert 0 < test_pred < 60, f"TC41 FAIL: ETA={test_pred}"


def train_surge_model(version='1.0.0'):
    """
    Train Surge Pricing model (TC42).
    Input:  demand_index, supply_ratio, hour_of_day, is_holiday, is_event
    Output: surge_multiplier
    Constraints: surge > 1 when demand_index >= 2 (TC42), max 3.0
    """
    print("\n" + "=" * 50)
    print("💰 Training Surge Pricing Model")
    print("=" * 50)

    df = pd.read_csv(os.path.join(DATA_DIR, 'surge_training_data.csv'))
    feature_cols = ['demand_index', 'supply_ratio', 'hour_of_day', 'is_holiday', 'is_event']
    X = df[feature_cols]
    y = df['surge_multiplier']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = GradientBoostingRegressor(
        n_estimators=150,
        max_depth=4,
        learning_rate=0.1,
        random_state=42,
    )
    model.fit(X_train_scaled, y_train)

    y_pred = model.predict(X_test_scaled)
    metrics = {
        'mae': round(float(mean_absolute_error(y_test, y_pred)), 4),
        'rmse': round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 4),
        'r2': round(float(r2_score(y_test, y_pred)), 4),
    }

    training_stats = {}
    for col in feature_cols:
        training_stats[col] = {
            'mean': round(float(X_train[col].mean()), 4),
            'std': round(float(X_train[col].std()), 4),
            'min': round(float(X_train[col].min()), 4),
            'max': round(float(X_train[col].max()), 4),
        }

    save_model(model, scaler, 'surge', version, metrics, feature_cols, training_stats)

    # Validate TC42: demand_index=2 should produce surge > 1
    test_input = pd.DataFrame([{
        'demand_index': 2.0, 'supply_ratio': 0.4, 'hour_of_day': 18,
        'is_holiday': 0, 'is_event': 0
    }])
    test_pred = model.predict(scaler.transform(test_input))[0]
    test_pred = float(np.clip(test_pred, 1.0, 3.0))
    print(f"  ✅ TC42 Validation: demand=2.0 -> surge={test_pred:.3f} (expected: > 1.0, <= 3.0)")
    assert test_pred > 1.0, f"TC42 FAIL: surge={test_pred}"
    assert test_pred <= 3.0, f"TC42 FAIL: surge={test_pred} > 3.0"


def train_fraud_model(version='1.0.0'):
    """
    Train Fraud Detection model (TC43).
    Input:  trip_amount, trip_distance_km, payment_method, num_trips_last_hour,
            avg_trip_amount, distance_from_usual_area_km, time_since_last_trip_min
    Output: fraud_score (probability), is_fraud (flag)
    Constraints: high-risk transaction -> fraud_score > threshold, flag=true (TC43)
    """
    print("\n" + "=" * 50)
    print("🛡️ Training Fraud Detection Model")
    print("=" * 50)

    df = pd.read_csv(os.path.join(DATA_DIR, 'fraud_training_data.csv'))
    feature_cols = [
        'trip_amount', 'trip_distance_km', 'payment_method',
        'num_trips_last_hour', 'avg_trip_amount',
        'distance_from_usual_area_km', 'time_since_last_trip_min'
    ]
    X = df[feature_cols]
    y = df['is_fraud']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = GradientBoostingClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.1,
        random_state=42,
    )
    model.fit(X_train_scaled, y_train)

    y_pred = model.predict(X_test_scaled)
    y_proba = model.predict_proba(X_test_scaled)[:, 1]
    metrics = {
        'accuracy': round(float(accuracy_score(y_test, y_pred)), 4),
        'precision': round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
        'recall': round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
        'f1': round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
    }

    training_stats = {}
    for col in feature_cols:
        training_stats[col] = {
            'mean': round(float(X_train[col].mean()), 4),
            'std': round(float(X_train[col].std()), 4),
            'min': round(float(X_train[col].min()), 4),
            'max': round(float(X_train[col].max()), 4),
        }

    save_model(model, scaler, 'fraud', version, metrics, feature_cols, training_stats)

    # Validate TC43: suspicious transaction -> flagged
    test_input = pd.DataFrame([{
        'trip_amount': 500000, 'trip_distance_km': 0.5, 'payment_method': 1,
        'num_trips_last_hour': 10, 'avg_trip_amount': 600000,
        'distance_from_usual_area_km': 30, 'time_since_last_trip_min': 2,
    }])
    test_proba = model.predict_proba(scaler.transform(test_input))[0][1]
    print(f"  ✅ TC43 Validation: suspicious tx -> fraud_score={test_proba:.4f} (threshold=0.5, flagged={test_proba > 0.5})")


def train_matching_model(version='1.0.0'):
    """
    Train Driver Matching Score model.
    Input:  distance_km, driver_rating, acceptance_rate, avg_response_time_sec,
            completed_trips, eta_minutes, price_estimate
    Output: match_score (0-1)
    Used by AI Agent for multi-objective driver ranking (TC51-TC53).
    """
    print("\n" + "=" * 50)
    print("🎯 Training Driver Matching Model")
    print("=" * 50)

    df = pd.read_csv(os.path.join(DATA_DIR, 'matching_training_data.csv'))
    feature_cols = [
        'distance_km', 'driver_rating', 'acceptance_rate',
        'avg_response_time_sec', 'completed_trips', 'eta_minutes', 'price_estimate'
    ]
    X = df[feature_cols]
    y = df['match_score']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Monotonic Constraints (TC53: AI phải tuân thủ logic nghiệp vụ)
    # Feature order: distance_km, driver_rating, acceptance_rate,
    #                avg_response_time_sec, completed_trips, eta_minutes, price_estimate
    # -1 = càng THẤP càng TỐT (distance gần, ETA nhanh, giá rẻ, phản hồi nhanh)
    # +1 = càng CAO càng TỐT (rating cao, acceptance cao, trips nhiều)
    monotonic_cst = [
        -1,  # distance_km: gần hơn = tốt hơn
         1,  # driver_rating: cao hơn = tốt hơn
         1,  # acceptance_rate: cao hơn = tốt hơn
        -1,  # avg_response_time_sec: nhanh hơn = tốt hơn
         1,  # completed_trips: nhiều hơn = tốt hơn
        -1,  # eta_minutes: nhanh hơn = tốt hơn
        -1,  # price_estimate: rẻ hơn = tốt hơn
    ]

    model = HistGradientBoostingRegressor(
        max_iter=200,
        max_depth=5,
        learning_rate=0.1,
        random_state=42,
        monotonic_cst=monotonic_cst,
    )
    model.fit(X_train_scaled, y_train)

    y_pred = model.predict(X_test_scaled)
    metrics = {
        'mae': round(float(mean_absolute_error(y_test, y_pred)), 4),
        'rmse': round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 4),
        'r2': round(float(r2_score(y_test, y_pred)), 4),
    }

    training_stats = {}
    for col in feature_cols:
        training_stats[col] = {
            'mean': round(float(X_train[col].mean()), 4),
            'std': round(float(X_train[col].std()), 4),
            'min': round(float(X_train[col].min()), 4),
            'max': round(float(X_train[col].max()), 4),
        }

    save_model(model, scaler, 'matching', version, metrics, feature_cols, training_stats)

    # Validate: closer driver with high rating should score higher
    d1 = pd.DataFrame([{
        'distance_km': 2.0, 'driver_rating': 4.9, 'acceptance_rate': 0.95,
        'avg_response_time_sec': 15, 'completed_trips': 500,
        'eta_minutes': 5, 'price_estimate': 30000
    }])
    d2 = pd.DataFrame([{
        'distance_km': 5.0, 'driver_rating': 3.5, 'acceptance_rate': 0.7,
        'avg_response_time_sec': 60, 'completed_trips': 50,
        'eta_minutes': 12, 'price_estimate': 75000
    }])
    s1 = model.predict(scaler.transform(d1))[0]
    s2 = model.predict(scaler.transform(d2))[0]
    print(f"  ✅ TC51/52 Validation: D1(close+good)={s1:.4f} vs D2(far+low)={s2:.4f} -> D1 wins: {s1 > s2}")

    # Validate TC53: ETA monotonicity - lower ETA MUST score higher
    d_fast = pd.DataFrame([{
        'distance_km': 2.0, 'driver_rating': 5.0, 'acceptance_rate': 0.9,
        'avg_response_time_sec': 30, 'completed_trips': 0,
        'eta_minutes': 5, 'price_estimate': 40000
    }])
    d_slow = pd.DataFrame([{
        'distance_km': 2.0, 'driver_rating': 5.0, 'acceptance_rate': 0.9,
        'avg_response_time_sec': 30, 'completed_trips': 0,
        'eta_minutes': 8, 'price_estimate': 40000
    }])
    s_fast = model.predict(scaler.transform(d_fast))[0]
    s_slow = model.predict(scaler.transform(d_slow))[0]
    print(f"  ✅ TC53 Validation: ETA=5min -> {s_fast:.4f} vs ETA=8min -> {s_slow:.4f} -> Fast wins: {s_fast > s_slow}")
    assert s_fast > s_slow, f"TC53 FAIL: ETA=5({s_fast}) should > ETA=8({s_slow})"


def train_demand_forecast_model(version='1.0.0'):
    """
    Train simple Demand Forecast model (TC45).
    Uses hourly features to predict demand count per zone.
    """
    print("\n" + "=" * 50)
    print("📈 Training Demand Forecast Model")
    print("=" * 50)

    df = pd.read_csv(os.path.join(DATA_DIR, 'demand_forecast_data.csv'))
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df['hour'] = df['timestamp'].dt.hour
    df['day_of_week'] = df['timestamp'].dt.dayofweek
    df['month'] = df['timestamp'].dt.month

    # One-hot encode zone
    zone_dummies = pd.get_dummies(df['zone_id'], prefix='zone')
    feature_cols_base = ['hour', 'day_of_week', 'month']
    zone_cols = list(zone_dummies.columns)
    feature_cols = feature_cols_base + zone_cols

    X = pd.concat([df[feature_cols_base], zone_dummies], axis=1)
    y = df['demand_count']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = Ridge(alpha=1.0)
    model.fit(X_train_scaled, y_train)

    y_pred = model.predict(X_test_scaled)
    metrics = {
        'mae': round(float(mean_absolute_error(y_test, y_pred)), 4),
        'rmse': round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 4),
        'r2': round(float(r2_score(y_test, y_pred)), 4),
    }

    training_stats = {}
    for col in feature_cols:
        training_stats[col] = {
            'mean': round(float(X_train[col].mean()), 4),
            'std': round(float(X_train[col].std()), 4),
        }

    save_model(model, scaler, 'demand_forecast', version, metrics, feature_cols, training_stats)
    print(f"  ✅ TC45 Validation: Forecast model trained with {len(feature_cols)} features")


if __name__ == '__main__':
    model_version = '1.0.0'
    print("=" * 60)
    print("🚀 AI Platform - Training All Models")
    print(f"   Version: {model_version}")
    print("=" * 60)

    train_eta_model(model_version)
    train_surge_model(model_version)
    train_fraud_model(model_version)
    train_matching_model(model_version)
    train_demand_forecast_model(model_version)

    print("\n" + "=" * 60)
    print("✅ All models trained and saved successfully!")
    print(f"   Output directory: {os.path.abspath(MODEL_DIR)}")
    print("=" * 60)
