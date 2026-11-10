import { Suspense } from "react";
import { AdminApp } from "./_components/admin/admin-app";
import { StudentApp, TeacherApp } from "./_components/attendance-app";
import { LoginScreen } from "./_components/login-screen";
import { getAttendanceStats } from "./_server/admin/stats";
import { listUsersForAdmin } from "./_server/admin/users";
import { getCurrentUser } from "./_server/auth/dal";
import { hasPasskey } from "./_server/auth/webauthn";
import { closeStaleSessions } from "./_server/attendance/sessions";
import {
  getStudentLeaveRequests,
  getTeacherLeaveRequests,
  getUlaanbaatarToday,
} from "./_server/leave/queries";
import { getCampusSites } from "./_server/settings/campus";
import {
  getStudentCourses,
  getTeacherCourses,
  getTeacherReportRecords,
  listCoursesForAdmin,
} from "./_server/courses/queries";

export default function Home() {
  return (
    // Session-ийг request бүрт уншдаг тул Suspense дотор байна.
    <Suspense fallback={<div className="min-h-screen bg-surface" />}>
      <AuthGate />
    </Suspense>
  );
}

async function AuthGate() {
  const user = await getCurrentUser();
  if (!user) return <LoginScreen />;

  if (user.role === "admin") {
    const [users, courses, sites, stats, today] = await Promise.all([
      listUsersForAdmin(),
      listCoursesForAdmin(),
      getCampusSites(),
      getAttendanceStats(),
      getUlaanbaatarToday(),
    ]);
    return (
      <AdminApp
        user={user}
        users={users}
        courses={courses}
        sites={sites}
        stats={stats}
        today={today}
      />
    );
  }

  // Багш хаахаа мартсан (цаг нь өнгөрсөн) ирцийг автоматаар хаана.
  await closeStaleSessions();

  if (user.role === "teacher") {
    const [courses, records, leaveRequests] = await Promise.all([
      getTeacherCourses(user.id),
      getTeacherReportRecords(user.id),
      getTeacherLeaveRequests(user.id),
    ]);
    return (
      <TeacherApp
        user={user}
        courses={courses}
        records={records}
        leaveRequests={leaveRequests}
      />
    );
  }

  const [courses, sites, passkeyRegistered, leaveRequests, today] =
    await Promise.all([
      getStudentCourses(user.id),
      getCampusSites(),
      hasPasskey(user.id),
      getStudentLeaveRequests(user.id),
      getUlaanbaatarToday(),
    ]);
  return (
    <StudentApp
      user={user}
      courses={courses}
      locationRequired={sites.length > 0}
      passkeyRegistered={passkeyRegistered}
      leaveRequests={leaveRequests}
      today={today}
    />
  );
}
