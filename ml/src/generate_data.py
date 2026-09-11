"""
Deterministic synthetic dataset generation for RESQ Severity Agent training.
Generates 10,000 domain-grounded disaster zone samples with nonlinear interactions and realistic noise.
"""

import os
import numpy as np
import pandas as pd
from typing import Tuple
from ml.src.schemas import FEATURE_NAMES

RANDOM_SEED = 42

def generate_synthetic_data(num_samples: int = 10000) -> pd.DataFrame:
    """
    Generates synthetic disaster zone samples with realistic operational relationships,
    nonlinear risk interactions, and noise.
    """
    np.random.seed(RANDOM_SEED)

    # 1. Base feature distributions
    affected_population = np.random.exponential(scale=5000, size=num_samples)
    affected_population = np.clip(affected_population, 50, 50000)

    # Stranded people correlated with affected population
    stranded_ratio = np.random.beta(a=1.5, b=8.0, size=num_samples)
    stranded_people = affected_population * stranded_ratio

    water_level = np.random.beta(a=2.0, b=3.0, size=num_samples)
    hospital_occupancy = np.random.uniform(0.3, 1.0, size=num_samples)

    # Medical cases correlated with affected population & stranded people
    medical_cases = (affected_population * 0.05 + stranded_people * 0.15) * np.random.uniform(0.5, 1.5, size=num_samples)
    medical_cases = np.clip(medical_cases, 0, 5000)

    road_blocked = np.random.binomial(n=1, p=0.35, size=num_samples).astype(float)

    # SOS count correlated with stranded & affected
    sos_count = np.random.poisson(lam=stranded_people * 0.05 + 1.0, size=num_samples).astype(float)

    shelter_occupancy = np.random.uniform(0.2, 1.0, size=num_samples)
    food_shortage_ratio = np.random.beta(a=2.0, b=3.0, size=num_samples)
    water_shortage_ratio = np.random.beta(a=2.5, b=2.5, size=num_samples)

    disaster_duration_hours = np.random.exponential(scale=24, size=num_samples)
    disaster_duration_hours = np.clip(disaster_duration_hours, 1, 168)

    population_vulnerability = np.random.beta(a=3.0, b=3.0, size=num_samples)

    # 2. Domain-grounded severity formula calculation
    # Linear baseline factors
    f_pop = np.log1p(affected_population) / np.log1p(50000) * 0.12
    f_stranded = np.log1p(stranded_people) / np.log1p(10000) * 0.18
    f_water = water_level * 0.15
    f_hosp = hospital_occupancy * 0.10
    f_med = np.log1p(medical_cases) / np.log1p(5000) * 0.12
    f_road = road_blocked * 0.08
    f_sos = np.log1p(sos_count) / np.log1p(100) * 0.08
    f_shelter = shelter_occupancy * 0.05
    f_food = food_shortage_ratio * 0.06
    f_water_short = water_shortage_ratio * 0.06
    f_vuln = population_vulnerability * 0.08

    # Linear combination
    base_severity = (f_pop + f_stranded + f_water + f_hosp + f_med +
                     f_road + f_sos + f_shelter + f_food + f_water_short + f_vuln)

    # 3. Nonlinear interaction terms (compound disaster risk factors)
    # Interaction 1: High hospital occupancy + high medical cases
    int_hosp_med = (hospital_occupancy > 0.8) * (medical_cases > 100) * 0.12
    # Interaction 2: High water level + road blocked
    int_water_road = (water_level > 0.7) * (road_blocked == 1.0) * 0.10
    # Interaction 3: High stranded people + high SOS count
    int_stranded_sos = (stranded_people > 200) * (sos_count > 10) * 0.10

    # Total score calculation with noise
    noise = np.random.normal(loc=0.0, scale=0.04, size=num_samples)
    raw_severity = base_severity + int_hosp_med + int_water_road + int_stranded_sos + noise

    # Clip severity score to strictly [0.0, 1.0]
    severity_score = np.clip(raw_severity, 0.0, 1.0)

    # 4. Construct DataFrame
    data = {
        "affected_population": affected_population,
        "stranded_people": stranded_people,
        "water_level": water_level,
        "hospital_occupancy": hospital_occupancy,
        "medical_cases": medical_cases,
        "road_blocked": road_blocked,
        "sos_count": sos_count,
        "shelter_occupancy": shelter_occupancy,
        "food_shortage_ratio": food_shortage_ratio,
        "water_shortage_ratio": water_shortage_ratio,
        "disaster_duration_hours": disaster_duration_hours,
        "population_vulnerability": population_vulnerability,
        "severity_score": severity_score
    }

    df = pd.DataFrame(data)
    # Ensure column order matches FEATURE_NAMES + target
    df = df[FEATURE_NAMES + ["severity_score"]]
    return df


def save_dataset(df: pd.DataFrame, output_path: str) -> None:
    """Saves DataFrame to CSV ensuring parent directories exist."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"[Dataset] Saved {len(df)} samples to {output_path}")


if __name__ == "__main__":
    df = generate_synthetic_data(10000)
    save_dataset(df, "ml/data/raw/disaster_severity_dataset.csv")
