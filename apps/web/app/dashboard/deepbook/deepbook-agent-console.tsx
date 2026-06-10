"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Chip } from "@heroui/react";
import { Play, RotateCcw, Terminal } from "lucide-react";

import type {
  DashboardDeepBookAgentConfig,
  DashboardDeepBookRunJob,
  DashboardEvent,
} from "../../../lib/openstat-api";
import { formatEventType, summarizeEvent } from "../dashboard-event-utils";

import styles from "./deepbook-dashboard.module.css";

const apiUrl =
  process.env.NEXT_PUBLIC_OPENSTAT_API_URL ?? "http://localhost:4000";

type ConsoleLine = {
  id: string;
  timestamp: string;
  level: "info" | "warning" | "error";
  message: string;
};

type DeepBookAgentConsoleProps = {
  config: DashboardDeepBookAgentConfig;
  initialEvents: DashboardEvent[];
  initialRun?: {
    externalRunId?: string | null;
    id: string;
    status: string;
  };
};

export function DeepBookAgentConsole(props: DeepBookAgentConsoleProps) {
  const [activeRun, setActiveRun] = useState<
    | {
        externalRunId: string;
        id: string;
        status: DashboardDeepBookRunJob["status"];
      }
    | undefined
  >(
    props.initialRun?.externalRunId
      ? {
          externalRunId: props.initialRun.externalRunId,
          id: props.initialRun.id,
          status: normalizeStatus(props.initialRun.status),
        }
      : undefined,
  );
  const [events, setEvents] = useState(props.initialEvents);
  const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [isPending, setIsPending] = useState(false);

  const eventLines = useMemo(() => events.map(eventToConsoleLine), [events]);
  const lines = activeRun
    ? [...consoleLines, ...eventLines]
    : [
        {
          id: "ready",
          timestamp: new Date().toISOString(),
          level: "info" as const,
          message: "Agent console ready. Start a paper run or replay demo.",
        },
      ];
  const status = activeRun?.status ?? "ready";
  const isRunActive = status === "queued" || status === "running";

  useEffect(() => {
    if (!activeRun?.externalRunId || activeRun.status === "completed") {
      return;
    }

    let isMounted = true;
    const externalRunId = activeRun.externalRunId;

    async function pollEvents() {
      try {
        const response = await requestJson<{ events: DashboardEvent[] }>(
          `/v1/events?run=${encodeURIComponent(externalRunId)}&limit=50`,
          { method: "GET" },
        );

        if (!isMounted) {
          return;
        }

        setEvents(response.events);

        if (
          response.events.some(
            (event) =>
              event.eventType === "completion" &&
              getString(event.data?.status) === "completed",
          )
        ) {
          setActiveRun((current) =>
            current ? { ...current, status: "completed" } : current,
          );
        } else if (response.events.length > 0) {
          setActiveRun((current) =>
            current && current.status === "queued"
              ? { ...current, status: "running" }
              : current,
          );
        }
      } catch (requestError) {
        if (isMounted) {
          setError(getErrorMessage(requestError));
        }
      }
    }

    void pollEvents();
    const interval = window.setInterval(() => {
      void pollEvents();
    }, 2_500);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [activeRun?.externalRunId, activeRun?.status]);

  async function startRun(executionMode: "paper" | "replay") {
    setError(undefined);
    setIsPending(true);
    setEvents([]);

    try {
      const response = await requestJson<{ run: DashboardDeepBookRunJob }>(
        "/v1/deepbook/runs",
        {
          body: JSON.stringify({ executionMode }),
          method: "POST",
        },
      );

      setActiveRun({
        externalRunId: response.run.externalRunId,
        id: response.run.id,
        status: response.run.status,
      });
      setConsoleLines(
        response.run.consoleLines.map((line, index) => ({
          id: `${response.run.id}-${index}`,
          level: line.level ?? "info",
          message: line.message,
          timestamp: line.timestamp,
        })),
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className={styles.agentConsole}>
      <div className={styles.consoleHeader}>
        <div>
          <div className="dashboard-panel-title-row">
            <h2>Agent console</h2>
            <Chip
              color={status === "failed" ? "danger" : "success"}
              size="sm"
              variant="soft"
            >
              <Chip.Label>{status}</Chip.Label>
            </Chip>
          </div>
          <p>
            The dashboard requests a run; the separately deployed
            apps/deepbook-agent claims it and streams telemetry back here.
          </p>
        </div>
        <Terminal aria-hidden="true" size={18} />
      </div>

      {error ? <p className={styles.configError}>{error}</p> : null}

      <div className={styles.consoleActions}>
        <Button
          isDisabled={isPending || isRunActive}
          isPending={isPending}
          onPress={() => {
            void startRun("paper");
          }}
          type="button"
          variant="primary"
        >
          <Play aria-hidden="true" size={16} />
          Start paper run
        </Button>
        <Button
          isDisabled={isPending || isRunActive}
          onPress={() => {
            void startRun("replay");
          }}
          type="button"
          variant="secondary"
        >
          <RotateCcw aria-hidden="true" size={16} />
          Replay demo
        </Button>
        <span>
          {props.config.market} / {props.config.executionMode}
        </span>
      </div>

      <div className={styles.consoleOutput} role="log">
        {lines.map((line) => (
          <div data-level={line.level} key={line.id}>
            <span>{formatConsoleTime(line.timestamp)}</span>
            <code>{line.message}</code>
          </div>
        ))}
      </div>
    </div>
  );
}

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  await fetch(`${apiUrl}/v1/workspace/init`, {
    credentials: "include",
    method: "POST",
  });

  const headers = new Headers(init.headers);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });
  const data = (await response.json().catch(() => undefined)) as
    | { error?: { message?: string } }
    | undefined;

  if (!response.ok) {
    throw new Error(
      data?.error?.message ?? `${path} returned ${response.status}`,
    );
  }

  return data as T;
}

function eventToConsoleLine(event: DashboardEvent): ConsoleLine {
  const summary = getString(event.data?.summary) ?? summarizeEvent(event);

  return {
    id: event.id,
    timestamp: event.timestamp,
    level: event.eventType === "failure" ? "error" : "info",
    message: `${formatEventType(event.eventType)}: ${summary}`,
  };
}

function normalizeStatus(status: string): DashboardDeepBookRunJob["status"] {
  if (
    status === "queued" ||
    status === "running" ||
    status === "completed" ||
    status === "failed"
  ) {
    return status;
  }

  return "running";
}

function getString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function formatConsoleTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "DeepBook agent console request failed.";
}
