"""
Comprehensive unit tests for RESQ Demand Forecasting Baseline (ml/src/forecasting/baseline.py).
"""

import pytest
from ml.src.forecasting import forecast_demand

REALISTIC_DISASTER_HISTORY = {
    "water": [40, 45, 52, 60, 68, 75],
    "food": [30, 32, 35, 39, 43, 48],
    "medical_kits": [10, 11, 13, 14, 17, 19]
}


def test_single_and_multi_resource_forecast():
    res = forecast_demand(REALISTIC_DISASTER_HISTORY, horizon=3)
    assert "water" in res
    assert "food" in res
    assert "medical_kits" in res
    assert len(res["water"]) == 3
    assert len(res["food"]) == 3
    assert len(res["medical_kits"]) == 3


def test_horizon_1_and_3():
    res_1 = forecast_demand(REALISTIC_DISASTER_HISTORY, horizon=1)
    assert len(res_1["water"]) == 1

    res_3 = forecast_demand(REALISTIC_DISASTER_HISTORY, horizon=3)
    assert len(res_3["water"]) == 3


def test_increasing_trend_monotonicity():
    history = {"water": [10, 20, 30, 40]}
    res = forecast_demand(history, horizon=3)
    forecast = res["water"]
    assert forecast[0] > 40
    assert forecast[1] > forecast[0]
    assert forecast[2] > forecast[1]


def test_decreasing_trend_and_non_negativity_clamping():
    # Rapidly decreasing series should clamp at 0.0, never negative
    history = {"water": [50, 40, 30, 20, 10]}
    res = forecast_demand(history, horizon=5)
    forecast = res["water"]
    assert all(val >= 0.0 for val in forecast)
    assert forecast[-1] == 0.0


def test_constant_demand():
    history = {"blankets": [25, 25, 25, 25]}
    res = forecast_demand(history, horizon=3)
    assert res["blankets"] == [25.0, 25.0, 25.0]


def test_two_point_history():
    history = {"food": [10, 20]}
    res = forecast_demand(history, horizon=3)
    assert res["food"] == [30.0, 40.0, 50.0]


def test_one_point_history_persistence():
    history = {"rescue_teams": [5]}
    res = forecast_demand(history, horizon=3)
    assert res["rescue_teams"] == [5.0, 5.0, 5.0]


def test_empty_history_rejection():
    with pytest.raises(ValueError, match="non-empty dictionary"):
        forecast_demand({}, horizon=3)

    with pytest.raises(ValueError, match="cannot be empty"):
        forecast_demand({"water": []}, horizon=3)


def test_invalid_horizon_rejection():
    with pytest.raises(ValueError, match="Horizon must be a positive integer"):
        forecast_demand(REALISTIC_DISASTER_HISTORY, horizon=0)

    with pytest.raises(ValueError, match="Horizon must be a positive integer"):
        forecast_demand(REALISTIC_DISASTER_HISTORY, horizon=-1)

    with pytest.raises(ValueError, match="Horizon must be a positive integer"):
        forecast_demand(REALISTIC_DISASTER_HISTORY, horizon="3")


def test_negative_observations_rejection():
    history = {"water": [10, -5, 20]}
    with pytest.raises(ValueError, match="cannot be negative"):
        forecast_demand(history, horizon=3)


def test_nan_and_inf_rejection():
    history_nan = {"water": [10, float("nan"), 20]}
    with pytest.raises(ValueError, match="invalid \\(NaN/Inf\\)"):
        forecast_demand(history_nan, horizon=3)

    history_inf = {"water": [10, float("inf"), 20]}
    with pytest.raises(ValueError, match="invalid \\(NaN/Inf\\)"):
        forecast_demand(history_inf, horizon=3)


def test_determinism():
    res1 = forecast_demand(REALISTIC_DISASTER_HISTORY, horizon=3)
    res2 = forecast_demand(REALISTIC_DISASTER_HISTORY, horizon=3)
    assert res1 == res2


def test_resource_names_preserved():
    history = {"alpha_kits": [1, 2], "beta_kits": [3, 4]}
    res = forecast_demand(history, horizon=2)
    assert set(res.keys()) == {"alpha_kits", "beta_kits"}


def test_metadata_output():
    res = forecast_demand(REALISTIC_DISASTER_HISTORY, horizon=3, include_metadata=True)
    assert "forecast" in res
    assert res["method"] == "linear_trend_baseline"
    assert res["horizon"] == 3
