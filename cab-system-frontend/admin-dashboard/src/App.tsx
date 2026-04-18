import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes } from "react-router-dom";
import "./App.css";

function DashboardPage() {
  return (
    <Page
      title="Dashboard"
      description="Tổng quan KPI: các chỉ số đo lường hiệu quả hoạt động tổng thể của hệ thống."
    />
  );
}

function UsersPage() {
  return (
    <Page
      title="Users"
      description="Quản lý Người dùng: xem danh sách, thông tin và quản lý tài khoản khách hàng."
    />
  );
}

function DriversPage() {
  return (
    <Page
      title="Drivers"
      description="Quản lý Tài xế: duyệt hồ sơ tài xế và theo dõi hoạt động."
    />
  );
}

function RidesPage() {
  return (
    <Page
      title="Rides"
      description="Quản lý Chuyến đi: giám sát danh sách toàn bộ chuyến đi trong hệ thống."
    />
  );
}

function MonitoringPage() {
  return (
    <Page
      title="Monitoring"
      description="Giám sát Hệ thống: real-time map, logs và audit hoạt động."
    />
  );
}

function PricingPage() {
  return (
    <Page
      title="Pricing"
      description="Cấu hình Giá: quản lý chính sách giá và hệ thống surge control."
    />
  );
}

function Page({ title, description }: { title: string; description: string }) {
  return (
    <section className="page">
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  );
}

function AdminLayout() {
  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <h2>Admin Dashboard</h2>
        <nav className="menu">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/users">Users</NavLink>
          <NavLink to="/drivers">Drivers</NavLink>
          <NavLink to="/rides">Rides</NavLink>
          <NavLink to="/monitoring">Monitoring</NavLink>
          <NavLink to="/pricing">Pricing</NavLink>
        </nav>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;
