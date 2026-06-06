"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  Bot,
  CircleHelp,
  Home,
  KeyRound,
  ListTree,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Avatar, Button, Chip, Drawer, Separator } from "@heroui/react";
import { useEffect, useState } from "react";

import type { DashboardUser } from "../../lib/openstat-api";

const apiUrl =
  process.env.NEXT_PUBLIC_OPENSTAT_API_URL ?? "http://localhost:4000";
const cachedDashboardUserKey = "openstat.dashboard-user";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  isActive?: boolean;
  meta?: string;
};

const primaryNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home, isActive: true },
  { label: "Agents", href: "/dashboard/agents", icon: Bot },
  { label: "Events", href: "/dashboard/events", icon: ListTree },
  { label: "Runs", href: "/dashboard/runs", icon: Activity },
  { label: "Trades", href: "/dashboard/trades", icon: TrendingUp },
  { label: "Onchain", href: "/dashboard/onchain", icon: ShieldCheck },
  { label: "Alerts", href: "/dashboard/alerts", icon: Bell, meta: "New" },
  { label: "API Keys", href: "/dashboard/api-keys", icon: KeyRound },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

const secondaryNav: NavItem[] = [
  { label: "Help & Information", href: "/dashboard#help", icon: CircleHelp },
  { label: "Log out", href: "/api/auth/sign-out", icon: LogOut },
];

export function DashboardSidebar(props: { initialUser?: DashboardUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    function handleToggle() {
      setIsCollapsed((collapsed) => !collapsed);
    }

    window.addEventListener("dashboard-sidebar-toggle", handleToggle);

    return () => {
      window.removeEventListener("dashboard-sidebar-toggle", handleToggle);
    };
  }, []);

  return (
    <>
      <aside
        className={[
          "dashboard-sidebar",
          isCollapsed ? "dashboard-sidebar-collapsed" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="Dashboard navigation"
      >
        <SidebarContent
          initialUser={props.initialUser}
          isCollapsed={isCollapsed}
        />
      </aside>

      <div className="dashboard-mobile-menu">
        <Button
          aria-label="Open dashboard navigation"
          isIconOnly
          variant="secondary"
          onPress={() => setIsOpen(true)}
        >
          <Menu aria-hidden="true" size={20} />
        </Button>
      </div>

      <Drawer.Backdrop
        className="dashboard-drawer-backdrop"
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        variant="opaque"
      >
        <Drawer.Content placement="left">
          <Drawer.Dialog
            aria-label="Dashboard navigation"
            className="dashboard-drawer-panel"
          >
            <Drawer.CloseTrigger />
            <Drawer.Body className="dashboard-drawer-body">
              <SidebarContent
                initialUser={props.initialUser}
                onNavigate={() => setIsOpen(false)}
              />
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </>
  );
}

export function DashboardSidebarToggle() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  function toggleSidebar() {
    setIsCollapsed((collapsed) => !collapsed);
    window.dispatchEvent(new Event("dashboard-sidebar-toggle"));
  }

  return (
    <Button
      aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="dashboard-sidebar-hider"
      isIconOnly
      variant="tertiary"
      onPress={toggleSidebar}
    >
      {isCollapsed ? (
        <PanelLeftOpen aria-hidden="true" size={17} />
      ) : (
        <PanelLeftClose aria-hidden="true" size={17} />
      )}
    </Button>
  );
}

function SidebarContent(props: {
  initialUser?: DashboardUser;
  isCollapsed?: boolean;
  onNavigate?: () => void;
}) {
  const [user, setUser] = useState<DashboardUser | undefined>(
    props.initialUser,
  );

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      const cachedUser = getCachedDashboardUser();

      if (cachedUser && isMounted) {
        setUser(cachedUser);
      }

      try {
        const response = await fetch(`${apiUrl}/v1/me`, {
          credentials: "include",
        });

        if (!response.ok) {
          clearCachedDashboardUser();
          return;
        }

        const session = (await response.json()) as {
          user?: DashboardUser;
        };

        if (isMounted) {
          setUser(session.user);
        }

        cacheDashboardUser(session.user);
      } catch {
        // The dashboard data fetches still surface auth problems.
      }
    }

    void loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="dashboard-sidebar-inner">
      <div>
        <DashboardProfile user={user} />

        <Separator className="dashboard-sidebar-separator" variant="tertiary" />

        <nav className="dashboard-nav" aria-label="Primary navigation">
          {primaryNav.map((item) => (
            <SidebarNavButton
              key={item.label}
              isCollapsed={props.isCollapsed}
              item={item}
              onNavigate={props.onNavigate}
            />
          ))}
        </nav>
      </div>

      <nav className="dashboard-nav" aria-label="Support navigation">
        {secondaryNav.map((item) => (
          <SidebarNavButton
            key={item.label}
            isCollapsed={props.isCollapsed}
            item={item}
            onNavigate={props.onNavigate}
          />
        ))}
      </nav>
    </div>
  );
}

