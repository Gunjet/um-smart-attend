"use client";

import { useTransition } from "react";
import { useNotice } from "../../_hooks/use-notice";
import type { AdminUser } from "../../_lib/admin-types";
import type { SessionUser } from "../../_lib/types";
import { logout } from "../../_server/auth/actions";
import { AppShell, type NavItem } from "../app-shell";
import { UsersIcon } from "../icons";
import { AdminPanel } from "./admin-panel";

type AdminView = "users";

const ADMIN_NAV: NavItem<AdminView>[] = [
  {
    id: "users",
    label: "Хэрэглэгчид",
    shortLabel: "Хэрэглэгчид",
    icon: <UsersIcon />,
  },
];

export function AdminApp({
  user,
  users,
}: {
  user: SessionUser;
  users: AdminUser[];
}) {
  const { notice, notify, dismissNotice } = useNotice();
  const [, startTransition] = useTransition();

  return (
    <AppShell
      account={{
        name: user.name,
        roleLabel: "Админы эрх",
        initials: user.initials,
      }}
      navItems={ADMIN_NAV}
      activeView="users"
      onNavigate={() => undefined}
      onSignOut={() => startTransition(() => logout())}
      notice={notice}
      onDismissNotice={dismissNotice}
    >
      <AdminPanel users={users} currentUserId={user.id} notify={notify} />
    </AppShell>
  );
}
