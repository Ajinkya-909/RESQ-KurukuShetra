"""
adapter.py — Data Transformation Layer

Converts incoming Node.js backend payloads (which mirror PostgreSQL row shapes)
into the formats expected by the existing ML pipeline modules:
  - optimizer.py expects: zones=[{zone_id, severity_score, needs}], helping_points=[{helping_point_id, inventory}]
  - predict.py expects: 12-feature dict
  - assessment.py expects: zone_id, severity_score, forecast_demand, current_inventory

Also provides population×severity heuristics for initial needs estimation
when no historical demand data exists (i.e., at simulation start).
"""

import math
from typing import Dict, Any, List, Optional

# ──────────────────────────────────────────────────────────────
# Per-capita daily resource requirements (disaster relief standards)
# Based on WHO/Sphere Standards for humanitarian response
# ──────────────────────────────────────────────────────────────
BASE_RATES: Dict[str, float] = {
    "water":       3.0,      # 3 liters/person/day (WHO minimum)
    "food":        0.5,      # 0.5 packets/person/day
    "medical":     0.02,     # 1 kit per 50 people/day
    "rescue_team": 0.001,    # 1 team per 1000 people
    "ambulance":   0.0005,   # 1 ambulance per 2000 people
    "shelter":     0.05,     # 1 tent per 20 people
    "rescue_boat": 0.0003,   # 1 boat per ~3000 people (flood-specific)
}

# Severity multiplier: critical zones need 2.5x base resources
SEVERITY_MULTIPLIERS: Dict[str, float] = {
    "low": 0.5,
    "moderate": 1.0,
    "high": 1.5,
    "critical": 2.5,
}

# Disaster-type specific resource relevance weights
# Resources not relevant to a disaster type get scaled down significantly
DISASTER_RESOURCE_RELEVANCE: Dict[str, Dict[str, float]] = {
    "flood": {
        "water": 1.0, "food": 1.0, "medical": 1.0, "rescue_team": 1.2,
        "ambulance": 0.8, "shelter": 1.2, "rescue_boat": 1.5,
    },
    "earthquake": {
        "water": 1.2, "food": 1.0, "medical": 1.5, "rescue_team": 1.5,
        "ambulance": 1.3, "shelter": 1.5, "rescue_boat": 0.0,
    },
    "fire": {
        "water": 1.5, "food": 0.8, "medical": 1.3, "rescue_team": 1.2,
        "ambulance": 1.5, "shelter": 1.0, "rescue_boat": 0.0,
    },
    "cyclone": {
        "water": 1.0, "food": 1.0, "medical": 1.0, "rescue_team": 1.0,
        "ambulance": 1.0, "shelter": 1.5, "rescue_boat": 0.8,
    },
}


def estimate_initial_needs(
    population: int,
    severity_level: str,
    disaster_type: str = "flood",
    resource_names: Optional[List[str]] = None,
) -> Dict[str, float]:
    """
    Estimate resource needs for a zone using population × severity heuristics.
    Used at simulation start when no historical demand data exists.

    Returns: { resource_name: estimated_quantity }
    """
    sev_mult = SEVERITY_MULTIPLIERS.get(severity_level.lower(), 1.0)
    relevance = DISASTER_RESOURCE_RELEVANCE.get(disaster_type.lower(), {})

    # If specific resource names given, only estimate those
    target_resources = resource_names if resource_names else list(BASE_RATES.keys())

    needs: Dict[str, float] = {}
    for res_name in target_resources:
        base = BASE_RATES.get(res_name, 0.1)
        rel_weight = relevance.get(res_name, 1.0)

        if rel_weight <= 0.0:
            continue  # Skip irrelevant resources (e.g., rescue_boat for earthquake)

        raw_need = population * base * sev_mult * rel_weight
        needs[res_name] = round(max(1.0, raw_need), 2)

    return needs


