"""
Google OR-Tools Constrained Resource Allocation Optimizer.
Formulates linear integer programming model to maximize priority-weighted fulfilled demand across zones
under helping point inventory capacity constraints.
"""

from typing import Dict, Any, List
from ortools.linear_solver import pywraplp
from ml.src.allocation.schemas import validate_allocation_inputs


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

    Objective Function:
      Maximize Sum_{z, h, r} ( severity_score[z] * x[z, h, r] )

    Returns:
    {
        "status": "OPTIMAL",
        "allocations": [
            {
                "zone_id": str,
                "helping_point_id": str,
                "resource": str,
                "quantity": float/int
            }, ...
        ],
        "unmet_demand": {
            "ZONE-A": {"food": 100.0}, ...
        },
        "summary": {
            "total_requested": float,
            "total_allocated": float,
            "total_unmet": float
        }
    }
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

    # Objective: Maximize severity-weighted allocation quantity
    objective = solver.Objective()
    for z in clean_zones:
        z_id = z["zone_id"]
        # Scale severity weight to prioritize critical zones (min weight 0.01 to ensure non-zero priority)
        weight = max(0.01, float(z["severity_score"]))
        for hp in clean_points:
            hp_id = hp["helping_point_id"]
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
