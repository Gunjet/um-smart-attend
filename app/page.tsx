import { Suspense } from "react";
import { AdminApp } from "./_components/admin/admin-app";
import { StudentApp, TeacherApp } from "./_components/attendance-app";
import { LoginScreen } from "./_components/login-screen";
import { listUsersForAdmin } from "./_server/admin/users";
import { getCurrentUser } from "./_server/auth/dal";
import { hasPasskey } from "./_server/auth/webauthn";
import { getCampusLocation } from "./_server/settings/campus";
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
    const [users, courses, campus] = await Promise.all([
      listUsersForAdmin(),
      listCoursesForAdmin(),
      getCampusLocation(),
    ]);
    return (
      <AdminApp user={user} users={users} courses={courses} campus={campus} />
    );
  }

  if (user.role === "teacher") {
    const [courses, records] = await Promise.all([
      getTeacherCourses(user.id),
      getTeacherReportRecords(user.id),
    ]);
    return <TeacherApp user={user} courses={courses} records={records} />;
  }

  const [courses, campus, passkeyRegistered] = await Promise.all([
    getStudentCourses(user.id),
    getCampusLocation(),
    hasPasskey(user.id),
  ]);
  return (
    <StudentApp
      user={user}
      courses={courses}
      locationRequired={campus !== null}
      passkeyRegistered={passkeyRegistered}
    />
  );
}
