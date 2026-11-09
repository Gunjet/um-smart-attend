"use client";

import { useCallback, useEffect, useState } from "react";
import { useAttendance } from "../_hooks/use-attendance";
import {
  COURSES,
  CURRENT_TEACHER,
  findStudentProfile,
} from "../_lib/demo-data";
import { registerDevice } from "../_lib/device";
import type { Role } from "../_lib/types";
import { AppShell, type NavItem } from "./app-shell";
import { CheckCircleIcon, DashboardIcon, ReportIcon } from "./icons";
import { LoginScreen, type Credentials } from "./login-screen";
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

const DEMO_STUDENT_CODE = "DEMO-001";

type Account = { role: "teacher" } | { role: "student"; studentCode: string };

/**
 * Клиент талын үндсэн апп: нэвтрэлт, эрхээс хамаарсан дэлгэц, мэдэгдэл.
 * Ирцийн төлөв (useAttendance) нь гарч/нэвтрэхэд хадгалагдана — demo-д
 * нэг tab дээр багш session нээгээд, оюутнаар нэвтэрч бүртгүүлэх боломжтой.
 */
export function AttendanceApp() {
  const attendance = useAttendance();
  const { loadHistory } = attendance;
  const [account, setAccount] = useState<Account | null>(null);
  const [lastRole, setLastRole] = useState<Role>("teacher");
  const [teacherView, setTeacherView] = useState<TeacherView>("dashboard");
  const [notice, setNotice] = useState("");
  const dismissNotice = useCallback(() => setNotice(""), []);

  const signIn = useCallback(
    ({ role, identifier }: Credentials) => {
      // Төхөөрөмжийн бүртгэл demo — үр дүнг одоогоор харуулахгүй.
      registerDevice(role);
      setLastRole(role);
      setNotice("");
      if (role === "teacher") {
        loadHistory();
        setTeacherView("dashboard");
        setAccount({ role });
      } else {
        setAccount({ role, studentCode: identifier || DEMO_STUDENT_CODE });
      }
    },
    [loadHistory],
  );

  const signOut = useCallback(() => setAccount(null), []);
  // Мэдэгдэл 5 секундын дараа өөрөө алга болно.
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (!account) {
    return (
      <LoginScreen
        initialRole={lastRole}
        notice={notice}
        onDismissNotice={dismissNotice}
        notify={setNotice}
        onSignIn={signIn}
      />
    );
  }

  const shellProps = {
    onSignOut: signOut,
    notice,
    onDismissNotice: dismissNotice,
  };

  if (account.role === "teacher") {
    return (
      <AppShell
        {...shellProps}
        account={{
          name: CURRENT_TEACHER.name,
          roleLabel: "Багшийн эрх",
          initials: CURRENT_TEACHER.initials,
        }}
        navItems={TEACHER_NAV}
        activeView={teacherView}
        onNavigate={setTeacherView}
      >
        {teacherView === "report" ? (
          <TeacherReport
            records={attendance.records}
            courses={COURSES}
            onBack={() => setTeacherView("dashboard")}
          />
        ) : (
          <TeacherDashboard attendance={attendance} notify={setNotice} />
        )}
      </AppShell>
    );
  }

  const student = findStudentProfile(account.studentCode);
  return (
    <AppShell
      {...shellProps}
      account={{
        name: student.name,
        roleLabel: "Оюутны эрх",
        initials: student.initials,
      }}
      navItems={STUDENT_NAV}
      activeView="attendance"
      onNavigate={() => undefined}
    >
      <StudentHome
        attendance={attendance}
        student={student}
        notify={setNotice}
      />
    </AppShell>
  );
}