function DashboardProfile(props: { user?: DashboardUser }) {
  const displayEmail = props.user?.email?.trim();
  const displayName = props.user?.name?.trim() || displayEmail;

  if (!displayName) {
    return (
      <div
        aria-busy="true"
        aria-label="Loading profile"
        className="dashboard-profile dashboard-profile-loading"
      >
        <span className="dashboard-profile-loading-avatar" />
        <span className="dashboard-profile-loading-copy">
          <span />
          <span />
        </span>
      </div>
    );
  }

  return (
    <div className="dashboard-profile">
      <Avatar className="dashboard-profile-avatar" size="md">
        <Avatar.Fallback>{getInitials(displayName)}</Avatar.Fallback>
      </Avatar>
      <div className="dashboard-profile-copy">
        <strong>{displayName}</strong>
        {displayEmail && displayEmail !== displayName ? (
          <span>{displayEmail}</span>
        ) : null}
      </div>
    </div>
  );
}

function getInitials(name: string) {
  const parts = name
    .split(/[\s@._-]+/u)
    .filter(Boolean)
    .slice(0, 2);

  return parts
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function SidebarNavButton(props: {
  isCollapsed?: boolean;
  item: NavItem;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const Icon = props.item.icon;
  const isActive =
    props.item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(props.item.href);

  async function navigate() {
    props.onNavigate?.();

    if (props.item.href === "/api/auth/sign-out") {
      setIsPending(true);

      try {
        await fetch(`${apiUrl}${props.item.href}`, {
          method: "POST",
          credentials: "include",
        });
      } finally {
        clearCachedDashboardUser();
        window.location.href = "/";
      }

      return;
    }

    if (props.item.href.startsWith("/api/")) {
      window.location.href = props.item.href;
      return;
    }

    router.push(props.item.href, { scroll: false });
  }

  return (
    <Button
      aria-label={props.isCollapsed ? props.item.label : undefined}
      aria-current={isActive ? "page" : undefined}
      className={[
        "dashboard-nav-item",
        isActive ? "dashboard-nav-item-active" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      fullWidth={!props.isCollapsed}
      isIconOnly={props.isCollapsed}
      isPending={isPending}
      variant={isActive ? "secondary" : "tertiary"}
      onPress={() => {
        void navigate();
      }}
    >
      <span className="dashboard-nav-icon-slot" aria-hidden="true">
        <Icon className="dashboard-nav-icon" size={16} />
      </span>
      <span className="dashboard-nav-label">{props.item.label}</span>
      {props.item.meta && !props.isCollapsed ? (
        <Chip color="success" size="sm" variant="soft">
          <Chip.Label>{props.item.meta}</Chip.Label>
        </Chip>
      ) : null}
    </Button>
  );
}

function cacheDashboardUser(user: DashboardUser | undefined) {
  if (!user) {
    clearCachedDashboardUser();
    return;
  }

  window.sessionStorage.setItem(cachedDashboardUserKey, JSON.stringify(user));
}

function clearCachedDashboardUser() {
  window.sessionStorage.removeItem(cachedDashboardUserKey);
}

function getCachedDashboardUser(): DashboardUser | undefined {
  const cachedUser = window.sessionStorage.getItem(cachedDashboardUserKey);

  if (!cachedUser) {
    return undefined;
  }

  try {
    return JSON.parse(cachedUser) as DashboardUser;
  } catch {
    clearCachedDashboardUser();
    return undefined;
  }
}
