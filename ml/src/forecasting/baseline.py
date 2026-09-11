"""
Trend-aware baseline demand forecasting module.
Calculates linear trend over historical observations and extrapolates into future horizon [1..N].
"""

from typing import Dict, Any, List, Union
import numpy as np
from ml.src.forecasting.schemas import validate_forecasting_inputs


def forecast_resource_series(series: List[float], horizon: int) -> List[float]:
    """
    Forecasts future values for a single numerical demand series.
    - len(series) == 1: persistence forecast (constant last value)
    - len(series) == 2: two-point linear slope extrapolation
    - len(series) >= 3: least-squares linear trend extrapolation
    All predictions are non-negative (clamped at 0.0) and rounded to 4 decimal places.
    """
    n = len(series)
    if n == 1:
        # Persistence forecast
        return [float(series[0])] * horizon

    x = np.arange(n)
    y = np.array(series, dtype=float)

    if n == 2:
        slope = y[1] - y[0]
        intercept = y[1]
        future_x = np.arange(1, horizon + 1)
        preds = intercept + slope * future_x
    else:
        # Least squares linear regression
        slope, intercept = np.polyfit(x, y, deg=1)
        future_x = np.arange(n, n + horizon)
        preds = intercept + slope * future_x

    # Clamp at 0.0 to prevent negative predictions
    clamped_preds = np.clip(preds, 0.0, None)
    return [float(round(val, 4)) for val in clamped_preds]


def forecast_demand(
    history: Dict[str, Any],
    horizon: int = 3,
    include_metadata: bool = False
) -> Dict[str, Any]:
    """
    Public entrypoint for resource demand forecasting.

    Input:
    - history: Dict[resource_name, Sequence[float]]
    - horizon: int (positive integer, default 3)
    - include_metadata: bool (if True, returns dict with 'forecast', 'method', 'horizon')

    Returns:
    Dict[resource_name, List[float]] OR metadata dictionary.
    """
    clean_history, clean_horizon = validate_forecasting_inputs(history, horizon)

    forecast_results: Dict[str, List[float]] = {}
    for resource_name, series in clean_history.items():
        forecast_results[resource_name] = forecast_resource_series(series, clean_horizon)

    if include_metadata:
        return {
            "forecast": forecast_results,
            "method": "linear_trend_baseline",
            "horizon": clean_horizon
        }

    return forecast_results
