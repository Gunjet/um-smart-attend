"use client";

import { useState, useTransition } from "react";
import { useNotice } from "../_hooks/use-notice";
import { logout } from "../_server/auth/actions";
import { COURSES } from "../_lib/demo-data";
import type { SessionUser } from "../_lib/types";
import { AppShell, type NavItem } from "./app-shell";
import { useAttendanceContext } from "./attendance-provider";
import { CheckCircleIcon, DashboardIcon, ReportIcon } from "./icons";
import { StudentHome } from "./student/student-home";
import { TeacherDashboard } from "./teacher/teacher-dashboard";
import { TeacherReport } from "./teacher/teacher-report";

type TeacherView = "dashboard" | "report";
type StudentView = "attendance";

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

const STUDENT_NAV: NavItem<StudentView>[] = [
  {
    id: "attendance",
    label: "Миний ирц",
    shortLabel: "Миний ирц",
    icon: <CheckCircleIcon />,
  },
];

const ROLE_LABEL: Record<SessionUser["role"], string> = {
  admin: "Админы эрх",
  teacher: "Багшийн эрх",
  student: "Оюутны эрх",
};

/** Нэвтэрсэн хэрэглэгчийн эрхээс хамааран багш эсвэл оюутны дэлгэцийг харуулна. */
export function AttendanceApp({ user }: { user: SessionUser }) {
  const attendance = useAttendanceContext();
  const [teacherView, setTeacherView] = useState<TeacherView>("dashboard");
  const { notice, notify: setNotice, dismissNotice } = useNotice();
  const [, startTransition] = useTransition();

  const shellProps = {
    account: {
      name: user.name,
      roleLabel: ROLE_LABEL[user.role],
      initials: user.initials,
    },
    onSignOut: () => startTransition(() => logout()),
    notice,
    onDismissNotice: dismissNotice,
  };

  if (user.role === "student") {
    return (
      <AppShell
        {...shellProps}
        navItems={STUDENT_NAV}
        activeView="attendance"
        onNavigate={() => undefined}
      >
        <StudentHome
          attendance={attendance}
          student={{
            code: user.studentCode ?? "",
            name: user.name,
            firstName: user.firstName,
            initials: user.initials,
          }}
          notify={setNotice}
        />
      </AppShell>
    );
  }

  const navigate = (view: TeacherView) => {
    // Тайланд demo түүх хэрэгтэй (ирц өгөгдлийн санд шилжих хүртэл).
    if (view === "report") attendance.loadHistory();
    setTeacherView(view);
  };

  return (
    <AppShell
      {...shellProps}
      navItems={TEACHER_NAV}
      activeView={teacherView}
      onNavigate={navigate}
    >
      {teacherView === "report" ? (
        <TeacherReport
          records={attendance.records}
          courses={COURSES}
          onBack={() => setTeacherView("dashboard")}
        />
      ) : (
        <TeacherDashboard
          attendance={attendance}
          teacherFirstName={user.firstName}
          notify={setNotice}
        />
      )}
    </AppShell>
  );
}
