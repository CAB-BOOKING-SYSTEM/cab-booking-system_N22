"""
AI Platform - Data Generator
Generates synthetic training data for ETA, Surge Pricing, and Fraud Detection models.
This simulates realistic cab-booking-system historical data.
"""
import pandas as pd
import numpy as np
import os
import json
from datetime import datetime, timedelta

np.random.seed(42)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
os.makedirs(OUTPUT_DIR, exist_ok=True)


def generate_eta_data(n_samples=10000):
    """
    Generate ETA training data.
    Features: distance_km, hour_of_day, day_of_week, traffic_index (0-1), is_rain
    Target:   eta_minutes (realistic)
    """
    distances = np.random.exponential(scale=5, size=n_samples).clip(0.5, 50)
    hours = np.random.randint(0, 24, size=n_samples)
    days = np.random.randint(0, 7, size=n_samples)
    is_rain = np.random.binomial(1, 0.2, size=n_samples)

    # Traffic index depends on hour: peaks at 8am and 6pm
    traffic_base = np.where(
        ((hours >= 7) & (hours <= 9)) | ((hours >= 17) & (hours <= 19)),
        np.random.uniform(0.6, 1.0, size=n_samples),
        np.random.uniform(0.1, 0.5, size=n_samples)
    )
    traffic_index = (traffic_base + is_rain * 0.15).clip(0, 1)

    # ETA formula: base speed 30 km/h, traffic slows it down
    base_speed_kmh = 30
    effective_speed = base_speed_kmh * (1 - traffic_index * 0.6)
    effective_speed = effective_speed.clip(8, 50)

    eta_minutes = (distances / effective_speed) * 60
    # Add noise
    eta_minutes += np.random.normal(0, 1.5, size=n_samples)
    eta_minutes = eta_minutes.clip(1, 120)

    df = pd.DataFrame({
        'distance_km': np.round(distances, 2),
        'hour_of_day': hours,
        'day_of_week': days,
        'traffic_index': np.round(traffic_index, 3),
        'is_rain': is_rain,
        'eta_minutes': np.round(eta_minutes, 2),
    })

    df.to_csv(os.path.join(OUTPUT_DIR, 'eta_training_data.csv'), index=False)
    print(f"✅ ETA data generated: {len(df)} samples -> data/eta_training_data.csv")
    return df


def generate_surge_data(n_samples=5000):
    """
    Generate Surge Pricing training data.
    Features: demand_index (0-5), supply_ratio (0-1), hour_of_day, is_holiday, is_event
    Target:   surge_multiplier (1.0 - 3.0)
    """
    demand_index = np.random.uniform(0, 5, size=n_samples)
    supply_ratio = np.random.uniform(0.1, 1.0, size=n_samples)
    hours = np.random.randint(0, 24, size=n_samples)
    is_holiday = np.random.binomial(1, 0.1, size=n_samples)
    is_event = np.random.binomial(1, 0.05, size=n_samples)

    # Surge formula
    demand_supply_ratio = demand_index / (supply_ratio + 0.01)
    surge = 1.0 + np.log1p(demand_supply_ratio) * 0.3
    surge += is_holiday * 0.3
    surge += is_event * 0.5

    # Peak hours boost
    peak_boost = np.where(
        ((hours >= 7) & (hours <= 9)) | ((hours >= 17) & (hours <= 19)),
        0.2, 0.0
    )
    surge += peak_boost

    # Add noise and clamp
    surge += np.random.normal(0, 0.1, size=n_samples)
    surge = surge.clip(1.0, 3.0)

    df = pd.DataFrame({
        'demand_index': np.round(demand_index, 3),
        'supply_ratio': np.round(supply_ratio, 3),
        'hour_of_day': hours,
        'is_holiday': is_holiday,
        'is_event': is_event,
        'surge_multiplier': np.round(surge, 3),
    })

    df.to_csv(os.path.join(OUTPUT_DIR, 'surge_training_data.csv'), index=False)
    print(f"✅ Surge data generated: {len(df)} samples -> data/surge_training_data.csv")
    return df


def generate_fraud_data(n_samples=8000):
    """
    Generate Fraud Detection training data.
    Features: trip_amount, trip_distance_km, payment_method (encoded), num_trips_last_hour,
              avg_trip_amount, distance_from_usual_area, time_since_last_trip_min
    Target:   is_fraud (0 or 1)
    """
    # ~5% fraud rate
    is_fraud = np.random.binomial(1, 0.05, size=n_samples)

    trip_amount = np.where(
        is_fraud == 1,
        np.random.uniform(200000, 1000000, size=n_samples),
        np.random.uniform(15000, 200000, size=n_samples)
    )
    trip_distance = np.where(
        is_fraud == 1,
        np.random.uniform(0.1, 2, size=n_samples),  # Suspiciously short
        np.random.exponential(5, size=n_samples).clip(0.5, 50)
    )
    payment_method = np.random.choice([0, 1, 2], size=n_samples, p=[0.5, 0.3, 0.2])
    num_trips_last_hour = np.where(
        is_fraud == 1,
        np.random.randint(5, 15, size=n_samples),
        np.random.randint(0, 3, size=n_samples)
    )
    avg_trip_amount = np.where(
        is_fraud == 1,
        np.random.uniform(300000, 800000, size=n_samples),
        np.random.uniform(20000, 150000, size=n_samples)
    )
    distance_from_usual = np.where(
        is_fraud == 1,
        np.random.uniform(10, 50, size=n_samples),
        np.random.uniform(0, 10, size=n_samples)
    )
    time_since_last = np.where(
        is_fraud == 1,
        np.random.uniform(0, 5, size=n_samples),
        np.random.uniform(10, 480, size=n_samples)
    )

    df = pd.DataFrame({
        'trip_amount': np.round(trip_amount, 0).astype(int),
        'trip_distance_km': np.round(trip_distance, 2),
        'payment_method': payment_method,
        'num_trips_last_hour': num_trips_last_hour,
        'avg_trip_amount': np.round(avg_trip_amount, 0).astype(int),
        'distance_from_usual_area_km': np.round(distance_from_usual, 2),
        'time_since_last_trip_min': np.round(time_since_last, 2),
        'is_fraud': is_fraud,
    })

    df.to_csv(os.path.join(OUTPUT_DIR, 'fraud_training_data.csv'), index=False)
    print(f"✅ Fraud data generated: {len(df)} samples ({is_fraud.sum()} fraud) -> data/fraud_training_data.csv")
    return df


