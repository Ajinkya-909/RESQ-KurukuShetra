import math
from typing import Dict, Any, List
from ortools.linear_solver import pywraplp
from ml.src.allocation.schemas import validate_allocation_inputs


def haversine_distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculates Haversine distance in kilometers between two GPS coordinates."""
    if lat1 == 0.0 or lng1 == 0.0 or lat2 == 0.0 or lng2 == 0.0:
        return 0.0
    R = 6371.0  # Radius of Earth in km
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def optimize_allocations(
    zones: List[Dict[str, Any]],
    helping_points: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Optimizes multi-resource allocation from helping points to disaster zones using Google OR-Tools.

    Mathematical Formulation:
    Decision Variables:
      x[z, h, r] >= 0 (integer quantity of resource r dispatched from helping point h to zone z)

    Constraints:
      1. Inventory Limit: Sum_z x[z, h, r] <= inventory[h, r] (for each helping point h and resource r)
      2. Demand Limit:    Sum_h x[z, h, r] <= need[z, r]      (for each zone z and resource r)
      3. Anti-Hoarding:   x[z, h, r] <= 0.75 * inventory[h, r] (when multiple zones request resource r)

    Objective Function:
      Maximize Sum_{z, h, r} ( (severity_score[z] * sos_boost * distance_decay) * x[z, h, r] )
    """
    clean_zones, clean_points = validate_allocation_inputs(zones, helping_points)

    # Collect universe of resources requested or available
    resource_set = set()
    for z in clean_zones:
        resource_set.update(z["needs"].keys())
    for hp in clean_points:
        resource_set.update(hp["inventory"].keys())

    resources = sorted(list(resource_set))

    # Initialize OR-Tools CBC Mixed Integer Programming solver
    solver = pywraplp.Solver.CreateSolver("CBC")
    if not solver:
        # Fallback to GLOP linear solver if CBC solver binary is unavailable
        solver = pywraplp.Solver.CreateSolver("GLOP")

    # Decision variables mapping: x[(zone_id, hp_id, resource)]
    x = {}
    for z in clean_zones:
        z_id = z["zone_id"]
        for hp in clean_points:
            hp_id = hp["helping_point_id"]
            for r in resources:
                # Integer quantities for discrete disaster supplies
                var = solver.IntVar(0.0, solver.infinity(), f"x_{z_id}_{hp_id}_{r}")
                x[(z_id, hp_id, r)] = var

    # Constraint 1: Supply Limit per Helping Point & Resource
    for hp in clean_points:
        hp_id = hp["helping_point_id"]
        inv = hp["inventory"]
        for r in resources:
            available_stock = float(inv.get(r, 0.0))
            solver.Add(
                solver.Sum([x[(z["zone_id"], hp_id, r)] for z in clean_zones]) <= available_stock
            )

    # Constraint 2: Demand Limit per Zone & Resource
    for z in clean_zones:
        z_id = z["zone_id"]
        needs = z["needs"]
        for r in resources:
            needed_qty = float(needs.get(r, 0.0))
            solver.Add(
                solver.Sum([x[(z_id, hp["helping_point_id"], r)] for hp in clean_points]) <= needed_qty
            )

    # Constraint 3: Multi-Region Anti-Hoarding Constraint
    num_zones = len(clean_zones)
    if num_zones > 1:
        for hp in clean_points:
            hp_id = hp["helping_point_id"]
            inv = hp["inventory"]
            for r in resources:
                available_stock = float(inv.get(r, 0.0))
                requesting_zones = [z for z in clean_zones if float(z.get("needs", {}).get(r, 0.0)) > 0]
                if len(requesting_zones) > 1 and available_stock > 0:
                    for z in requesting_zones:
                        z_id = z["zone_id"]
                        # Critical high-severity & SOS target zones get full supply priority (1.0), normal zones capped at 75%
                        cap_ratio = 1.0 if (z.get("is_sos_target") or float(z.get("severity_score", 0.0)) >= 0.80) else 0.75
                        cap = max(1.0, available_stock * cap_ratio)
                        solver.Add(x[(z_id, hp_id, r)] <= cap)

    # Objective: Maximize severity, SOS priority, and distance-weighted allocation quantity
    objective = solver.Objective()
    for z in clean_zones:
        z_id = z["zone_id"]
        sev_score = max(0.01, float(z.get("severity_score", 0.1)))
        is_sos_target = bool(z.get("is_sos_target", False))
        sos_multiplier = 2.5 if is_sos_target else 1.0

        z_lat = float(z.get("_center_lat", 0.0) or 0.0)
        z_lng = float(z.get("_center_lng", 0.0) or 0.0)

        for hp in clean_points:
            hp_id = hp["helping_point_id"]
            hp_lat = float(hp.get("_lat", 0.0) or 0.0)
            hp_lng = float(hp.get("_lng", 0.0) or 0.0)

            # Distance decay: preference given to closer depots
            dist_km = haversine_distance_km(z_lat, z_lng, hp_lat, hp_lng) if (z_lat and hp_lat) else 0.0
            distance_decay = 1.0 / (1.0 + 0.02 * dist_km)  # ~2% decay per km distance

            weight = sev_score * sos_multiplier * distance_decay
            for r in resources:
                objective.SetCoefficient(x[(z_id, hp_id, r)], weight)

    objective.SetMaximization()

    # Run optimization solve
    status_code = solver.Solve()

    status_str = "FEASIBLE"
    if status_code == pywraplp.Solver.OPTIMAL:
        status_str = "OPTIMAL"
    elif status_code == pywraplp.Solver.INFEASIBLE:
        status_str = "INFEASIBLE"

    allocations: List[Dict[str, Any]] = []
    total_allocated = 0.0
    zone_allocated_totals: Dict[str, Dict[str, float]] = {z["zone_id"]: {} for z in clean_zones}

    for (z_id, hp_id, r), var in x.items():
        val = float(var.solution_value())
        if val > 1e-4: # Filter out negligible zero allocations
            val_rounded = round(val, 4)
            allocations.append({
                "zone_id": z_id,
                "helping_point_id": hp_id,
                "resource": r,
                "quantity": val_rounded
            })
            total_allocated += val_rounded
            zone_allocated_totals[z_id][r] = zone_allocated_totals[z_id].get(r, 0.0) + val_rounded

    # Sort allocations deterministically by zone_id, helping_point_id, resource
    allocations.sort(key=lambda item: (item["zone_id"], item["helping_point_id"], item["resource"]))

    # Calculate unmet demand
    unmet_demand: Dict[str, Dict[str, float]] = {}
    total_requested = 0.0
    total_unmet = 0.0

    for z in clean_zones:
        z_id = z["zone_id"]
        zone_unmet: Dict[str, float] = {}
        for r, req in z["needs"].items():
            total_requested += req
            alloc_for_res = zone_allocated_totals[z_id].get(r, 0.0)
            shortage = max(0.0, round(req - alloc_for_res, 4))
            if shortage > 1e-4:
                zone_unmet[r] = shortage
                total_unmet += shortage
        if zone_unmet:
            unmet_demand[z_id] = zone_unmet

    return {
        "status": status_str,
        "allocations": allocations,
        "unmet_demand": unmet_demand,
        "summary": {
            "total_requested": round(total_requested, 4),
            "total_allocated": round(total_allocated, 4),
            "total_unmet": round(total_unmet, 4)
        }
    }
