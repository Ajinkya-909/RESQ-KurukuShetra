"""
Schemas and input validation logic for OR-Tools Resource Allocation Optimizer.
"""

from typing import Dict, List, Any, Tuple
import math


def validate_allocation_inputs(
    zones: List[Dict[str, Any]],
    helping_points: List[Dict[str, Any]]
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Validates structure, numeric bounds, and types of zones and helping points for allocation optimization:
    - zones: list of dicts with 'zone_id' (str), 'severity_score' ([0.0, 1.0]), 'needs' (dict[str, non-negative num])
    - helping_points: list of dicts with 'helping_point_id' (str), 'inventory' (dict[str, non-negative num])
    """
    if not isinstance(zones, list):
        raise ValueError(f"zones must be a list of dictionaries, got: {type(zones)}")

    if not isinstance(helping_points, list):
        raise ValueError(f"helping_points must be a list of dictionaries, got: {type(helping_points)}")

    clean_zones: List[Dict[str, Any]] = []
    seen_zone_ids = set()

    for idx, z in enumerate(zones):
        if not isinstance(z, dict):
            raise ValueError(f"Zone at index {idx} must be a dictionary.")

        zone_id = z.get("zone_id")
        if not isinstance(zone_id, str) or not zone_id.strip():
            raise ValueError(f"Zone at index {idx} missing or invalid 'zone_id'.")

        if zone_id in seen_zone_ids:
            raise ValueError(f"Duplicate zone_id found: '{zone_id}'")
        seen_zone_ids.add(zone_id)

        sev = z.get("severity_score", 0.0)
        if isinstance(sev, bool):
            raise ValueError(f"Zone '{zone_id}' severity_score cannot be boolean.")

        try:
            sev_float = float(sev)
        except (ValueError, TypeError):
            raise ValueError(f"Zone '{zone_id}' severity_score is not numeric: {sev}")

        if math.isnan(sev_float) or math.isinf(sev_float) or not (0.0 <= sev_float <= 1.0):
            raise ValueError(f"Zone '{zone_id}' severity_score must be a finite float in [0.0, 1.0], got: {sev_float}")

        needs = z.get("needs", {})
        if not isinstance(needs, dict):
            raise ValueError(f"Zone '{zone_id}' 'needs' must be a dictionary.")

        clean_needs: Dict[str, float] = {}
        for res_name, qty in needs.items():
            if not isinstance(res_name, str) or not res_name.strip():
                raise ValueError(f"Zone '{zone_id}' contains invalid resource name in needs.")

            if isinstance(qty, bool):
                raise ValueError(f"Zone '{zone_id}' resource '{res_name}' need cannot be boolean.")

            try:
                qty_float = float(qty)
            except (ValueError, TypeError):
                raise ValueError(f"Zone '{zone_id}' resource '{res_name}' need is not numeric: {qty}")

            if math.isnan(qty_float) or math.isinf(qty_float) or qty_float < 0.0:
                raise ValueError(f"Zone '{zone_id}' resource '{res_name}' need must be finite and non-negative, got: {qty_float}")

            clean_needs[res_name] = qty_float

        clean_zones.append({
            "zone_id": zone_id,
            "severity_score": round(sev_float, 4),
            "needs": clean_needs
        })

    clean_points: List[Dict[str, Any]] = []
    seen_hp_ids = set()

    for idx, hp in enumerate(helping_points):
        if not isinstance(hp, dict):
            raise ValueError(f"Helping point at index {idx} must be a dictionary.")

        hp_id = hp.get("helping_point_id")
        if not isinstance(hp_id, str) or not hp_id.strip():
            raise ValueError(f"Helping point at index {idx} missing or invalid 'helping_point_id'.")

        if hp_id in seen_hp_ids:
            raise ValueError(f"Duplicate helping_point_id found: '{hp_id}'")
        seen_hp_ids.add(hp_id)

        inv = hp.get("inventory", {})
        if not isinstance(inv, dict):
            raise ValueError(f"Helping point '{hp_id}' 'inventory' must be a dictionary.")

        clean_inv: Dict[str, float] = {}
        for res_name, qty in inv.items():
            if not isinstance(res_name, str) or not res_name.strip():
                raise ValueError(f"Helping point '{hp_id}' contains invalid resource name in inventory.")

            if isinstance(qty, bool):
                raise ValueError(f"Helping point '{hp_id}' resource '{res_name}' inventory cannot be boolean.")

            try:
                qty_float = float(qty)
            except (ValueError, TypeError):
                raise ValueError(f"Helping point '{hp_id}' resource '{res_name}' inventory is not numeric: {qty}")

            if math.isnan(qty_float) or math.isinf(qty_float) or qty_float < 0.0:
                raise ValueError(f"Helping point '{hp_id}' resource '{res_name}' inventory must be finite and non-negative, got: {qty_float}")

            clean_inv[res_name] = qty_float

        clean_points.append({
            "helping_point_id": hp_id,
            "inventory": clean_inv
        })

    return clean_zones, clean_points
