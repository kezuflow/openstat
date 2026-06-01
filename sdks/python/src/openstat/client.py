from __future__ import annotations

import json
import time
import uuid
from dataclasses import dataclass
from typing import Any
from urllib import request
from urllib.error import HTTPError


JsonObject = dict[str, Any]
DEFAULT_OPENSTAT_ENDPOINT = "https://api.openstat.online"


@dataclass(frozen=True)
class OpenStatConfig:
    api_key: str
    endpoint: str = DEFAULT_OPENSTAT_ENDPOINT
    service_name: str = "python-agent"
    environment: str | None = None
    default_redaction: bool = True


class OpenStatApiError(RuntimeError):
    def __init__(self, status: int, body: Any) -> None:
        super().__init__(f"OpenStat API request failed with status {status}.")
        self.status = status
        self.body = body


class OpenStatClient:
    def __init__(
        self,
        *,
        api_key: str,
        endpoint: str | None = None,
        service_name: str = "python-agent",
        environment: str | None = None,
        default_redaction: bool = True,
    ) -> None:
        self.config = OpenStatConfig(
            api_key=api_key,
            endpoint=(endpoint or DEFAULT_OPENSTAT_ENDPOINT).rstrip("/"),
            service_name=service_name,
            environment=environment,
            default_redaction=default_redaction,
        )

    def start_agent_run(
        self,
        *,
        run_id: str | None = None,
        strategy: str | None = None,
        metadata: JsonObject | None = None,
    ) -> JsonObject:
        return {
            "run_id": run_id or f"run_{uuid.uuid4()}",
            "strategy": strategy,
            "metadata": self._metadata(metadata),
        }

    def send_event(self, event: JsonObject) -> Any:
        return self._post("/v1/ingest/events", self._prepare_event(event))

    def send_batch(self, events: list[JsonObject]) -> Any:
        return self._post(
            "/v1/ingest/batch",
            {"events": [self._prepare_event(event) for event in events]},
        )

    def record_decision(
        self,
        *,
        agent: JsonObject | None = None,
        run_id: str | None = None,
        trace_id: str | None = None,
        span_id: str | None = None,
        tags: list[str] | None = None,
        metadata: JsonObject | None = None,
        strategy: str | None = None,
        symbol: str,
        venue: str | None = None,
        action: str,
        confidence: int | None = None,
        rationale_summary: str | None = None,
    ) -> Any:
        return self.send_event(
            {
                **self._event_context(
                    agent=agent,
                    run_id=run_id,
                    trace_id=trace_id,
                    span_id=span_id,
                    tags=tags,
                    metadata=metadata,
                ),
                "type": "decision",
                "data": {
                    "strategy": strategy,
                    "symbol": symbol,
                    "venue": venue,
                    "action": action,
                    "confidence": confidence,
                    "rationale_summary": rationale_summary,
                },
            }
        )

    def record_chain_transaction(
        self,
        *,
        agent: JsonObject | None = None,
        run_id: str | None = None,
        trace_id: str | None = None,
        span_id: str | None = None,
        tags: list[str] | None = None,
        metadata: JsonObject | None = None,
        chain: str,
        chain_id: int,
        tx_hash: str,
        action: str | None = None,
        status: str | None = None,
        from_address: str | None = None,
        to_address: str | None = None,
    ) -> Any:
        return self.send_event(
            {
                **self._event_context(
                    agent=agent,
                    run_id=run_id,
                    trace_id=trace_id,
                    span_id=span_id,
                    tags=tags,
                    metadata=metadata,
                ),
                "type": "chain_transaction",
                "data": {
                    "chain": chain,
                    "chain_id": chain_id,
                    "tx_hash": tx_hash,
                    "action": action,
                    "status": status,
                    "from_address": from_address,
                    "to_address": to_address,
                },
            }
        )

    def record_risk_check(
        self,
        *,
        agent: JsonObject | None = None,
        run_id: str | None = None,
        trace_id: str | None = None,
        span_id: str | None = None,
        tags: list[str] | None = None,
        metadata: JsonObject | None = None,
        decision_id: str | None = None,
        result: str,
        reason: str | None = None,
    ) -> Any:
        return self.send_event(
            {
                **self._event_context(
                    agent=agent,
                    run_id=run_id,
                    trace_id=trace_id,
                    span_id=span_id,
                    tags=tags,
                    metadata=metadata,
                ),
                "type": "risk_check",
                "data": {
                    "decision_id": decision_id,
                    "result": result,
                    "reason": reason,
                },
            }
        )

    def record_order(
        self,
        *,
        agent: JsonObject | None = None,
        run_id: str | None = None,
        trace_id: str | None = None,
        span_id: str | None = None,
        tags: list[str] | None = None,
        metadata: JsonObject | None = None,
        order_id: str | None = None,
        decision_id: str | None = None,
        strategy: str | None = None,
        symbol: str,
        venue: str | None = None,
        side: str,
        order_type: str,
        quantity: str | int | float,
        price: str | int | float | None = None,
        status: str | None = None,
    ) -> Any:
        return self.send_event(
            {
                **self._event_context(
                    agent=agent,
                    run_id=run_id,
                    trace_id=trace_id,
                    span_id=span_id,
                    tags=tags,
                    metadata=metadata,
                ),
                "type": "order",
                "data": {
                    "order_id": order_id,
                    "decision_id": decision_id,
                    "strategy": strategy,
                    "symbol": symbol,
                    "venue": venue,
                    "side": side,
                    "order_type": order_type,
                    "quantity": quantity,
                    "price": price,
                    "status": status,
                },
            }
        )

    def record_fill(
        self,
        *,
        agent: JsonObject | None = None,
        run_id: str | None = None,
        trace_id: str | None = None,
        span_id: str | None = None,
        tags: list[str] | None = None,
        metadata: JsonObject | None = None,
        fill_id: str | None = None,
        order_id: str | None = None,
        strategy: str | None = None,
        symbol: str,
        venue: str | None = None,
        side: str,
        quantity: str | int | float,
        price: str | int | float,
        fee: str | int | float | None = None,
        status: str | None = None,
    ) -> Any:
        return self.send_event(
            {
                **self._event_context(
                    agent=agent,
                    run_id=run_id,
                    trace_id=trace_id,
                    span_id=span_id,
                    tags=tags,
                    metadata=metadata,
                ),
                "type": "fill",
                "data": {
                    "fill_id": fill_id,
                    "order_id": order_id,
                    "strategy": strategy,
                    "symbol": symbol,
                    "venue": venue,
                    "side": side,
                    "quantity": quantity,
                    "price": price,
                    "fee": fee,
                    "status": status,
                },
            }
        )

    def record_position(
        self,
        *,
        agent: JsonObject | None = None,
        run_id: str | None = None,
        trace_id: str | None = None,
        span_id: str | None = None,
        tags: list[str] | None = None,
        metadata: JsonObject | None = None,
        strategy: str | None = None,
        symbol: str,
        venue: str | None = None,
        quantity: str | int | float,
        average_price: str | int | float | None = None,
    ) -> Any:
        return self.send_event(
            {
                **self._event_context(
                    agent=agent,
                    run_id=run_id,
                    trace_id=trace_id,
                    span_id=span_id,
                    tags=tags,
                    metadata=metadata,
                ),
                "type": "position",
                "data": {
                    "strategy": strategy,
                    "symbol": symbol,
                    "venue": venue,
                    "quantity": quantity,
                    "average_price": average_price,
                },
            }
        )

    def record_pnl_snapshot(
        self,
        *,
        agent: JsonObject | None = None,
        run_id: str | None = None,
        trace_id: str | None = None,
        span_id: str | None = None,
        tags: list[str] | None = None,
        metadata: JsonObject | None = None,
        strategy: str | None = None,
        symbol: str | None = None,
        realized_pnl: str | int | float | None = None,
        unrealized_pnl: str | int | float | None = None,
        equity: str | int | float | None = None,
    ) -> Any:
        return self.send_event(
            {
                **self._event_context(
                    agent=agent,
                    run_id=run_id,
                    trace_id=trace_id,
                    span_id=span_id,
                    tags=tags,
                    metadata=metadata,
                ),
                "type": "pnl_snapshot",
                "data": {
                    "strategy": strategy,
                    "symbol": symbol,
                    "realized_pnl": realized_pnl,
                    "unrealized_pnl": unrealized_pnl,
                    "equity": equity,
                },
            }
        )

    def send_heartbeat(
        self,
        *,
        agent: JsonObject | None = None,
        run_id: str | None = None,
        trace_id: str | None = None,
        span_id: str | None = None,
        tags: list[str] | None = None,
        metadata: JsonObject | None = None,
        status: str = "online",
        expected_check_in_seconds: int | None = None,
        summary: str | None = None,
    ) -> Any:
        return self.send_event(
            {
                **self._event_context(
                    agent=agent,
                    run_id=run_id,
                    trace_id=trace_id,
                    span_id=span_id,
                    tags=tags,
                    metadata=metadata,
                ),
                "type": "heartbeat",
                "data": {
                    "status": status,
                    "expected_check_in_seconds": expected_check_in_seconds,
                    "summary": summary,
                },
            }
        )

    def record_error(
        self,
        *,
        agent: JsonObject | None = None,
        run_id: str | None = None,
        trace_id: str | None = None,
        span_id: str | None = None,
        tags: list[str] | None = None,
        metadata: JsonObject | None = None,
        code: str | None = None,
        message: str,
        retryable: bool | None = None,
    ) -> Any:
        return self.send_event(
            {
                **self._event_context(
                    agent=agent,
                    run_id=run_id,
                    trace_id=trace_id,
                    span_id=span_id,
                    tags=tags,
                    metadata=metadata,
                ),
                "type": "error",
                "data": {
                    "code": code,
                    "message": message,
                    "retryable": retryable,
                },
            }
        )

    def record_model_usage(
        self,
        *,
        agent: JsonObject | None = None,
        run_id: str | None = None,
        trace_id: str | None = None,
        span_id: str | None = None,
        tags: list[str] | None = None,
        metadata: JsonObject | None = None,
        provider: str | None = None,
        model: str | None = None,
        status: str | None = None,
        latency_ms: int | None = None,
        input_tokens: int | None = None,
        output_tokens: int | None = None,
        total_tokens: int | None = None,
        summary: str | None = None,
    ) -> Any:
        return self.send_event(
            {
                **self._event_context(
                    agent=agent,
                    run_id=run_id,
                    trace_id=trace_id,
                    span_id=span_id,
                    tags=tags,
                    metadata=metadata,
                ),
                "type": "completion",
                "data": {
                    "provider": provider,
                    "model": model,
                    "status": status,
                    "latency_ms": latency_ms,
                    "usage": {
                        "input_tokens": input_tokens,
                        "output_tokens": output_tokens,
                        "total_tokens": total_tokens,
                    },
                    "summary": summary,
                },
            }
        )

    def record_tool_call(
        self,
        *,
        agent: JsonObject | None = None,
        run_id: str | None = None,
        trace_id: str | None = None,
        span_id: str | None = None,
        tags: list[str] | None = None,
        tool_name: str,
        status: str | None = None,
        summary: str | None = None,
        metadata: JsonObject | None = None,
    ) -> Any:
        tool_metadata = {
            **(metadata or {}),
            "tool_name": tool_name,
        }

        return self.send_event(
            {
                **self._event_context(
                    agent=agent,
                    run_id=run_id,
                    trace_id=trace_id,
                    span_id=span_id,
                    tags=tags,
                    metadata=tool_metadata,
                ),
                "type": "completion",
                "data": {
                    "status": status,
                    "summary": summary,
                },
            }
        )

    def create_opentelemetry_http_config(self) -> JsonObject:
        return create_opentelemetry_http_config(
            api_key=self.config.api_key,
            endpoint=self.config.endpoint,
            service_name=self.config.service_name,
            environment=self.config.environment,
        )

    def _prepare_event(self, event: JsonObject) -> JsonObject:
        prepared = {
            "schema_version": 1,
            **event,
            "timestamp": event.get("timestamp", int(time.time() * 1000)),
            "metadata": self._metadata(event.get("metadata")),
        }
        return _drop_none(prepared)

    def _metadata(self, metadata: JsonObject | None = None) -> JsonObject:
        return _drop_none(
            {
                **(metadata or {}),
                "service_name": self.config.service_name,
                "environment": self.config.environment,
                "redaction_enabled": self.config.default_redaction,
            }
        )

    def _event_context(
        self,
        *,
        agent: JsonObject | None = None,
        run_id: str | None = None,
        trace_id: str | None = None,
        span_id: str | None = None,
        tags: list[str] | None = None,
        metadata: JsonObject | None = None,
    ) -> JsonObject:
        return {
            "agent": agent,
            "run_id": run_id,
            "trace_id": trace_id,
            "span_id": span_id,
            "tags": tags,
            "metadata": metadata,
        }

    def _post(self, path: str, payload: JsonObject) -> Any:
        body = json.dumps(_drop_none(payload)).encode("utf-8")
        req = request.Request(
            f"{self.config.endpoint}{path}",
            data=body,
            method="POST",
            headers={
                "authorization": f"Bearer {self.config.api_key}",
                "content-type": "application/json",
            },
        )

        try:
            with request.urlopen(req, timeout=10) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            raw_body = error.read().decode("utf-8")
            try:
                parsed_body: Any = json.loads(raw_body)
            except json.JSONDecodeError:
                parsed_body = raw_body
            raise OpenStatApiError(error.code, parsed_body) from error


def create_opentelemetry_http_config(
    *,
    api_key: str,
    endpoint: str | None = None,
    service_name: str,
    environment: str | None = None,
) -> JsonObject:
    base_url = (endpoint or DEFAULT_OPENSTAT_ENDPOINT).rstrip("/")
    headers = {"authorization": f"Bearer {api_key}"}
    return {
        "service_name": service_name,
        "environment": environment,
        "traces": {"url": f"{base_url}/v1/traces", "headers": headers},
        "logs": {"url": f"{base_url}/v1/logs", "headers": headers},
        "metrics": {"url": f"{base_url}/v1/metrics", "headers": headers},
    }


def _drop_none(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: _drop_none(child) for key, child in value.items() if child is not None}
    if isinstance(value, list):
        return [_drop_none(child) for child in value]
    return value
