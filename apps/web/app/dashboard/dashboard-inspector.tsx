"use client";

import { Button, Drawer, Meter, Tabs } from "@heroui/react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";

import type { DashboardInspectorData } from "../../lib/openstat-api";

export function DashboardInspector(props: {
  closeHref: string;
  inspector?: DashboardInspectorData;
}) {
  const router = useRouter();

  if (!props.inspector) {
    return null;
  }

  function closeInspector() {
    router.push(props.closeHref);
  }

  return (
    <Drawer.Backdrop
      className="dashboard-inspector-backdrop"
      isOpen
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          closeInspector();
        }
      }}
      variant="transparent"
    >
      <Drawer.Content className="dashboard-inspector-content" placement="right">
        <Drawer.Dialog
          aria-label={`${props.inspector.kind} inspector`}
          className="dashboard-inspector"
        >
          <Drawer.Header className="dashboard-inspector-header">
            <div>
              <p>{props.inspector.kind}</p>
              <Drawer.Heading>{props.inspector.title}</Drawer.Heading>
            </div>
            <Button
              aria-label="Close inspector"
              isIconOnly
              size="sm"
              variant="tertiary"
              onPress={closeInspector}
            >
              <X aria-hidden="true" size={16} />
            </Button>
          </Drawer.Header>

          <Drawer.Body className="dashboard-inspector-body">
            {props.inspector.errors.length > 0 ? (
              <div className="dashboard-inspector-error">
                {props.inspector.errors.join(" | ")}
              </div>
            ) : null}

            <Tabs
              className="dashboard-inspector-tabs"
              defaultSelectedKey="summary"
              variant="secondary"
            >
              <Tabs.ListContainer>
                <Tabs.List aria-label="Inspector sections">
                  <Tabs.Tab id="summary">
                    Summary
                    <Tabs.Indicator />
                  </Tabs.Tab>
                  <Tabs.Tab id="timeline">
                    Timeline
                    <Tabs.Indicator />
                  </Tabs.Tab>
                  <Tabs.Tab id="raw">
                    Raw
                    <Tabs.Indicator />
                  </Tabs.Tab>
                  <Tabs.Tab id="artifacts">
                    Artifacts
                    <Tabs.Indicator />
                  </Tabs.Tab>
                </Tabs.List>
              </Tabs.ListContainer>

              <Tabs.Panel className="dashboard-inspector-panel" id="summary">
                {props.inspector.summary.length > 0 ? (
                  <dl className="dashboard-inspector-summary">
                    {props.inspector.summary.map((item) => (
                      <div key={item.label}>
                        <dt>{item.label}</dt>
                        <dd>{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="dashboard-inspector-muted">
                    No structured summary is available for this item yet.
                  </p>
                )}
              </Tabs.Panel>

              <Tabs.Panel className="dashboard-inspector-panel" id="timeline">
                <InspectorTimeline data={props.inspector.data} />
              </Tabs.Panel>

              <Tabs.Panel className="dashboard-inspector-panel" id="raw">
                <pre className="dashboard-inspector-json">
                  {JSON.stringify(props.inspector.data, null, 2)}
                </pre>
              </Tabs.Panel>

              <Tabs.Panel className="dashboard-inspector-panel" id="artifacts">
                <InspectorArtifacts data={props.inspector.data} />
              </Tabs.Panel>
            </Tabs>
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}

function InspectorTimeline(props: { data: unknown }) {
  const events = getArrayFromUnknown(props.data, "events");
  const decisions = getArrayFromUnknown(props.data, "decisions");
  const fills = getArrayFromUnknown(props.data, "fills");
  const selectedEventId = getStringFromUnknown(props.data, "selectedEventId");
  const timelineError = getStringFromUnknown(props.data, "timelineError");
  const items = [...events, ...decisions, ...fills]
    .map((item, index) => getTimelineItem(item, index, selectedEventId))
    .sort((left, right) => left.sortTime - right.sortTime)
    .slice(0, 20);
  const finiteTimes = items
    .map((item) => item.sortTime)
    .filter(
      (time) => Number.isFinite(time) && time !== Number.MAX_SAFE_INTEGER,
    );
  const timelineStart = finiteTimes.length > 0 ? Math.min(...finiteTimes) : 0;
  const timelineEnd = Math.max(
    timelineStart + 1,
    ...items.map((item) => {
      const offset = getTimelineOffset(item.sortTime, timelineStart);

      return timelineStart + offset + (item.durationMs ?? 0);
    }),
  );
  const timelineSpan = Math.max(1, timelineEnd - timelineStart);

  if (items.length === 0) {
    return (
      <>
        {timelineError ? (
          <p className="dashboard-inspector-error">{timelineError}</p>
        ) : null}
        <p className="dashboard-inspector-muted">
          No timeline rows are available for this detail yet.
        </p>
      </>
    );
  }

  return (
    <>
      {timelineError ? (
        <p className="dashboard-inspector-error">{timelineError}</p>
      ) : null}
      <ol className="dashboard-inspector-timeline">
        {items.map((item) => {
          const offsetMs = getTimelineOffset(item.sortTime, timelineStart);
          const durationMs = item.durationMs ?? 0;
          const offsetPercent = Math.min((offsetMs / timelineSpan) * 100, 96);
          const durationPercent =
            durationMs > 0 ? Math.max((durationMs / timelineSpan) * 100, 2) : 0;
          const waterfallStyle = {
            "--timeline-duration": `${durationPercent}%`,
            "--timeline-offset": `${offsetPercent}%`,
          } as CSSProperties;

          return (
            <li
              data-selected={item.isSelected ? "true" : undefined}
              key={`${item.id ?? item.label}-${item.index}`}
            >
              <div className="dashboard-inspector-timeline-row">
                <strong>{item.label}</strong>
                <span>{formatOffset(offsetMs)}</span>
                <span>{formatDuration(item.durationMs)}</span>
              </div>
              <div
                className="dashboard-inspector-waterfall"
                style={waterfallStyle}
              >
                {durationMs > 0 ? (
                  <Meter
                    aria-label={`${item.label} starts ${formatOffset(
                      offsetMs,
                    )} and takes ${formatDuration(durationMs)}`}
                    className="dashboard-inspector-waterfall-meter"
                    maxValue={durationMs}
                    minValue={0}
                    size="sm"
                    value={durationMs}
                    valueLabel={formatDuration(durationMs)}
                  >
                    <Meter.Track>
                      <Meter.Fill />
                    </Meter.Track>
                  </Meter>
                ) : (
                  <i
                    aria-label={`${item.label} starts ${formatOffset(offsetMs)}`}
                    data-marker="true"
                    role="img"
                  />
                )}
              </div>
              {item.meta ? (
                <span className="dashboard-inspector-timeline-meta">
                  {item.meta}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </>
  );
}

function getTimelineItem(
  item: unknown,
  index: number,
  selectedEventId: string | undefined,
) {
  const record = asRecord(item);
  const label =
    record?.eventType ??
    record?.status ??
    record?.result ??
    record?.symbol ??
    `Step ${index + 1}`;
  const timestamp =
    record?.timestamp ??
    record?.createdAt ??
    record?.decidedAt ??
    record?.filledAt;
  const latencyMs =
    getNumberFromRecord(asRecord(record?.data), "latency_ms") ??
    getNumberFromRecord(asRecord(record?.metadata), "latency_ms") ??
    getNumberFromRecord(record, "latencyMs");
  const timestampLabel = timestamp ? String(timestamp) : undefined;

  return {
    durationMs: latencyMs,
    id: typeof record?.id === "string" ? record.id : undefined,
    index,
    isSelected: Boolean(selectedEventId && record?.id === selectedEventId),
    label: String(label),
    meta: timestampLabel,
    sortTime: getSortTime(timestamp),
  };
}

function InspectorArtifacts(props: { data: unknown }) {
  const artifacts = getArrayFromUnknown(props.data, "artifacts");

  if (artifacts.length === 0) {
    return (
      <p className="dashboard-inspector-muted">
        No artifacts are linked to this item yet.
      </p>
    );
  }

  return (
    <ul className="dashboard-inspector-artifacts">
      {artifacts.map((artifact, index) => {
        const record = asRecord(artifact);
        const label =
          record?.name ?? record?.type ?? record?.id ?? `Artifact ${index + 1}`;

        return <li key={`${String(label)}-${index}`}>{String(label)}</li>;
      })}
    </ul>
  );
}

function getArrayFromUnknown(value: unknown, key: string): Array<unknown> {
  const record = asRecord(value);
  const direct = record?.[key];

  if (Array.isArray(direct)) {
    return direct;
  }

  for (const child of Object.values(record ?? {})) {
    const childRecord = asRecord(child);
    const nested = childRecord?.[key];

    if (Array.isArray(nested)) {
      return nested;
    }
  }

  return [];
}

function getStringFromUnknown(value: unknown, key: string) {
  const record = asRecord(value);
  const direct = record?.[key];

  return typeof direct === "string" ? direct : undefined;
}

function getNumberFromRecord(
  record: Record<string, unknown> | undefined,
  key: string,
) {
  const value = record?.[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function getSortTime(value: unknown) {
  if (value instanceof Date) {
    return value.valueOf();
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value).valueOf();

    return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
  }

  return Number.MAX_SAFE_INTEGER;
}

function getTimelineOffset(sortTime: number, timelineStart: number) {
  if (!Number.isFinite(sortTime) || sortTime === Number.MAX_SAFE_INTEGER) {
    return 0;
  }

  return Math.max(0, sortTime - timelineStart);
}

function formatOffset(ms: number) {
  return `+${formatDuration(ms)}`;
}

function formatDuration(ms: number | undefined) {
  if (ms === undefined) {
    return "--";
  }

  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }

  const seconds = ms / 1000;

  if (seconds < 60) {
    return `${formatCompactNumber(seconds)}s`;
  }

  const minutes = seconds / 60;

  if (minutes < 60) {
    return `${formatCompactNumber(minutes)}m`;
  }

  return `${formatCompactNumber(minutes / 60)}h`;
}

function formatCompactNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return undefined;
}
