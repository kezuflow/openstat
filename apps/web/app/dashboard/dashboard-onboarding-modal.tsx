"use client";

import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { Button, Modal } from "@heroui/react";
import {
  Activity,
  ArrowRight,
  Code2,
  KeyRound,
  PlayCircle,
  RadioTower,
  SearchCheck,
} from "lucide-react";

import type { DashboardOnboardingState } from "../../lib/openstat-api";

const apiUrl =
  process.env.NEXT_PUBLIC_OPENSTAT_API_URL ?? "http://localhost:4000";

type OnboardingStatus = "completed" | "dismissed";
type OnboardingStep = 1 | 2 | 3;

export function DashboardOnboardingModal(props: {
  onboarding: DashboardOnboardingState;
}) {
  const [isOpen, setIsOpen] = useState(props.onboarding.shouldShow);
  const [isPending, setIsPending] = useState(false);
  const [activeStep, setActiveStep] = useState<OnboardingStep>(1);
  const didSubmitRef = useRef(false);

  if (!props.onboarding.shouldShow) {
    return null;
  }

  async function updateOnboarding(status: OnboardingStatus) {
    if (didSubmitRef.current) {
      return;
    }

    didSubmitRef.current = true;
    setIsPending(true);

    try {
      await fetch(`${apiUrl}/v1/onboarding/dashboard`, {
        body: JSON.stringify({ status }),
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
    } finally {
      setIsPending(false);
      setIsOpen(false);
    }
  }

  function finishAndOpen(path: string) {
    window.open(path, "_blank", "noopener,noreferrer");
    void updateOnboarding("completed");
  }

  const stepContent = getStepContent(activeStep);

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          void updateOnboarding("dismissed");
        }
      }}
      variant="opaque"
    >
      <Modal.Container className="dashboard-onboarding-container" size="lg">
        <Modal.Dialog className="dashboard-onboarding-modal">
          <Modal.CloseTrigger />
          <div className="dashboard-onboarding-shell">
            <aside className="dashboard-onboarding-rail">
              <div>
                <div className="dashboard-onboarding-brand">
                  <RadioTower aria-hidden="true" size={18} />
                  <span>Set Up Guide</span>
                </div>
                <nav
                  aria-label="OpenStat setup progress"
                  className="dashboard-onboarding-nav"
                >
                  <OnboardingNavItem
                    icon={<PlayCircle aria-hidden="true" size={15} />}
                    isActive={activeStep === 1}
                    label="Get started"
                    onPress={() => setActiveStep(1)}
                    step="1"
                  />
                  <OnboardingNavItem
                    icon={<KeyRound aria-hidden="true" size={15} />}
                    isActive={activeStep === 2}
                    label="Connect agent"
                    onPress={() => setActiveStep(2)}
                    step="2"
                  />
                  <OnboardingNavItem
                    icon={<SearchCheck aria-hidden="true" size={15} />}
                    isActive={activeStep === 3}
                    label="Verify telemetry"
                    onPress={() => setActiveStep(3)}
                    step="3"
                  />
                </nav>
              </div>

            </aside>

            <section className="dashboard-onboarding-main">
              <header className="dashboard-onboarding-main-header">
                <span>Step {activeStep}</span>
                <Modal.Heading>{stepContent.heading}</Modal.Heading>
                <p>{stepContent.description}</p>
              </header>

              <div className="dashboard-onboarding-choice-grid">
                {stepContent.choices.map((choice) => (
                  <OnboardingChoice
                    badge={choice.badge}
                    buttonLabel={choice.buttonLabel}
                    description={choice.description}
                    icon={choice.icon}
                    isPending={isPending}
                    key={choice.title}
                    onPress={() => finishAndOpen(choice.path)}
                    title={choice.title}
                  />
                ))}
              </div>

              <div className="dashboard-onboarding-secondary">
                <div>
                  <button
                    disabled={isPending}
                    onClick={() => {
                      void updateOnboarding("dismissed");
                    }}
                    type="button"
                  >
                    Skip for now
                  </button>
                </div>
              </div>
            </section>
          </div>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function OnboardingNavItem(props: {
  icon: ReactNode;
  isActive?: boolean;
  label: string;
  onPress: () => void;
  step: string;
}) {
  return (
    <button
      aria-current={props.isActive ? "step" : undefined}
      className={[
        "dashboard-onboarding-nav-item",
        props.isActive ? "dashboard-onboarding-nav-item-active" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={props.onPress}
      type="button"
    >
      <span className="dashboard-onboarding-nav-step">{props.step}</span>
      <span className="dashboard-onboarding-nav-icon">{props.icon}</span>
      <span>{props.label}</span>
    </button>
  );
}

function getStepContent(step: OnboardingStep) {
  if (step === 2) {
    return {
      heading: "Connect your agent",
      description:
        "Create an ingestion key, then add OpenStat to your agent runtime.",
      choices: [
        {
          badge: "Start here",
          buttonLabel: "Create key",
          description:
            "Generate a project API key for authenticated telemetry ingestion.",
          icon: <KeyRound aria-hidden="true" size={24} />,
          path: "/dashboard/api-keys",
          title: "Create an API key",
        },
        {
          buttonLabel: "Open quickstart",
          description:
            "Install the JavaScript or Python SDK and send your first heartbeat.",
          icon: <Code2 aria-hidden="true" size={24} />,
          path: "/quickstart",
          title: "Wire your agent",
        },
      ],
    };
  }

  if (step === 3) {
    return {
      heading: "Verify your telemetry",
      description:
        "Confirm that OpenStat is receiving events and tracking your agent.",
      choices: [
        {
          badge: "Live data",
          buttonLabel: "Browse events",
          description:
            "Inspect the event stream and confirm your latest heartbeat arrived.",
          icon: <Activity aria-hidden="true" size={24} />,
          path: "/dashboard/events",
          title: "Check incoming events",
        },
        {
          buttonLabel: "View agents",
          description:
            "Check agent status, heartbeat health, and recent activity.",
          icon: <SearchCheck aria-hidden="true" size={24} />,
          path: "/dashboard/agents",
          title: "Confirm agent health",
        },
      ],
    };
  }

  return {
    heading: "How do you want to connect your first agent?",
    description:
      "Start with an SDK walkthrough, or create a key and wire the agent yourself.",
    choices: [
      {
        badge: "Fastest",
        buttonLabel: "Use quickstart",
        description:
          "Install the JavaScript or Python SDK, set OPENSTAT_API_KEY, and send your first heartbeat.",
        icon: <Code2 aria-hidden="true" size={24} />,
        path: "/quickstart",
        title: "Quickstart SDK",
      },
      {
        buttonLabel: "Create key",
        description:
          "Generate an ingestion key now, then connect it to any runtime, worker, or trading agent.",
        icon: <KeyRound aria-hidden="true" size={24} />,
        path: "/dashboard/api-keys",
        title: "Manual API key",
      },
    ],
  };
}

function OnboardingChoice(props: {
  badge?: string;
  buttonLabel: string;
  description: string;
  icon: ReactNode;
  isPending: boolean;
  onPress: () => void;
  title: string;
}) {
  return (
    <article className="dashboard-onboarding-choice">
      <div className="dashboard-onboarding-choice-art">
        {props.badge ? (
          <span className="dashboard-onboarding-choice-badge">
            {props.badge}
          </span>
        ) : null}
        <span className="dashboard-onboarding-choice-icon">{props.icon}</span>
      </div>
      <h3>{props.title}</h3>
      <p>{props.description}</p>
      <Button
        className="dashboard-onboarding-choice-button"
        isPending={props.isPending}
        onPress={props.onPress}
        type="button"
        variant="primary"
      >
        {props.buttonLabel}
        <ArrowRight aria-hidden="true" size={15} />
      </Button>
    </article>
  );
}
