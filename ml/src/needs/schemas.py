"""
Needs Assessment schemas and input validation logic.
"""

from typing import Dict, Any, List, Union, Tuple
import math
from ml.src.schemas import map_severity_score_to_level


def validate_needs_inputs(
    zone_id: str,
    severity_score: float,
    forecast_demand: Dict[str, Any],
    current_inventory: Dict[str, Any]
) -> Tuple[str, float, str, Dict[str, float], Dict[str, float]]:
    """
    Validates and standardizes inputs for Needs Assessment:
    - zone_id must be non-empty string
    - severity_score must be float in [0.0, 1.0]
    - forecast_demand must be dict mapping non-empty resource names to floats or lists of floats
    - current_inventory must be dict mapping non-empty resource names to non-negative floats
    """
    if not isinstance(zone_id, str) or not zone_id.strip():
        raise ValueError(f"zone_id must be a non-empty string, got: {type(zone_id)}")

    try:
        if isinstance(severity_score, bool):
            raise ValueError()
        sev_float = float(severity_score)
    except (ValueError, TypeError):
        raise ValueError(f"severity_score must be a numeric value, got: {severity_score}")

    if math.isnan(sev_float) or math.isinf(sev_float) or not (0.0 <= sev_float <= 1.0):
        raise ValueError(f"severity_score must be a finite float in [0.0, 1.0], got: {sev_float}")

    severity_level = map_severity_score_to_level(sev_float)

    if not isinstance(forecast_demand, dict):
        raise ValueError(f"forecast_demand must be a dictionary, got: {type(forecast_demand)}")

    if not isinstance(current_inventory, dict):
        raise ValueError(f"current_inventory must be a dictionary, got: {type(current_inventory)}")

    # Clean forecast_demand
    clean_forecast: Dict[str, float] = {}
    for res_name, val in forecast_demand.items():
        if not isinstance(res_name, str) or not res_name.strip():
            raise ValueError(f"Resource name in forecast_demand must be non-empty string.")

        if isinstance(val, (list, tuple)):
            if len(val) == 0:
                raise ValueError(f"Forecast demand sequence for resource '{res_name}' cannot be empty.")
            target_val = val[-1] # Policy: final horizon value
        else:
            target_val = val

        if isinstance(target_val, bool):
            raise ValueError(f"Forecast demand value for '{res_name}' cannot be boolean.")

        try:
            val_float = float(target_val)
        except (ValueError, TypeError):
            raise ValueError(f"Forecast demand value for '{res_name}' is not numeric: {target_val}")

        if math.isnan(val_float) or math.isinf(val_float) or val_float < 0.0:
            raise ValueError(f"Forecast demand value for '{res_name}' must be finite and non-negative, got: {val_float}")

        clean_forecast[res_name] = val_float

    # Clean current_inventory
    clean_inventory: Dict[str, float] = {}
    for res_name, val in current_inventory.items():
        if not isinstance(res_name, str) or not res_name.strip():
            raise ValueError(f"Resource name in current_inventory must be non-empty string.")

        if isinstance(val, bool):
            raise ValueError(f"Inventory value for '{res_name}' cannot be boolean.")

        try:
            val_float = float(val)
        except (ValueError, TypeError):
            raise ValueError(f"Inventory value for '{res_name}' is not numeric: {val}")

        if math.isnan(val_float) or math.isinf(val_float) or val_float < 0.0:
            raise ValueError(f"Inventory value for '{res_name}' must be finite and non-negative, got: {val_float}")

        clean_inventory[res_name] = val_float

    return zone_id, round(sev_float, 4), severity_level, clean_forecast, clean_inventory
