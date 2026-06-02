import json
from urllib.error import HTTPError

import pytest

from openstat import (
    DEFAULT_OPENSTAT_ENDPOINT,
    OpenStatApiError,
    OpenStatClient,
    create_opentelemetry_http_config,
)


class FakeResponse:
    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self):
        return b'{"accepted":true}'


def test_record_decision_emits_native_event(monkeypatch):
    captured = {}

    def fake_urlopen(req, timeout):
        captured["url"] = req.full_url
        captured["headers"] = dict(req.header_items())
        captured["body"] = req.data.decode("utf-8")
        captured["timeout"] = timeout
        return FakeResponse()

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    client = OpenStatClient(
        api_key="ostat_public_secret",
        endpoint="http://localhost:4000",
        service_name="pytest-agent",
    )

    result = client.record_decision(
        decision_id="decision-test-1",
        agent={"id": "agent-test"},
        strategy="breakout",
        symbol="BTC-USD",
        action="enter_long",
    )

    assert result == {"accepted": True}
    assert captured["url"] == "http://localhost:4000/v1/ingest/events"
    assert "Bearer ostat_public_secret" in captured["headers"]["Authorization"]
    assert '"id": "decision-test-1"' in captured["body"]
    assert '"decision_id": "decision-test-1"' in captured["body"]
    assert '"type": "decision"' in captured["body"]
    assert '"service_name": "pytest-agent"' in captured["body"]


def test_client_uses_hosted_endpoint_by_default(monkeypatch):
    captured = {}

    def fake_urlopen(req, timeout):
        captured["url"] = req.full_url
        captured["timeout"] = timeout
        return FakeResponse()

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    client = OpenStatClient(api_key="ostat_public_secret", service_name="pytest-agent")

    client.send_heartbeat()

    assert captured["url"] == f"{DEFAULT_OPENSTAT_ENDPOINT}/v1/ingest/events"


def test_record_tool_call_matches_completion_shape(monkeypatch):
    captured = {}

    def fake_urlopen(req, timeout):
        captured["body"] = json.loads(req.data.decode("utf-8"))
        captured["timeout"] = timeout
        return FakeResponse()

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    client = OpenStatClient(api_key="ostat_public_secret", service_name="pytest-agent")

    client.record_tool_call(
        agent={"id": "agent-test"},
        run_id="run_123",
        tool_name="place_order",
        status="ok",
        summary="Order placed.",
        metadata={"broker": "paper"},
    )

    assert captured["body"]["type"] == "completion"
    assert captured["body"]["run_id"] == "run_123"
    assert captured["body"]["data"] == {"status": "ok", "summary": "Order placed."}
    assert captured["body"]["metadata"]["tool_name"] == "place_order"
    assert captured["body"]["metadata"]["broker"] == "paper"
    assert captured["body"]["metadata"]["service_name"] == "pytest-agent"


def test_expanded_helpers_match_native_event_shape(monkeypatch):
    captured = []

    def fake_urlopen(req, timeout):
        captured.append(json.loads(req.data.decode("utf-8")))
        return FakeResponse()

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    client = OpenStatClient(api_key="ostat_public_secret", service_name="pytest-agent")

    client.record_order(
        agent={"id": "agent-test"},
        run_id="run_123",
        trace_id="trace_123",
        span_id="span_123",
        tags=["paper"],
        metadata={"broker": "paper"},
        decision_id="decision_123",
        symbol="BTC-USD",
        side="buy",
        order_type="limit",
        quantity="0.10",
    )
    client.record_fill(
        symbol="BTC-USD",
        side="buy",
        quantity="0.10",
        price="62500",
        status="partial",
    )
    client.record_position(
        strategy="breakout",
        symbol="BTC-USD",
        venue="paper",
        quantity="0.10",
        average_price="62500",
    )
    client.record_error(code="BROKER_TIMEOUT", message="Broker timed out.", retryable=True)
    client.record_model_usage(model="gpt-5.4", total_tokens=42)

    assert captured[0]["run_id"] == "run_123"
    assert captured[0]["trace_id"] == "trace_123"
    assert captured[0]["span_id"] == "span_123"
    assert captured[0]["tags"] == ["paper"]
    assert captured[0]["metadata"]["broker"] == "paper"
    assert captured[0]["data"]["decision_id"] == "decision_123"
    assert captured[1]["type"] == "fill"
    assert captured[1]["data"]["status"] == "partial"
    assert captured[2]["type"] == "position"
    assert captured[2]["data"]["average_price"] == "62500"
    assert captured[3]["type"] == "error"
    assert captured[3]["data"]["retryable"] is True
    assert captured[4]["type"] == "completion"
    assert captured[4]["data"]["usage"]["total_tokens"] == 42


def test_send_event_raises_api_error(monkeypatch):
    def fake_urlopen(_req, timeout):
        raise HTTPError(
            url="http://localhost:4000/v1/ingest/events",
            code=401,
            msg="Unauthorized",
            hdrs=None,
            fp=ErrorBody(b'{"error":{"code":"INVALID_API_KEY"}}'),
        )

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    client = OpenStatClient(api_key="bad", service_name="pytest-agent")

    with pytest.raises(OpenStatApiError) as exc:
        client.send_event({"type": "heartbeat", "data": {}})

    assert exc.value.status == 401
    assert exc.value.body == {"error": {"code": "INVALID_API_KEY"}}


def test_opentelemetry_config_returns_otlp_http_targets():
    config = create_opentelemetry_http_config(
        api_key="ostat_public_secret",
        endpoint="https://api.example.com",
        service_name="pytest-agent",
    )

    assert config["traces"]["url"] == "https://api.example.com/v1/traces"
    assert config["logs"]["url"] == "https://api.example.com/v1/logs"
    assert config["metrics"]["headers"]["authorization"] == "Bearer ostat_public_secret"


def test_opentelemetry_config_uses_hosted_endpoint_by_default():
    config = create_opentelemetry_http_config(
        api_key="ostat_public_secret",
        service_name="pytest-agent",
    )

    assert config["traces"]["url"] == f"{DEFAULT_OPENSTAT_ENDPOINT}/v1/traces"
    assert config["logs"]["url"] == f"{DEFAULT_OPENSTAT_ENDPOINT}/v1/logs"
    assert config["metrics"]["url"] == f"{DEFAULT_OPENSTAT_ENDPOINT}/v1/metrics"


def test_record_chain_transaction_emits_mantle_context(monkeypatch):
    captured = {}

    def fake_urlopen(req, timeout):
        captured["body"] = json.loads(req.data.decode("utf-8"))
        captured["timeout"] = timeout
        return FakeResponse()

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    client = OpenStatClient(api_key="ostat_public_secret", service_name="pytest-agent")

    client.record_chain_transaction(
        agent={"id": "agent-mantle"},
        run_id="run-mantle",
        chain="mantle",
        chain_id=5003,
        tx_hash=f"0x{'a' * 64}",
        action="anchor_audit",
        status="submitted",
    )

    assert captured["body"]["type"] == "chain_transaction"
    assert captured["body"]["run_id"] == "run-mantle"
    assert captured["body"]["data"] == {
        "chain": "mantle",
        "chain_id": 5003,
        "tx_hash": f"0x{'a' * 64}",
        "action": "anchor_audit",
        "status": "submitted",
    }


class ErrorBody:
    def __init__(self, body):
        self.body = body

    def read(self):
        return self.body

    def close(self):
        return None
