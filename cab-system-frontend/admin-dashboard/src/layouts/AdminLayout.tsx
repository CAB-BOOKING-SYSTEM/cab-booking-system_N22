import { NavLink, Outlet } from "react-router-dom";
import { menuItems } from "../shared/navigation/menu";
import "./AdminLayout.css";

export function AdminLayout() {
  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <h2>Admin Dashboard</h2>
        <nav className="menu">
          {menuItems.map((item) => (
            <NavLink key={item.path} to={item.path}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
