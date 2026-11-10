"""
Chor Nazar Isolation Forest Anomaly Detection Engine
DigiHisab Technologies - Advanced Forensic Till & Loss Prevention ML
"""

import os
import pickle
import numpy as np
from typing import Dict, Any, List, Optional
from sklearn.ensemble import IsolationForest


class ChorNazarIsolationForest:
    """
    Evaluates cash drawer and point-of-sale operational events using
    unsupervised Isolation Forest anomaly detection.

    Feature Vector (5 Dimensions):
    1. amount_deviation_ratio (float): Transaction amount / 30-day cashier average amount
    2. time_skew (float): Minutes from shift start + evening surcharge (e.g., after 22:00)
    3. void_ratio (float): Current shift void amount / total sales volume
    4. drawer_variance (float): Abs(counted cash - expected cash) in PKR
    5. velocity (float): Cash transactions committed per minute
    """

    FEATURE_NAMES = [
        "amount_deviation_ratio",
        "time_skew",
        "void_ratio",
        "drawer_variance",
        "velocity",
    ]

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or os.path.join(
            os.path.dirname(__file__), "chor_nazar_iforest.pkl"
        )
        self.model: Optional[IsolationForest] = None
        self._initialize_or_load()

    def _generate_synthetic_baseline(self, n_samples: int = 600) -> np.ndarray:
        """
        Synthesizes a realistic Pakistani retail baseline of normal and suspicious till actions:
        - Normal operations: small variance (<300 PKR), low void ratio (<5%), steady velocity (0.5 - 2 tx/min)
        - Minor anomalies: moderate variance (500-1500 PKR), occasional voids
        - Severe fraud/theft: large variance (>2000 PKR), high voids (>15%), midnight skew
        """
        np.random.seed(42)

        # 1. Normal Retail Activity (~85% of samples)
        n_normal = int(n_samples * 0.85)
        normal_amount_dev = np.random.normal(1.0, 0.35, n_normal).clip(0.1, 2.5)
        normal_time_skew = np.random.uniform(10.0, 360.0, n_normal)
        normal_void_ratio = np.random.beta(1, 25, n_normal).clip(0.0, 0.08)
        normal_variance = np.random.exponential(120.0, n_normal).clip(0.0, 450.0)
        normal_velocity = np.random.normal(1.1, 0.4, n_normal).clip(0.1, 2.8)

        normal_features = np.column_stack([
            normal_amount_dev,
            normal_time_skew,
            normal_void_ratio,
            normal_variance,
            normal_velocity,
        ])

        # 2. Anomalous Till Behavior (~15% of samples)
        n_anom = n_samples - n_normal
        anom_amount_dev = np.random.uniform(2.8, 8.0, n_anom)
        anom_time_skew = np.random.choice([np.random.uniform(480, 720), np.random.uniform(0, 10)], n_anom)
        anom_void_ratio = np.random.uniform(0.12, 0.55, n_anom)
        anom_variance = np.random.uniform(800.0, 6500.0, n_anom)
        anom_velocity = np.random.uniform(3.5, 9.0, n_anom)

        anom_features = np.column_stack([
            anom_amount_dev,
            anom_time_skew,
            anom_void_ratio,
            anom_variance,
            anom_velocity,
        ])

        return np.vstack([normal_features, anom_features])

    def _initialize_or_load(self):
        """Loads trained weights or trains an instant baseline model."""
        if os.path.exists(self.model_path):
            try:
                with open(self.model_path, "rb") as f:
                    self.model = pickle.load(f)
                    return
            except Exception as e:
                print(f"[ChorNazar] Failed loading existing model: {e}. Retraining...")

        # Train new baseline Isolation Forest
        self.model = IsolationForest(
            n_estimators=100,
            contamination=0.12,
            random_state=42,
            max_samples="auto",
        )
        x_train = self._generate_synthetic_baseline()
        self.model.fit(x_train)

        # Save model checkpoint
        try:
            with open(self.model_path, "wb") as f:
                pickle.dump(self.model, f)
        except Exception as e:
            print(f"[ChorNazar] Warning saving model checkpoint: {e}")

    def score_event(
        self,
        amount_deviation_ratio: float,
        time_skew: float,
        void_ratio: float,
        drawer_variance: float,
        velocity: float,
    ) -> Dict[str, Any]:
        """
        Evaluates a single till event feature vector.

        Returns:
            anomaly_score (int): 1 (normal) or -1 (anomaly)
            decision_score (float): Raw decision function (negative = anomalous)
            risk_score (float): Calibrated risk probability (0.0 to 1.0)
            requires_biometric (bool): True if risk_score > 0.75
            tier (str): NORMAL | ELEVATED | CRITICAL_ALERT
            anomaly_factors (list): Plain English & Urdu explanations of driving anomalies
        """
        features = np.array([[
            float(amount_deviation_ratio),
            float(time_skew),
            float(void_ratio),
            float(drawer_variance),
            float(velocity),
        ]], dtype=float)

        raw_pred = self.model.predict(features)[0]  # 1 or -1
        decision_val = float(self.model.decision_function(features)[0])

        # Calibrate decision score into a 0.0 -> 1.0 risk probability
        # Normal decision score typically ranges from +0.20 (very normal) to -0.25 (severe anomaly)
        # We apply an inverse sigmoid transformation centered around -0.02
        z = -(decision_val + 0.02) / 0.08
        risk_score = float(1.0 / (1.0 + np.exp(-z)))
        risk_score = max(0.01, min(0.99, round(risk_score, 4)))

        # Rule-based safety overrides for extreme operational red flags
        if drawer_variance >= 2000.0 or void_ratio >= 0.25:
            risk_score = max(risk_score, 0.88)
        elif drawer_variance >= 1000.0:
            risk_score = max(risk_score, 0.76)

        requires_biometric = risk_score > 0.75

        # Determine Tier
        if risk_score > 0.75:
            tier = "CRITICAL_ALERT"
        elif risk_score > 0.45:
            tier = "ELEVATED"
        else:
            tier = "NORMAL"

        # Diagnostic Anomaly Factors
        factors: List[Dict[str, str]] = []
        if drawer_variance > 500.0:
            factors.append({
                "factor": "drawer_variance",
                "en": f"Cash drawer discrepancy of PKR {drawer_variance:,.0f} exceeds safe tolerance.",
                "ur": f"گلے میں PKR {drawer_variance:,.0f} کا غیر معمولی خسارہ ریکارڈ ہوا ہے۔",
            })
        if void_ratio > 0.10:
            factors.append({
                "factor": "void_ratio",
                "en": f"Ticket cancellation void ratio ({void_ratio * 100:.1f}%) is abnormally high.",
                "ur": f"بل منسوخی کی شرح ({void_ratio * 100:.1f}%) اوسط سے کہیں زیادہ ہے۔",
            })
        if amount_deviation_ratio > 3.0:
            factors.append({
                "factor": "amount_deviation",
                "en": f"Amount is {amount_deviation_ratio:.1f}x higher than cashier 30-day baseline.",
                "ur": f"رقم کیشیئر کے 30 روزہ معمول سے {amount_deviation_ratio:.1f} گنا زیادہ ہے۔",
            })
        if velocity > 4.0:
            factors.append({
                "factor": "velocity_burst",
                "en": f"Unusual sale ring velocity ({velocity:.1f} tx/min) detected.",
                "ur": f"انتہائی تیز رفتار سیل انٹری ({velocity:.1f} فی منٹ) مشکوک ہے۔",
            })

        return {
            "is_anomaly": raw_pred == -1 or risk_score > 0.60,
            "anomaly_score": int(raw_pred),
            "raw_decision_score": round(decision_val, 4),
            "risk_score": risk_score,
            "risk_percentage": round(risk_score * 100, 1),
            "tier": tier,
            "requires_biometric": requires_biometric,
            "alert_title_en": "Chor Nazar Red Alert" if requires_biometric else ("Suspicious Till Activity" if tier == "ELEVATED" else "Normal Operation"),
            "alert_title_ur": "🚨 چور نظر ریڈ الرٹ: منیجر بائیو میٹرک درکار" if requires_biometric else ("مشکوک گلہ سرگرمی" if tier == "ELEVATED" else "معمول کے مطابق"),
            "factors": factors,
        }


# Singleton engine instance
chor_nazar_engine = ChorNazarIsolationForest()
