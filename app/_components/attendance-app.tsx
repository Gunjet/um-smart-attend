"use client";

import { useState, useTransition } from "react";
import { useNotice } from "../_hooks/use-notice";
import type {
  StudentCourse,
  TeacherCourse,
  TimetableCourse,
  TodayAttendance,
} from "../_lib/dto";
import type { LeaveRequestItem } from "../_lib/leave";
import type { AttendanceRecord, SessionUser } from "../_lib/types";
import { logout } from "../_server/auth/actions";
import { AppShell, type NavItem } from "./app-shell";
import {
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  DashboardIcon,
  ReportIcon,
} from "./icons";
import { LeavePage } from "./student/leave-page";
import { Timetable } from "./student/timetable";
import { StudentHome } from "./student/student-home";
import { TeacherDashboard } from "./teacher/teacher-dashboard";
import { LeaveReview } from "./teacher/leave-review";
import { TeacherReport } from "./teacher/teacher-report";

type TeacherView = "dashboard" | "report" | "leave";

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

type StudentView = "attendance" | "timetable" | "leave";

const STUDENT_NAV: NavItem<StudentView>[] = [
  {
    id: "attendance",
    label: "Миний ирц",
    shortLabel: "Миний ирц",
    icon: <CheckCircleIcon />,
  },
  {
    id: "timetable",
    label: "Хичээлийн хуваарь",
    shortLabel: "Хуваарь",
    icon: <ClockIcon className="size-[18px]" />,
  },
  {
    id: "leave",
    label: "Чөлөөний хүсэлт",
    shortLabel: "Чөлөө",
    icon: <CalendarIcon />,
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
  leaveRequests,
}: {
  user: SessionUser;
  courses: TeacherCourse[];
  records: AttendanceRecord[];
  leaveRequests: LeaveRequestItem[];
}) {
  const { notify, shellProps } = useShell(user, "Багшийн эрх");
  const [view, setView] = useState<TeacherView>("dashboard");
  const pendingLeave = leaveRequests.filter(
    (request) => request.status === "pending",
  ).length;
  // Хүлээгдэж буй хүсэлтийн тоог цэсэнд харуулна.
  const nav: NavItem<TeacherView>[] = [
    ...TEACHER_NAV,
    {
      id: "leave",
      label: pendingLeave
        ? `Чөлөөний хүсэлт · ${pendingLeave}`
        : "Чөлөөний хүсэлт",
      shortLabel: pendingLeave ? `Хүсэлт · ${pendingLeave}` : "Хүсэлт",
      icon: <CalendarIcon />,
    },
  ];

  return (
    <AppShell
      {...shellProps}
      navItems={nav}
      activeView={view}
      onNavigate={setView}
    >
      {view === "report" ? (
        <TeacherReport
          records={records}
          courses={courses}
          onBack={() => setView("dashboard")}
          notify={notify}
        />
      ) : view === "leave" ? (
        <LeaveReview requests={leaveRequests} notify={notify} />
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
  leaveRequests,
  today,
  todayAttendance,
  timetable,
  classGroup,
}: {
  user: SessionUser;
  courses: StudentCourse[];
  locationRequired: boolean;
  passkeyRegistered: boolean;
  leaveRequests: LeaveRequestItem[];
  /** Улаанбаатарын цагаар өнөөдөр, "YYYY-MM-DD". */
  today: string;
  todayAttendance: TodayAttendance[];
  timetable: TimetableCourse[];
  /** Оюутны анги (хуваарийн анхдагч шүүлтүүр). */
  classGroup: string | null;
}) {
  const { notify, shellProps } = useShell(user, "Оюутны эрх");
  const [view, setView] = useState<StudentView>("attendance");
  return (
    <AppShell
      {...shellProps}
      navItems={STUDENT_NAV}
      activeView={view}
      onNavigate={setView}
    >
      {view === "timetable" ? (
        <Timetable courses={timetable} defaultGroup={classGroup} />
      ) : view === "leave" ? (
        <LeavePage
          courses={courses}
          requests={leaveRequests}
          today={today}
          notify={notify}
        />
      ) : (
        <StudentHome
          firstName={user.firstName}
          courses={courses}
          locationRequired={locationRequired}
          passkeyRegistered={passkeyRegistered}
          todayAttendance={todayAttendance}
          notify={notify}
        />
      )}
    </AppShell>
  );
}
