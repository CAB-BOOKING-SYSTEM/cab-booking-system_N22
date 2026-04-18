import { Navigate, Route, Routes } from "react-router-dom";
import { DashboardPage } from "../features/dashboard";
import { DriversPage } from "../features/drivers";
import { MonitoringPage } from "../features/monitoring";
import { PricingPage } from "../features/pricing";
import { RidesPage } from "../features/rides";
import { UsersPage } from "../features/users";
import { AdminLayout } from "../layouts/AdminLayout";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="drivers" element={<DriversPage />} />
        <Route path="rides" element={<RidesPage />} />
        <Route path="monitoring" element={<MonitoringPage />} />
        <Route path="pricing" element={<PricingPage />} />
      </Route>
    </Routes>
  );
}
