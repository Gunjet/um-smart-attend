"use client";

import { useState, useTransition } from "react";
import { useNotice } from "../../_hooks/use-notice";
import type { AdminUser } from "../../_lib/admin-types";
import type { AdminCourse } from "../../_lib/dto";
import type { CampusSite } from "../../_lib/geo";
import type { StatRow } from "../../_lib/stats";
import type { SessionUser } from "../../_lib/types";
import { logout } from "../../_server/auth/actions";
import { AppShell, type NavItem } from "../app-shell";
import { BookIcon, ChartIcon, MapPinIcon, UsersIcon } from "../icons";
import { AdminPanel } from "./admin-panel";
import { CampusPanel } from "./campus-panel";
import { OverviewPanel } from "./overview-panel";
import { CoursesPanel } from "./courses-panel";

type AdminView = "overview" | "users" | "courses" | "campus";

const ADMIN_NAV: NavItem<AdminView>[] = [
  {
    id: "overview",
    label: "Тойм",
    shortLabel: "Тойм",
    icon: <ChartIcon />,
  },
  {
    id: "users",
    label: "Хэрэглэгчид",
    shortLabel: "Хэрэглэгч",
    icon: <UsersIcon />,
  },
  {
    id: "courses",
    label: "Хичээлүүд",
    shortLabel: "Хичээл",
    icon: <BookIcon />,
  },
  {
    id: "campus",
    label: "Байршил",
    shortLabel: "Байршил",
    icon: <MapPinIcon />,
  },
];

export function AdminApp({
  user,
  users,
  courses,
  sites,
  stats,
  today,
}: {
  user: SessionUser;
  users: AdminUser[];
  courses: AdminCourse[];
  sites: CampusSite[];
  stats: StatRow[];
  /** Улаанбаатарын цагаар өнөөдөр, "YYYY-MM-DD". */
  today: string;
}) {
  const { notice, notify, dismissNotice } = useNotice();
  const [view, setView] = useState<AdminView>("overview");
  const [, startTransition] = useTransition();

  return (
    <AppShell
      account={{
        name: user.name,
        roleLabel: "Админы эрх",
        initials: user.initials,
      }}
      navItems={ADMIN_NAV}
      activeView={view}
      onNavigate={setView}
      onSignOut={() => startTransition(() => logout())}
      notice={notice}
      onDismissNotice={dismissNotice}
    >
      {view === "overview" ? (
        <OverviewPanel stats={stats} today={today} />
      ) : view === "courses" ? (
        <CoursesPanel courses={courses} users={users} notify={notify} />
      ) : view === "campus" ? (
        <CampusPanel sites={sites} notify={notify} />
      ) : (
        <AdminPanel users={users} currentUserId={user.id} notify={notify} />
      )}
    </AppShell>
  );
}
