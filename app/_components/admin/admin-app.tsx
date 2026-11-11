"use client";

import { useState, useTransition } from "react";
import { useNotice } from "../../_hooks/use-notice";
import type { AdminUser } from "../../_lib/admin-types";
import type { AdminCourse } from "../../_lib/dto";
import type { CampusSite } from "../../_lib/geo";
import type { SessionUser } from "../../_lib/types";
import { logout } from "../../_server/auth/actions";
import { AppShell, type NavItem } from "../app-shell";
import { BookIcon, MapPinIcon, MegaphoneIcon, UsersIcon } from "../icons";
import { PostsPage } from "../posts/posts-page";
import { type PostItem, postSourcesFor } from "../../_lib/posts";
import { AdminPanel } from "./admin-panel";
import { CampusPanel } from "./campus-panel";
import { CoursesPanel } from "./courses-panel";

type AdminView = "users" | "courses" | "campus" | "posts";

const ADMIN_NAV: NavItem<AdminView>[] = [
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
    id: "posts",
    label: "Зарлал",
    shortLabel: "Зарлал",
    icon: <MegaphoneIcon />,
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
  posts,
}: {
  user: SessionUser;
  users: AdminUser[];
  courses: AdminCourse[];
  sites: CampusSite[];
  posts: PostItem[];
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
      ) : view === "posts" ? (
        <PostsPage
          posts={posts}
          sources={postSourcesFor(user)}
          notify={notify}
        />
      ) : view === "campus" ? (
        <CampusPanel sites={sites} notify={notify} />
      ) : (
        <AdminPanel users={users} currentUserId={user.id} notify={notify} />
      )}
    </AppShell>
  );
}
