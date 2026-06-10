"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Chip,
  Description,
  Form,
  Label,
  ListBox,
  NumberField,
  Select,
  Switch,
} from "@heroui/react";
import { RotateCcw, Save, SlidersHorizontal } from "lucide-react";

import type {
  DashboardDeepBookAgentConfig,
  DashboardDeepBookStrategyName,
} from "../../../lib/openstat-api";

import styles from "./deepbook-dashboard.module.css";

const apiUrl =
  process.env.NEXT_PUBLIC_OPENSTAT_API_URL ?? "http://localhost:4000";

const strategyLabels: Record<DashboardDeepBookStrategyName, string> = {
  "range-mean-reversion": "Range mean reversion",
  "breakout-follow": "Breakout follow",
  "liquidity-neutral": "Liquidity neutral",
};

const strategyDescriptions: Record<DashboardDeepBookStrategyName, string> = {
  "range-mean-reversion":
    "Scores bounded books, spread stability, and return to fair value.",
  "breakout-follow":
    "Scores momentum continuation when liquidity and oracle drift agree.",
  "liquidity-neutral":
    "Fallback profile for poor depth, wide spreads, or uncertain settlement.",
};

type DeepBookConfigManagerProps = {
  initialConfig: DashboardDeepBookAgentConfig;
  initialUpdatedAt: string | null;
};