def generate_driver_matching_data(n_samples=8000):
    """
    Generate Driver Matching training data for multi-objective optimization.
    Features: distance_km, driver_rating, acceptance_rate, avg_response_time_sec,
              completed_trips, eta_minutes, price_estimate
    Target:   match_score (0-1, how good the match was based on customer satisfaction)
    """
    distance = np.random.exponential(3, size=n_samples).clip(0.2, 15)
    rating = np.random.uniform(3.0, 5.0, size=n_samples)
    acceptance_rate = np.random.uniform(0.5, 1.0, size=n_samples)
    avg_response_time = np.random.uniform(5, 120, size=n_samples)
    completed_trips = np.random.randint(0, 2000, size=n_samples)
    eta_minutes = (distance / 25 * 60) + np.random.normal(0, 2, size=n_samples)
    eta_minutes = eta_minutes.clip(1, 60)
    price_estimate = distance * np.random.uniform(8000, 15000, size=n_samples)

    # Match score formula: closer, higher-rated, faster-responding drivers score higher
    dist_score = np.maximum(0, 1 - distance / 15)
    rating_score = (rating - 3.0) / 2.0
    acceptance_score = acceptance_rate
    response_score = np.maximum(0, 1 - avg_response_time / 120)
    experience_score = np.minimum(1, completed_trips / 1000)

    match_score = (
        dist_score * 0.30 +
        rating_score * 0.30 +
        acceptance_score * 0.15 +
        response_score * 0.15 +
        experience_score * 0.10
    )
    match_score += np.random.normal(0, 0.05, size=n_samples)
    match_score = match_score.clip(0, 1)

    df = pd.DataFrame({
        'distance_km': np.round(distance, 2),
        'driver_rating': np.round(rating, 2),
        'acceptance_rate': np.round(acceptance_rate, 3),
        'avg_response_time_sec': np.round(avg_response_time, 1),
        'completed_trips': completed_trips,
        'eta_minutes': np.round(eta_minutes, 2),
        'price_estimate': np.round(price_estimate, 0).astype(int),
        'match_score': np.round(match_score, 4),
    })

    df.to_csv(os.path.join(OUTPUT_DIR, 'matching_training_data.csv'), index=False)
    print(f"✅ Matching data generated: {len(df)} samples -> data/matching_training_data.csv")
    return df


def generate_demand_forecast_data(n_days=365):
    """
    Generate Demand Forecasting data (TC45).
    Features: timestamp, zone_id, demand_count
    """
    rows = []
    zones = ['zone_A', 'zone_B', 'zone_C', 'zone_D']
    start_date = datetime(2025, 1, 1)

    for day in range(n_days):
        for hour in range(24):
            for zone in zones:
                ts = start_date + timedelta(days=day, hours=hour)
                # Base demand per zone
                base = {'zone_A': 50, 'zone_B': 30, 'zone_C': 40, 'zone_D': 20}[zone]
                # Hour-of-day effect
                hour_effect = 1.0
                if 7 <= hour <= 9:
                    hour_effect = 2.0
                elif 17 <= hour <= 19:
                    hour_effect = 1.8
                elif 0 <= hour <= 5:
                    hour_effect = 0.3
                # Weekend effect
                if ts.weekday() >= 5:
                    hour_effect *= 0.7
                demand = int(base * hour_effect + np.random.normal(0, 5))
                demand = max(0, demand)
                rows.append({
                    'timestamp': ts.isoformat(),
                    'zone_id': zone,
                    'demand_count': demand
                })

    df = pd.DataFrame(rows)
    df.to_csv(os.path.join(OUTPUT_DIR, 'demand_forecast_data.csv'), index=False)
    print(f"✅ Demand forecast data generated: {len(df)} samples -> data/demand_forecast_data.csv")
    return df


if __name__ == '__main__':
    print("=" * 60)
    print("🚀 AI Platform - Generating Training Data")
    print("=" * 60)
    generate_eta_data()
    generate_surge_data()
    generate_fraud_data()
    generate_driver_matching_data()
    generate_demand_forecast_data()
    print("=" * 60)
    print("✅ All training data generated successfully!")
    print("=" * 60)
