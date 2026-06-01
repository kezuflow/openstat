"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertDialog,
  Button,
  Chip,
  FieldError,
  Form,
  Input,
  Label,
  Modal,
  TextField,
} from "@heroui/react";
import {
  Check,
  Copy,
  KeyRound,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";

import type { DashboardApiKey } from "../../../lib/openstat-api";

const apiUrl =
  process.env.NEXT_PUBLIC_OPENSTAT_API_URL ?? "http://localhost:4000";

type ApiKeySecret = {
  key: string;
  prefix: string;
  title: string;
};

type PendingAction =
  | {
      apiKey: DashboardApiKey;
      kind: "revoke" | "rotate";
    }
  | undefined;

export function ApiKeysManager(props: {
  initialApiKeys: Array<DashboardApiKey>;
}) {
  const [apiKeys, setApiKeys] = useState(props.initialApiKeys);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>();
  const [secret, setSecret] = useState<ApiKeySecret | undefined>();

  const activeCount = useMemo(
    () => apiKeys.filter((apiKey) => !apiKey.revokedAt).length,
    [apiKeys],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadApiKeys() {
      try {
        const response = await requestJson<{
          apiKeys: Array<DashboardApiKey>;
        }>("/v1/api-keys", {
          method: "GET",
        });

        if (isMounted) {
          setApiKeys(response.apiKeys);
        }
      } catch (requestError) {
        if (isMounted && props.initialApiKeys.length === 0) {
          setError(getErrorMessage(requestError));
        }
      }
    }

    void loadApiKeys();

    return () => {
      isMounted = false;
    };
  }, [props.initialApiKeys.length]);

  async function createApiKey(formData: FormData) {
    setError(undefined);
    setIsPending(true);

    try {
      const name = String(formData.get("name") ?? "").trim();
      const response = await requestJson<{
        apiKey: DashboardApiKey;
        key: string;
      }>("/v1/api-keys", {
        body: JSON.stringify({ name: name || "Ingestion key" }),
        method: "POST",
      });

      setApiKeys((current) => [response.apiKey, ...current]);
      setSecret({
        key: response.key,
        prefix: response.apiKey.prefix,
        title: `${response.apiKey.name} created`,
      });
      setCopiedSecret(false);
      setIsCreateOpen(false);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsPending(false);
    }
  }

  async function confirmPendingAction() {
    if (!pendingAction) {
      return;
    }

    setError(undefined);
    setIsPending(true);

    try {
      if (pendingAction.kind === "revoke") {
        const response = await requestJson<{
          apiKey: Pick<DashboardApiKey, "id" | "revokedAt">;
        }>(`/v1/api-keys/${pendingAction.apiKey.id}`, {
          method: "DELETE",
        });

        setApiKeys((current) =>
          current.map((apiKey) =>
            apiKey.id === response.apiKey.id
              ? { ...apiKey, revokedAt: response.apiKey.revokedAt }
              : apiKey,
          ),
        );
      } else {
        const response = await requestJson<{
          apiKey: DashboardApiKey;
          key: string;
          rotatedApiKey: Pick<DashboardApiKey, "id" | "revokedAt">;
        }>(`/v1/api-keys/${pendingAction.apiKey.id}/rotate`, {
          method: "POST",
        });

        setApiKeys((current) => [
          response.apiKey,
          ...current.map((apiKey) =>
            apiKey.id === response.rotatedApiKey.id
              ? { ...apiKey, revokedAt: response.rotatedApiKey.revokedAt }
              : apiKey,
          ),
        ]);
        setSecret({
          key: response.key,
          prefix: response.apiKey.prefix,
          title: `${response.apiKey.name} rotated`,
        });
        setCopiedSecret(false);
      }

      setPendingAction(undefined);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsPending(false);
    }
  }

  async function copySecret() {
    if (!secret) {
      return;
    }

    await navigator.clipboard.writeText(secret.key);
    setCopiedSecret(true);
  }

  return (
    <>
      <section className="dashboard-panel api-keys-panel">
        <div className="dashboard-panel-header api-keys-panel-header">
          <div>
            <div className="dashboard-panel-title-row">
              <h2>Project keys</h2>
              <Chip size="sm" variant="soft">
                <Chip.Label>{activeCount} active</Chip.Label>
              </Chip>
            </div>
            <p className="api-keys-panel-copy">
              Ingestion keys identify the project that receives SDK and HTTP
              telemetry.
            </p>
          </div>

          <Button onPress={() => setIsCreateOpen(true)} variant="primary">
            <Plus aria-hidden="true" size={16} />
            Create key
          </Button>
        </div>

        {error ? <p className="api-keys-error">{error}</p> : null}

        {apiKeys.length === 0 ? (
          <div className="dashboard-empty">
            <Check aria-hidden="true" size={18} />
            <p>No project API keys yet. Create one to start sending telemetry.</p>
          </div>
        ) : (
          <div className="dashboard-table-wrap api-keys-table-wrap">
            <table className="dashboard-table api-keys-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Prefix</th>
                  <th>Status</th>
                  <th>Last used</th>
                  <th>Created</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((apiKey) => {
                  const isRevoked = Boolean(apiKey.revokedAt);

                  return (
                    <tr key={apiKey.id}>
                      <td>
                        <span className="dashboard-table-primary">
                          {apiKey.name}
                        </span>
                      </td>
                      <td>
                        <code className="api-keys-prefix">
                          {apiKey.prefix}
                        </code>
                      </td>
                      <td>
                        <ApiKeyStatusChip isRevoked={isRevoked} />
                      </td>
                      <td>{formatDateTime(apiKey.lastUsedAt)}</td>
                      <td>{formatDateTime(apiKey.createdAt)}</td>
                      <td>
                        <div className="api-keys-row-actions">
                          <Button
                            aria-label={`Rotate ${apiKey.name}`}
                            isDisabled={isRevoked || isPending}
                            isIconOnly
                            onPress={() =>
                              setPendingAction({ apiKey, kind: "rotate" })
                            }
                            variant="tertiary"
                          >
                            <RefreshCw aria-hidden="true" size={15} />
                          </Button>
                          <Button
                            aria-label={`Revoke ${apiKey.name}`}
                            isDisabled={isRevoked || isPending}
                            isIconOnly
                            onPress={() =>
                              setPendingAction({ apiKey, kind: "revoke" })
                            }
                            variant="danger"
                          >
                            <Trash2 aria-hidden="true" size={15} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal.Backdrop
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        variant="opaque"
      >
        <Modal.Container>
          <Modal.Dialog className="api-keys-modal">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon>
                <KeyRound aria-hidden="true" size={20} />
              </Modal.Icon>
              <Modal.Heading>Create API key</Modal.Heading>
            </Modal.Header>
            <Form
              onSubmit={(event) => {
                event.preventDefault();
                void createApiKey(new FormData(event.currentTarget));
              }}
            >
              <Modal.Body>
                <TextField isRequired name="name" type="text">
                  <Label>Name</Label>
                  <Input
                    autoComplete="off"
                    fullWidth
                    placeholder="Production ingestion"
                    variant="secondary"
                  />
                  <FieldError />
                </TextField>
              </Modal.Body>
              <Modal.Footer>
                <Button slot="close" type="button" variant="tertiary">
                  Cancel
                </Button>
                <Button isPending={isPending} type="submit" variant="primary">
                  <Plus aria-hidden="true" size={16} />
                  Create key
                </Button>
              </Modal.Footer>
            </Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      <Modal.Backdrop
        isOpen={Boolean(secret)}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSecret(undefined);
          }
        }}
        variant="opaque"
      >
        <Modal.Container>
          <Modal.Dialog className="api-keys-modal">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon>
                <KeyRound aria-hidden="true" size={20} />
              </Modal.Icon>
              <Modal.Heading>{secret?.title ?? "API key"}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="api-keys-panel-copy">
                Copy this key now. For security, OpenStat will not show the
                plaintext secret again.
              </p>
              <div className="api-keys-secret-box">
                <div className="api-keys-secret-row">
                  <code>{secret?.key}</code>
                  <Button
                    aria-label={copiedSecret ? "API key copied" : "Copy API key"}
                    isIconOnly
                    onPress={() => {
                      void copySecret();
                    }}
                    type="button"
                    variant="tertiary"
                  >
                    {copiedSecret ? (
                      <Check aria-hidden="true" size={15} />
                    ) : (
                      <Copy aria-hidden="true" size={15} />
                    )}
                  </Button>
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button
                onPress={() => {
                  void copySecret();
                }}
                type="button"
                variant="secondary"
              >
                {copiedSecret ? (
                  <Check aria-hidden="true" size={16} />
                ) : (
                  <Copy aria-hidden="true" size={16} />
                )}
                {copiedSecret ? "Copied" : "Copy key"}
              </Button>
              <Button
                onPress={() => setSecret(undefined)}
                type="button"
                variant="primary"
              >
                Done
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      <AlertDialog.Backdrop
        isOpen={Boolean(pendingAction)}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setPendingAction(undefined);
          }
        }}
        variant="opaque"
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="api-keys-modal">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon
                status={pendingAction?.kind === "rotate" ? "warning" : "danger"}
              />
              <AlertDialog.Heading>
                {pendingAction?.kind === "rotate"
                  ? "Rotate API key"
                  : "Revoke API key"}
              </AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p className="api-keys-panel-copy">
                {pendingAction?.kind === "rotate"
                  ? "The current key will stop accepting telemetry and a replacement secret will be shown once."
                  : "This key will stop accepting telemetry immediately. Existing data remains available."}
              </p>
              {pendingAction ? (
                <code className="api-keys-confirm-prefix">
                  {pendingAction.apiKey.prefix}
                </code>
              ) : null}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" type="button" variant="tertiary">
                Cancel
              </Button>
              <Button
                isPending={isPending}
                onPress={() => {
                  void confirmPendingAction();
                }}
                type="button"
                variant={pendingAction?.kind === "rotate" ? "primary" : "danger"}
              >
                {pendingAction?.kind === "rotate" ? (
                  <RefreshCw aria-hidden="true" size={16} />
                ) : (
                  <Trash2 aria-hidden="true" size={16} />
                )}
                {pendingAction?.kind === "rotate" ? "Rotate" : "Revoke"}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}

function ApiKeyStatusChip(props: { isRevoked: boolean }) {
  return (
    <Chip
      color={props.isRevoked ? "danger" : "success"}
      size="sm"
      variant="soft"
    >
      <Chip.Label>{props.isRevoked ? "revoked" : "active"}</Chip.Label>
    </Chip>
  );
}

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  await ensureClientWorkspaceInitialized();
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
    throw new Error(data?.error?.message ?? `${path} returned ${response.status}`);
  }

  return data as T;
}

async function ensureClientWorkspaceInitialized() {
  await fetch(`${apiUrl}/v1/workspace/init`, {
    credentials: "include",
    method: "POST",
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "API key request failed.";
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Never";
  }

  return new Date(value).toLocaleString();
}
