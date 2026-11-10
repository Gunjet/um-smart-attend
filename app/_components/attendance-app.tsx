"use client";

import { useState, useTransition } from "react";
import { useNotice } from "../_hooks/use-notice";
import type { StudentCourse, TeacherCourse } from "../_lib/dto";
import type { AttendanceRecord, SessionUser } from "../_lib/types";
import { logout } from "../_server/auth/actions";
import { AppShell, type NavItem } from "./app-shell";
import { CheckCircleIcon, DashboardIcon, ReportIcon } from "./icons";
import { StudentHome } from "./student/student-home";
import { TeacherDashboard } from "./teacher/teacher-dashboard";
import { TeacherReport } from "./teacher/teacher-report";

type TeacherView = "dashboard" | "report";

const TEACHER_NAV: NavItem<TeacherView>[] = [
  {
    id: "dashboard",
    label: "Хяналтын самбар",
    shortLabel: "Самбар",
    icon: <DashboardIcon />,
  },
  {
    id: "report",
    label: "Ирцийн тайлан",
    shortLabel: "Тайлан",
    icon: <ReportIcon />,
  },
];

const STUDENT_NAV: NavItem<"attendance">[] = [
  {
    id: "attendance",
    label: "Миний ирц",
    shortLabel: "Миний ирц",
    icon: <CheckCircleIcon />,
  },
];

function useShell(user: SessionUser, roleLabel: string) {
  const { notice, notify, dismissNotice } = useNotice();
  const [, startTransition] = useTransition();
  return {
    notify,
    shellProps: {
      account: { name: user.name, roleLabel, initials: user.initials },
      onSignOut: () => startTransition(() => logout()),
      notice,
      onDismissNotice: dismissNotice,
    },
  };
}

export function TeacherApp({
  user,
  courses,
  records,
}: {
  user: SessionUser;
  courses: TeacherCourse[];
  records: AttendanceRecord[];
}) {
  const { notify, shellProps } = useShell(user, "Багшийн эрх");
  const [view, setView] = useState<TeacherView>("dashboard");

  return (
    <AppShell
      {...shellProps}
      navItems={TEACHER_NAV}
      activeView={view}
      onNavigate={setView}
    >
      {view === "report" ? (
        <TeacherReport
          records={records}
          courses={courses}
          onBack={() => setView("dashboard")}
        />
      ) : (
        <TeacherDashboard
          courses={courses}
          teacherFirstName={user.firstName}
          notify={notify}
        />
      )}
    </AppShell>
  );
}

export function StudentApp({
  user,
  courses,
  locationRequired,
  passkeyRegistered,
}: {
  user: SessionUser;
  courses: StudentCourse[];
  locationRequired: boolean;
  passkeyRegistered: boolean;
}) {
  const { notify, shellProps } = useShell(user, "Оюутны эрх");
  return (
    <AppShell
      {...shellProps}
      navItems={STUDENT_NAV}
      activeView="attendance"
      onNavigate={() => undefined}
    >
      <StudentHome
        firstName={user.firstName}
        courses={courses}
        locationRequired={locationRequired}
        passkeyRegistered={passkeyRegistered}
        notify={notify}
      />
    </AppShell>
  );
}
