import json
from urllib.error import HTTPError

import pytest

from openstat import OpenStatApiError, OpenStatClient, create_opentelemetry_http_config


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
        agent={"id": "agent-test"},
        strategy="breakout",
        symbol="BTC-USD",
        action="enter_long",
    )

    assert result == {"accepted": True}
    assert captured["url"] == "http://localhost:4000/v1/ingest/events"
    assert "Bearer ostat_public_secret" in captured["headers"]["Authorization"]
    assert '"type": "decision"' in captured["body"]
    assert '"service_name": "pytest-agent"' in captured["body"]


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


class ErrorBody:
    def __init__(self, body):
        self.body = body

    def read(self):
        return self.body

    def close(self):
        return None
