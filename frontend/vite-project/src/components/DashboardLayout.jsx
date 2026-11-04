import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import useAuthUser from "../hooks/userAuthUser.js";
import { fetchFriendRequests, fetchNotifications } from "../lib/api.js";
import { themeGroups } from "../lib/themes.js";

const navigation = [
  { label: "Dashboard", to: "/", icon: "home" },
  { label: "Connections", to: "/connections", icon: "connections" },
  { label: "Notifications", to: "/notifications", icon: "notifications" },
  { label: "Requests", to: "/requests", icon: "requests" },
];

const Icon = ({ name }) => {
  const paths = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    connections: <><rect x="3" y="5" width="14" height="14" rx="2" /><path d="m7 9 3 3-3 3M12 15h2M17 8h4v11h-4" /></>,
    notifications: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /><path d="M5 4 3 6M19 4l2 2" /></>,
    requests: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 8v6M17 11h6" /></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    palette: <><path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1.7-3.1 1.8 1.8 0 0 1 1.5-2.8H18a3 3 0 0 0 3-3c0-5-4-9.1-9-9.1Z" /><circle cx="7.5" cy="10" r=".8" /><circle cx="11" cy="7" r=".8" /><circle cx="15.5" cy="8" r=".8" /></>,
  };

  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
};

const DashboardLayout = ({ children, theme, onThemeChange }) => {
  const { authenticatedUser } = useAuthUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: requestData } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: fetchFriendRequests,
  });
  const { data: notificationSummary } = useQuery({
    queryKey: ["notificationSummary"],
    queryFn: () => fetchNotifications({ page: 1, limit: 1 }),
    refetchInterval: 20_000,
  });
  const incomingCount = requestData?.incomingRequests?.length ?? 0;
  const unreadNotificationCount = notificationSummary?.unreadCount ?? 0;

  return (
    <div className="dashboard-shell">
      {sidebarOpen && (
        <button
          aria-label="Close navigation menu"
          className="dashboard-scrim"
          type="button"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`dashboard-sidebar${sidebarOpen ? " is-open" : ""}`}>
        <NavLink
          className="dashboard-brand"
          to="/"
          onClick={() => setSidebarOpen(false)}
        >
          <img src="/logo.png" alt="" />
          <span>VibeTalk</span>
        </NavLink>

        <nav className="dashboard-navigation" aria-label="Main navigation">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `dashboard-nav-link${isActive ? " is-active" : ""}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.to === "/requests" && incomingCount > 0 && (
                <span className="dashboard-nav-count">{incomingCount}</span>
              )}
              {item.to === "/notifications" && unreadNotificationCount > 0 && (
                <span className="dashboard-nav-count">
                  {unreadNotificationCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="dashboard-profile">
          <img
            className="partner-avatar"
            src={
              authenticatedUser?.image ||
              `https://api.dicebear.com/10.x/personas/svg?seed=${encodeURIComponent(authenticatedUser?.fullName || "VibeTalk")}`
            }
            alt=""
          />
          <div>
            <strong>{authenticatedUser?.fullName || "Your profile"}</strong>
            <span>{authenticatedUser?.email}</span>
          </div>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <button
            aria-label="Open navigation menu"
            className="dashboard-menu-button"
            type="button"
            onClick={() => setSidebarOpen(true)}
          >
            <Icon name="menu" />
          </button>
          <div className="dashboard-topbar-actions">
            <NavLink className="dashboard-requests-link" to="/requests">
              Requests
              <span>{incomingCount}</span>
            </NavLink>
            <label className="dashboard-theme-picker">
              <Icon name="palette" />
              <span className="sr-only">Choose color theme</span>
              <select
                aria-label="Choose color theme"
                value={theme}
                onChange={(event) => onThemeChange(event.target.value)}
              >
                {themeGroups.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.themes.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;
