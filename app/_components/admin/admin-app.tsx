"use client";

import { useState, useTransition } from "react";
import { useNotice } from "../../_hooks/use-notice";
import type { AdminUser } from "../../_lib/admin-types";
import type { AdminCourse } from "../../_lib/dto";
import type { SessionUser } from "../../_lib/types";
import { logout } from "../../_server/auth/actions";
import { AppShell, type NavItem } from "../app-shell";
import { BookIcon, UsersIcon } from "../icons";
import { AdminPanel } from "./admin-panel";
import { CoursesPanel } from "./courses-panel";

type AdminView = "users" | "courses";

const ADMIN_NAV: NavItem<AdminView>[] = [
  {
    id: "users",
    label: "Хэрэглэгчид",
    shortLabel: "Хэрэглэгчид",
    icon: <UsersIcon />,
  },
  {
    id: "courses",
    label: "Хичээлүүд",
    shortLabel: "Хичээлүүд",
    icon: <BookIcon />,
  },
];

export function AdminApp({
  user,
  users,
  courses,
}: {
  user: SessionUser;
  users: AdminUser[];
  courses: AdminCourse[];
}) {
  const { notice, notify, dismissNotice } = useNotice();
  const [view, setView] = useState<AdminView>("users");
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
      {view === "courses" ? (
        <CoursesPanel courses={courses} users={users} notify={notify} />
      ) : (
        <AdminPanel users={users} currentUserId={user.id} notify={notify} />
      )}
    </AppShell>
  );
}
