import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import AdminLayout from "./layouts/AdminLayout";
import Dashboard from "./pages/Dashboard";
import AdminQueue from "./pages/AdminQueue";
import Users from "./pages/Users";
import Inbox from "./pages/Inbox";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Router>
      <div className="relative flex min-h-dvh flex-col text-zinc-100">
        <div className="welp-app-bg absolute inset-0 -z-20" aria-hidden />
        <div className="pointer-events-none absolute inset-0 -z-10 welp-grid opacity-[0.28]" aria-hidden />
        <div className="relative z-0 flex min-h-dvh flex-1 flex-col">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/users" element={<Users />} />
              <Route path="/inbox" element={<Inbox />} />
              <Route path="/admin-queue" element={<AdminQueue />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