def adapt_helping_points_for_allocation(
    points_from_db: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Convert DB helping_point rows (with nested inventory arrays) into
    the flat format expected by optimizer.py:

    Input (from Node.js):
      { point_id, name, type, lat, lng, status, inventory: [
          { resource_id, resource_name?, total_stock, available_stock, ... },
          ...
      ]}

    Output (for optimizer):
      { helping_point_id: str, inventory: { resource_name: available_stock } }
    """
    adapted: List[Dict[str, Any]] = []

    for pt in points_from_db:
        if pt.get("status") == "offline":
            continue

        point_id = str(pt.get("point_id", pt.get("helping_point_id", "")))
        inv_list = pt.get("inventory", [])

        flat_inv: Dict[str, float] = {}
        for inv_row in inv_list:
            # Try resource_name first (formatted response), fall back to resource_type.name
            res_name = (
                inv_row.get("resource_name")
                or (inv_row.get("resource_type", {}) or {}).get("name")
                or f"resource_{inv_row.get('resource_id', 'unknown')}"
            )
            available = float(inv_row.get("available_stock", 0))
            if available > 0:
                flat_inv[res_name] = available

        if flat_inv:
            adapted.append({
                "helping_point_id": point_id,
                "inventory": flat_inv,
                # Carry through metadata for result mapping
                "_lat": pt.get("lat"),
                "_lng": pt.get("lng"),
                "_name": pt.get("name"),
                "_type": pt.get("type"),
            })

    return adapted


def adapt_zones_for_allocation(
    zones_from_db: List[Dict[str, Any]],
    resource_names: Optional[List[str]] = None,
    disaster_type: str = "flood",
) -> List[Dict[str, Any]]:
    """
    Convert DB zone rows into the format expected by optimizer.py.
    If zones have zone_needs data with positive shortages, use those.
    Otherwise, fall back to estimating needs from population × severity heuristic.
    """
    adapted: List[Dict[str, Any]] = []

    for z in zones_from_db:
        zone_id = str(z.get("zone_id", ""))
        sev_score = float(z.get("severity_score", 0.0))
        sev_level = z.get("severity_level", "low")
        population = int(z.get("population_estimate", 0))

        # Try to use existing zone_needs if available
        zone_needs_rows = z.get("zone_needs", [])
        needs: Dict[str, float] = {}

        if zone_needs_rows:
            for nr in zone_needs_rows:
                res_name = (
                    nr.get("resource_name")
                    or (nr.get("resource_type", {}) or {}).get("name")
                    or f"resource_{nr.get('resource_id', 'unknown')}"
                )
                needed = float(nr.get("quantity_needed", 0))
                fulfilled = float(nr.get("quantity_fulfilled", 0))
                shortage = max(0.0, needed - fulfilled)
                if shortage > 0:
                    needs[res_name] = round(shortage, 2)

        # Fall back to population x severity estimate if zone_needs produced no positive shortages
        if not needs:
            needs = estimate_initial_needs(
                population=max(population, 100),
                severity_level=sev_level,
                disaster_type=disaster_type,
                resource_names=resource_names,
            )

        if needs:
            adapted.append({
                "zone_id": zone_id,
                "severity_score": max(0.01, min(1.0, sev_score)) if sev_score > 0 else SEVERITY_MULTIPLIERS.get(sev_level, 0.5) / 2.5,
                "needs": needs,
                # Carry through for result mapping
                "_center_lat": z.get("center_lat"),
                "_center_lng": z.get("center_lng"),
                "_name": z.get("name"),
                "_population": population,
                "_severity_level": sev_level,
            })

    return adapted


def build_severity_features_from_zone(
    zone: Dict[str, Any],
    reports: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, float]:
    """
    Build the 12-feature vector for severity prediction from zone data and reports.
    Used when processing reports or re-evaluating zone severity during ticks.
    """
    population = float(zone.get("population_estimate", 0))
    sev_score = float(zone.get("severity_score", 0.0))

    reports = reports or []
    stranded = sum(float(r.get("stranded_people", 0) or 0) for r in reports if isinstance(r, dict))
    medical = sum(float(r.get("medical_cases", 0) or 0) for r in reports if isinstance(r, dict))
    sos_count = len(reports)

    return {
        "affected_population": min(population, 1_000_000),
        "stranded_people": min(stranded, 100_000),
        "water_level": min(sev_score, 1.0),
        "hospital_occupancy": min(sev_score * 0.8, 1.0),
        "medical_cases": min(medical, 50_000),
        "road_blocked": 1.0 if sev_score >= 0.7 else 0.0,
        "sos_count": min(sos_count, 10_000),
        "shelter_occupancy": min(sev_score * 0.6, 1.0),
        "food_shortage_ratio": min(sev_score * 0.5, 1.0),
        "water_shortage_ratio": min(sev_score * 0.6, 1.0),
        "disaster_duration_hours": 0.0,
        "population_vulnerability": min(sev_score * 0.7, 1.0),
    }


def build_resource_name_map(
    helping_points: List[Dict[str, Any]]
) -> Dict[str, int]:
    """
    Build a robust resource_name → resource_id lookup from helping point inventory data.
    Includes case-insensitive, punctuation-stripped, and standard synonym mapping.
    """
    name_to_id: Dict[str, int] = {}
    for pt in helping_points:
        for inv_row in pt.get("inventory", []):
            res_id = inv_row.get("resource_id")
            res_name = (
                inv_row.get("resource_name")
                or (inv_row.get("resource_type", {}) or {}).get("name")
            )
            if res_id is not None and res_name:
                res_id_int = int(res_id)
                name_to_id[res_name] = res_id_int
                name_to_id[res_name.lower()] = res_id_int
                name_to_id[res_name.lower().replace(" ", "_")] = res_id_int
                name_to_id[res_name.lower().replace("_", " ")] = res_id_int
                
                lower_name = res_name.lower()
                if "water" in lower_name:
                    name_to_id["water"] = res_id_int
                    name_to_id["drinking_water"] = res_id_int
                    name_to_id["drinking water"] = res_id_int
                if "food" in lower_name:
                    name_to_id["food"] = res_id_int
                    name_to_id["food_packets"] = res_id_int
                    name_to_id["food packets"] = res_id_int
                    name_to_id["ration"] = res_id_int
                if "medical" in lower_name or "kit" in lower_name:
                    name_to_id["medical"] = res_id_int
                    name_to_id["medical_kits"] = res_id_int
                    name_to_id["medical kits"] = res_id_int
                    name_to_id["first_aid"] = res_id_int
                if "rescue" in lower_name and "boat" not in lower_name:
                    name_to_id["rescue_team"] = res_id_int
                    name_to_id["rescue team"] = res_id_int
                    name_to_id["rescue_teams"] = res_id_int
                if "boat" in lower_name:
                    name_to_id["rescue_boat"] = res_id_int
                    name_to_id["rescue boat"] = res_id_int
                    name_to_id["boat"] = res_id_int
                if "ambulance" in lower_name:
                    name_to_id["ambulance"] = res_id_int
                    name_to_id["ambulances"] = res_id_int
                if "shelter" in lower_name or "tent" in lower_name:
                    name_to_id["shelter"] = res_id_int
                    name_to_id["tents"] = res_id_int
                    name_to_id["tent"] = res_id_int
    return name_to_id


def map_allocations_to_db_format(
    optimizer_result: Dict[str, Any],
    adapted_zones: List[Dict[str, Any]],
    adapted_points: List[Dict[str, Any]],
    resource_name_to_id: Dict[str, int],
    report: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """
    Convert OR-Tools optimizer output back into DB-shaped allocation rows
    that can be inserted via Prisma createMany.
    """
    zone_meta = {str(z["zone_id"]): z for z in adapted_zones}
    point_meta = {str(p["helping_point_id"]): p for p in adapted_points}

    db_allocations: List[Dict[str, Any]] = []

    report_lat = (report.get("lat") if report.get("lat") is not None else report.get("latitude")) if report else None
    report_lng = (report.get("lng") if report.get("lng") is not None else report.get("longitude")) if report else None
    report_zone_id = str(report.get("zone_id")) if report and report.get("zone_id") is not None else None

    # Fallback resource ID if mapping misses
    fallback_res_id = next(iter(resource_name_to_id.values()), 1) if resource_name_to_id else 1

    for alloc in optimizer_result.get("allocations", []):
        z_id = str(alloc["zone_id"])
        hp_id = str(alloc["helping_point_id"])
        res_name = str(alloc["resource"])
        raw_qty = float(alloc["quantity"])

        if raw_qty <= 0:
            continue

        z_meta = zone_meta.get(z_id, {})

        # Resolve valid resource_id
        res_id = (
            resource_name_to_id.get(res_name)
            or resource_name_to_id.get(res_name.lower())
            or resource_name_to_id.get(res_name.lower().replace(" ", "_"))
            or fallback_res_id
        )

        # Discretize quantity for integer items, min 1
        clean_qty = float(max(1, int(round(raw_qty))))

        # Micro-SOS allocation targets report coordinates if matching zone, else zone center
        if report_lat is not None and report_lng is not None and report_zone_id is not None and z_id == report_zone_id:
            target_lat = float(report_lat)
            target_lng = float(report_lng)
        else:
            target_lat = float(z_meta.get("_center_lat", 0.0) or 0.0)
            target_lng = float(z_meta.get("_center_lng", 0.0) or 0.0)

        db_allocations.append({
            "zone_id": int(z_id) if z_id.isdigit() else 0,
            "point_id": int(hp_id) if hp_id.isdigit() else 0,
            "resource_id": int(res_id),
            "quantity": clean_qty,
            "target_lat": target_lat,
            "target_lng": target_lng,
        })

    return db_allocations



def build_zone_needs_updates(
    adapted_zones: List[Dict[str, Any]],
    resource_name_to_id: Dict[str, int],
) -> List[Dict[str, Any]]:
    """
    Generate zone_needs upsert data from the adapted zones' needs.
    Used to populate the zone_needs table when simulation starts.
    """
    updates: List[Dict[str, Any]] = []

    for z in adapted_zones:
        zone_id = int(z["zone_id"]) if str(z["zone_id"]).isdigit() else 0
        sev_score = z.get("severity_score", 0.5)
        sev_level = z.get("_severity_level", "moderate")

        for res_name, qty in z.get("needs", {}).items():
            res_id = resource_name_to_id.get(res_name)
            if res_id is None:
                continue

            updates.append({
                "zone_id": zone_id,
                "resource_id": res_id,
                "quantity_needed": round(qty, 2),
                "quantity_fulfilled": 0.0,
                "fulfillment_status": "shortage",
            })

    return updates
