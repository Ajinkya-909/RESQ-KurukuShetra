"""
Input validation schemas for Unified ML Intelligence Pipeline.
"""

from typing import Dict, Any, List, Tuple


def validate_pipeline_input(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validates end-to-end pipeline input structure:
    - 'zone' (dict): must contain 'zone_id' (str)
    - 'reports' (list of dicts, optional)
    - 'operational_state' (dict, optional)
    - 'historical_demand' (dict, optional): resource_name -> list[float]
    - 'zone_inventory' (dict, optional): resource_name -> float
    - 'helping_points' (list of dicts, optional): list of helping points with 'helping_point_id' and 'inventory'
    """
    if not isinstance(payload, dict):
        raise ValueError(f"Pipeline payload must be a dictionary, got: {type(payload)}")

    zone = payload.get("zone")
    if not isinstance(zone, dict) or not zone.get("zone_id"):
        raise ValueError("Pipeline payload must contain a 'zone' dictionary with a valid 'zone_id'.")

    zone_id = str(zone.get("zone_id")).strip()
    if not zone_id:
        raise ValueError("'zone_id' cannot be an empty string.")

    reports = payload.get("reports", [])
    if not isinstance(reports, list):
        raise ValueError("Field 'reports' must be a list if provided.")

    operational_state = payload.get("operational_state", {})
    if not isinstance(operational_state, dict):
        raise ValueError("Field 'operational_state' must be a dictionary if provided.")

    historical_demand = payload.get("historical_demand", {})
    if not isinstance(historical_demand, dict):
        raise ValueError("Field 'historical_demand' must be a dictionary if provided.")

    zone_inventory = payload.get("zone_inventory", {})
    if not isinstance(zone_inventory, dict):
        raise ValueError("Field 'zone_inventory' must be a dictionary if provided.")

    helping_points = payload.get("helping_points", [])
    if not isinstance(helping_points, list):
        raise ValueError("Field 'helping_points' must be a list if provided.")

    return {
        "zone_id": zone_id,
        "zone": zone,
        "reports": reports,
        "operational_state": operational_state,
        "historical_demand": historical_demand,
        "zone_inventory": zone_inventory,
        "helping_points": helping_points
    }
