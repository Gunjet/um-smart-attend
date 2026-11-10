import { Suspense } from "react";
import { AdminApp } from "./_components/admin/admin-app";
import { AttendanceApp } from "./_components/attendance-app";
import { AttendanceProvider } from "./_components/attendance-provider";
import { LoginScreen } from "./_components/login-screen";
import { listUsersForAdmin } from "./_server/admin/users";
import { getCurrentUser } from "./_server/auth/dal";

export default function Home() {
  return (
    <AttendanceProvider>
      {/* Session-ийг request бүрт уншдаг тул Suspense дотор байна. */}
      <Suspense fallback={<div className="min-h-screen bg-surface" />}>
        <AuthGate />
      </Suspense>
    </AttendanceProvider>
  );
}

async function AuthGate() {
  const user = await getCurrentUser();
  if (!user) return <LoginScreen />;
  if (user.role === "admin") {
    return <AdminApp user={user} users={await listUsersForAdmin()} />;
  }
  return <AttendanceApp user={user} />;
}