export function DeepBookConfigManager(props: DeepBookConfigManagerProps) {
  const [config, setConfig] = useState(props.initialConfig);
  const [savedConfig, setSavedConfig] = useState(props.initialConfig);
  const [updatedAt, setUpdatedAt] = useState(props.initialUpdatedAt);
  const [error, setError] = useState<string | undefined>();
  const [isPending, setIsPending] = useState(false);

  const enabledWeight = useMemo(
    () =>
      config.strategyCandidates
        .filter((strategy) => strategy.enabled)
        .reduce((total, strategy) => total + strategy.maxWeight, 0),
    [config.strategyCandidates],
  );
  const enabledCount = config.strategyCandidates.filter(
    (strategy) => strategy.enabled,
  ).length;
  const hasInvalidAllocation = enabledCount === 0 || enabledWeight > 100;

  async function saveConfig() {
    if (hasInvalidAllocation) {
      setError(
        "Enable at least one strategy and keep enabled weight at 100% or less.",
      );
      return;
    }

    setError(undefined);
    setIsPending(true);

    try {
      const response = await requestJson<{
        config: DashboardDeepBookAgentConfig;
        updatedAt: string | null;
      }>("/v1/deepbook/config", {
        body: JSON.stringify(config),
        method: "PUT",
      });

      setConfig(response.config);
      setSavedConfig(response.config);
      setUpdatedAt(response.updatedAt);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsPending(false);
    }
  }

  function updateStrategy(
    name: DashboardDeepBookStrategyName,
    patch: Partial<DashboardDeepBookAgentConfig["strategyCandidates"][number]>,
  ) {
    setConfig((current) => ({
      ...current,
      strategyCandidates: current.strategyCandidates.map((strategy) =>
        strategy.name === name ? { ...strategy, ...patch } : strategy,
      ),
    }));
  }

  return (
    <div className={styles.configManager}>
      <div className={styles.configHeader}>
        <div>
          <div className="dashboard-panel-title-row">
            <h2>Agent control desk</h2>
            <Chip
              color={hasInvalidAllocation ? "danger" : "success"}
              size="sm"
              variant="soft"
            >
              <Chip.Label>{enabledWeight}% allocated</Chip.Label>
            </Chip>
          </div>
          <p>
            Configure the strategy set and risk boundaries the DeepBook agent
            should evaluate before it emits decisions.
          </p>
        </div>
        <SlidersHorizontal aria-hidden="true" size={18} />
      </div>

      {error ? <p className={styles.configError}>{error}</p> : null}

      <Form
        className={styles.configForm}
        onSubmit={(event) => {
          event.preventDefault();
          void saveConfig();
        }}
      >
        <div className={styles.configFields}>
          <Select
            selectedKey={config.market}
            variant="secondary"
            onSelectionChange={(key) => {
              if (typeof key === "string") {
                setConfig((current) => ({
                  ...current,
                  market: key as DashboardDeepBookAgentConfig["market"],
                }));
              }
            }}
          >
            <Label>Market</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {(["SUI/USDC", "DEEP/USDC", "DEEP/SUI"] as const).map(
                  (market) => (
                    <ListBox.Item id={market} key={market} textValue={market}>
                      {market}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ),
                )}
              </ListBox>
            </Select.Popover>
          </Select>

          <Select
            selectedKey={config.executionMode}
            variant="secondary"
            onSelectionChange={(key) => {
              if (key === "paper" || key === "replay") {
                setConfig((current) => ({
                  ...current,
                  executionMode: key,
                }));
              }
            }}
          >
            <Label>Execution</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="paper" textValue="Paper">
                  Paper
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="replay" textValue="Replay">
                  Replay
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>

          <NumberField
            formatOptions={{
              currency: "USD",
              maximumFractionDigits: 0,
              style: "currency",
            }}
            maxValue={100000}
            minValue={100}
            step={100}
            value={config.maxExposureUsd}
            variant="secondary"
            onChange={(value) => {
              setConfig((current) => ({
                ...current,
                maxExposureUsd: value ?? current.maxExposureUsd,
              }));
            }}
          >
            <Label>Max exposure</Label>
            <NumberField.Group>
              <NumberField.DecrementButton />
              <NumberField.Input className={styles.numberInput} />
              <NumberField.IncrementButton />
            </NumberField.Group>
          </NumberField>

          <NumberField
            maxValue={1000}
            minValue={1}
            step={5}
            value={config.maxSlippageBps}
            variant="secondary"
            onChange={(value) => {
              setConfig((current) => ({
                ...current,
                maxSlippageBps: value ?? current.maxSlippageBps,
              }));
            }}
          >
            <Label>Max slippage bps</Label>
            <NumberField.Group>
              <NumberField.DecrementButton />
              <NumberField.Input className={styles.numberInput} />
              <NumberField.IncrementButton />
            </NumberField.Group>
          </NumberField>
        </div>

        <div className={styles.strategyGrid}>
          {config.strategyCandidates.map((strategy) => (
            <div className={styles.strategyRow} key={strategy.name}>
              <Switch
                isSelected={strategy.enabled}
                onChange={(enabled) =>
                  updateStrategy(strategy.name, { enabled })
                }
              >
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                <Switch.Content>
                  <Label>{strategyLabels[strategy.name]}</Label>
                  <Description>
                    {strategyDescriptions[strategy.name]}
                  </Description>
                </Switch.Content>
              </Switch>

              <NumberField
                isDisabled={!strategy.enabled}
                maxValue={100}
                minValue={0}
                step={5}
                value={strategy.maxWeight}
                variant="secondary"
                onChange={(value) =>
                  updateStrategy(strategy.name, {
                    maxWeight: value ?? strategy.maxWeight,
                  })
                }
              >
                <Label>Max weight</Label>
                <NumberField.Group>
                  <NumberField.DecrementButton />
                  <NumberField.Input className={styles.numberInput} />
                  <NumberField.IncrementButton />
                </NumberField.Group>
              </NumberField>
            </div>
          ))}
        </div>

        <div className={styles.configActions}>
          <span>
            {updatedAt
              ? `Saved ${new Date(updatedAt).toLocaleString()}`
              : "Using default agent settings"}
          </span>
          <div>
            <Button
              isDisabled={isPending}
              type="button"
              variant="tertiary"
              onPress={() => {
                setConfig(savedConfig);
                setError(undefined);
              }}
            >
              <RotateCcw aria-hidden="true" size={16} />
              Reset
            </Button>
            <Button
              isDisabled={hasInvalidAllocation}
              isPending={isPending}
              type="submit"
              variant="primary"
            >
              <Save aria-hidden="true" size={16} />
              Save config
            </Button>
          </div>
        </div>
      </Form>
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "DeepBook agent config request failed.";
}
