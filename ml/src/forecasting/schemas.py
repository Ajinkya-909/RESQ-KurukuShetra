"""
Forecasting schemas and data validation logic.
"""

from typing import Dict, List, Any, Tuple
import math


def validate_forecasting_inputs(history: Dict[str, Any], horizon: int) -> Tuple[Dict[str, List[float]], int]:
    """
    Validates demand forecasting inputs:
    - horizon must be integer >= 1
    - history must be a non-empty dictionary mapping resource names (str) to sequences of non-negative numbers
    """
    if not isinstance(horizon, int) or isinstance(horizon, bool) or horizon < 1:
        raise ValueError(f"Horizon must be a positive integer >= 1, got: {horizon}")

    if not isinstance(history, dict) or not history:
        raise ValueError(f"History must be a non-empty dictionary, got: {type(history)}")

    validated_history: Dict[str, List[float]] = {}

    for resource_name, observations in history.items():
        if not isinstance(resource_name, str) or not resource_name.strip():
            raise ValueError(f"Resource name must be a non-empty string, got: {type(resource_name)}")

        if not isinstance(observations, (list, tuple)):
            raise ValueError(f"Observations for resource '{resource_name}' must be a sequence, got: {type(observations)}")

        if len(observations) == 0:
            raise ValueError(f"History for resource '{resource_name}' cannot be empty.")

        clean_obs: List[float] = []
        for i, val in enumerate(observations):
            if isinstance(val, bool):
                raise ValueError(f"Observation at index {i} for resource '{resource_name}' cannot be boolean.")

            try:
                val_float = float(val)
            except (ValueError, TypeError):
                raise ValueError(f"Observation at index {i} for resource '{resource_name}' is not numeric: {val}")

            if math.isnan(val_float) or math.isinf(val_float):
                raise ValueError(f"Observation at index {i} for resource '{resource_name}' is invalid (NaN/Inf): {val_float}")

            if val_float < 0.0:
                raise ValueError(f"Observation at index {i} for resource '{resource_name}' cannot be negative: {val_float}")

            clean_obs.append(val_float)

        validated_history[resource_name] = clean_obs

    return validated_history, horizon
