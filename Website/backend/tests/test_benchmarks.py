import pytest
from app.benchmarks.agent_dojo_adapter import AgentDojoBenchmarkAdapter
from app.benchmarks.experiment_runner import run_comparative_experiments

def test_agent_dojo_benchmark_runner():
    adapter = AgentDojoBenchmarkAdapter()
    results = adapter.run_benchmark()
    assert results["total_scenarios"] == 10
    assert results["defense_accuracy_percent"] >= 70.0
    assert len(results["scenario_results"]) == 10

def test_comparative_experiment_runner():
    report = run_comparative_experiments()
    assert "comparative_experiments" in report
    assert "Experiment_1_RuleBased_Only" in report["comparative_experiments"]
    assert "Experiment_2_ML_Only" in report["comparative_experiments"]
    assert "Experiment_3_Ensemble_Guardrail" in report["comparative_experiments"]
    assert len(report["threshold_optimization"]) == 3
