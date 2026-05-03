import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";

import { AppLayout } from "../layouts/AppLayout";
import { CategoriesPage } from "../pages/CategoriesPage";
import { DashboardPage } from "../pages/DashboardPage";
import { LoginPage } from "../pages/LoginPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { RegisterPage } from "../pages/RegisterPage";
import { ReimbursementDetailPage } from "../pages/ReimbursementDetailPage";
import { ReimbursementEditPage } from "../pages/ReimbursementEditPage";
import { ReimbursementHistoryPage } from "../pages/ReimbursementHistoryPage";
import { ReimbursementNewPage } from "../pages/ReimbursementNewPage";
import { useAuth, type UserRole } from "../contexts/AuthContext";

type PrivateRouteProps = {
  allowedRoles?: UserRole[];
};

function PublicRoute() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate replace to="/dashboard" />;
  }

  return <Outlet />;
}

function PrivateRoute({ allowedRoles }: PrivateRouteProps) {
  const { isAuthenticated, userRole } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  if (allowedRoles && (!userRole || !allowedRoles.includes(userRole))) {
    return <Navigate replace to="/dashboard" />;
  }

  return <Outlet />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Navigate replace to="/dashboard" />} path="/" />

      <Route element={<PublicRoute />}>
        <Route element={<LoginPage />} path="/login" />
        <Route element={<RegisterPage />} path="/register" />
      </Route>

      <Route element={<PrivateRoute />}>
        <Route element={<AppLayout />}>
          <Route element={<DashboardPage />} path="/dashboard" />
          <Route element={<ReimbursementNewPage />} path="/reimbursements/new" />
          <Route element={<ReimbursementEditPage />} path="/reimbursements/:id/edit" />
          <Route element={<ReimbursementDetailPage />} path="/reimbursements/:id" />
          <Route element={<ReimbursementHistoryPage />} path="/reimbursements/:id/history" />
        </Route>
      </Route>

      <Route element={<PrivateRoute allowedRoles={["ADMIN"]} />}>
        <Route element={<AppLayout />}>
          <Route element={<CategoriesPage />} path="/categories" />
        </Route>
      </Route>

      <Route element={<NotFoundPage />} path="*" />
    </Routes>
  );
}
