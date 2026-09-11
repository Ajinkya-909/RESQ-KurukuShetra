"""
Needs Assessment Core Calculation Engine.
Calculates resource shortages for a disaster zone based on forecast demand and current inventory.
"""

from typing import Dict, Any, List
from ml.src.needs.schemas import validate_needs_inputs


def assess_needs(
    zone_id: str,
    severity_score: float,
    forecast_demand: Dict[str, Any],
    current_inventory: Dict[str, Any] = None,
    include_provenance: bool = False
) -> Dict[str, Any]:
    """
    Computes exact resource shortage needs for a disaster zone.

    Shortage Formula:
    need = max(0.0, forecast_requirement - current_inventory)

    Policy Decisions:
    1. Forecast List Handling: If forecast_demand is a list (e.g. from Phase 4A [550, 600, 650]),
       the final horizon value (650) is used as the requirement target.
    2. Missing Inventory: If a resource appears in forecast_demand but not current_inventory,
       current_inventory is treated as 0.0, resulting in need = forecast_requirement.

    Returns structured output containing:
    - zone_id
    - severity_score
    - severity_level
    - needs (Dict[resource_name, float])
    - forecast_demand
    - current_inventory
    - (optional) provenance
    """
    if current_inventory is None:
        current_inventory = {}

    clean_zone_id, clean_sev, sev_level, clean_forecast, clean_inventory = validate_needs_inputs(
        zone_id, severity_score, forecast_demand, current_inventory
    )

    needs: Dict[str, float] = {}
    provenance: Dict[str, Dict[str, Any]] = {}

    for res_name, req in clean_forecast.items():
        inv = clean_inventory.get(res_name, 0.0)
        shortage = max(0.0, req - inv)
        needs[res_name] = round(shortage, 4)

        provenance[res_name] = {
            "forecast_requirement": req,
            "current_inventory": inv,
            "shortage": round(shortage, 4),
            "missing_inventory_defaulted": res_name not in clean_inventory
        }

    output: Dict[str, Any] = {
        "zone_id": clean_zone_id,
        "severity_score": clean_sev,
        "severity_level": sev_level,
        "needs": needs,
        "forecast_demand": clean_forecast,
        "current_inventory": {res: clean_inventory.get(res, 0.0) for res in clean_forecast.keys()}
    }

    if include_provenance:
        output["provenance"] = provenance

    return output
