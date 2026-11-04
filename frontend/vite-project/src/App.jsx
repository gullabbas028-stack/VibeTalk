import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import HomePage from "./pages/HomePage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import ConnectionsPage from "./pages/ConnectionsPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import RequestPage from "./pages/RequestPage.jsx";
import OnboardingPage from "./pages/OnboardingPage.jsx";
import DashboardLayout from "./components/DashboardLayout.jsx";
import VideoCallProvider from "./components/VideoCallProvider.jsx";
import { Toaster, toast } from "react-hot-toast";
import useAuthUser from "./hooks/userAuthUser.js";
import LoadingPage from "./pages/LoadingPage.jsx";
import { fetchNotifications } from "./lib/api.js";
import { getSavedTheme, isAppTheme } from "./lib/themes.js";

const CallPage = lazy(() => import("./pages/CallPage.jsx"));


const App = () => {
  const [theme, setTheme] = useState(getSavedTheme);
  const { authenticatedUser, isLoading } = useAuthUser();
  const isAuth = !!authenticatedUser;
  const isOnboarded = authenticatedUser?.isOnboarded ?? false;
  const userId = authenticatedUser?._id?.toString();
  const location = useLocation();
  const knownNotifications = useRef(new Set());
  const notificationUserId = useRef("");
  const hasLoadedNotifications = useRef(false);
  const lastNotificationError = useRef(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const handleThemeChange = (nextTheme) => {
    if (!isAppTheme(nextTheme)) return;
    setTheme(nextTheme);
    try {
      localStorage.setItem("vibetalk-theme", nextTheme);
    } catch (error) {
      console.error("Could not save your theme preference.", error);
      toast.error("Could not save your theme preference");
    }
  };

  const {
    data: notificationData,
    error: notificationError,
  } = useQuery({
    queryKey: ["notificationAlerts", userId],
    queryFn: () => fetchNotifications({ page: 1, limit: 50 }),
    enabled: isAuth,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!userId || !notificationData?.notifications) return;
    if (notificationUserId.current !== userId) {
      notificationUserId.current = userId;
      knownNotifications.current.clear();
      hasLoadedNotifications.current = false;
    }

    for (const notification of notificationData.notifications) {
      if (!knownNotifications.current.has(notification._id)) {
        if (
          hasLoadedNotifications.current &&
          !notification.readAt &&
          notification.channels?.inApp?.status === "delivered" &&
          (notification.type !== "new_message" || location.pathname !== "/chat")
        ) {
          toast(notification.title, { icon: "🔔" });
        }
        knownNotifications.current.add(notification._id);
      }
    }
    hasLoadedNotifications.current = true;
  }, [location.pathname, notificationData, userId]);

  useEffect(() => {
    if (notificationError && lastNotificationError.current !== notificationError) {
      lastNotificationError.current = notificationError;
      toast.error("Live notifications could not be refreshed.");
    } else if (!notificationError) {
      lastNotificationError.current = null;
    }
  }, [notificationError]);

  if (isLoading) {
    return <LoadingPage />;
  }

  const requireOnboardedUser = (page) => {
    if (!isAuth) return <Navigate to="/login" replace />;
    if (!isOnboarded) return <Navigate to="/onboarding" replace />;
    return page;
  };
  const dashboardPage = (page) =>
    requireOnboardedUser(
      <DashboardLayout theme={theme} onThemeChange={handleThemeChange}>
        {page}
      </DashboardLayout>,
    );

  return (
    <VideoCallProvider>
      <main>
        <Routes>
        <Route
          path="/signup"
          element={
            isAuth ? (
              <Navigate to={isOnboarded ? "/" : "/onboarding"} replace />
            ) : (
              <SignupPage />
            )
          }
        />
        <Route
          path="/login"
          element={
            isAuth ? (
              <Navigate to={isOnboarded ? "/" : "/onboarding"} replace />
            ) : (
              <LoginPage />
            )
          }
        />
        <Route path="/" element={dashboardPage(<HomePage />)} />
        <Route
          path="/notifications"
          element={dashboardPage(<NotificationsPage />)}
        />
        <Route
          path="/connections"
          element={dashboardPage(<ConnectionsPage />)}
        />
        <Route path="/chat" element={requireOnboardedUser(<ChatPage />)} />
        <Route
          path="/requests"
          element={dashboardPage(<RequestPage />)}
        />
        <Route
          path="/call"
          element={requireOnboardedUser(
            <Suspense fallback={<LoadingPage />}>
              <CallPage />
            </Suspense>,
          )}
        />
        <Route
          path="/onboarding"
          element={
            !isAuth ? (
              <Navigate to="/login" replace />
            ) : isOnboarded ? (
              <Navigate to="/" replace />
            ) : (
              <OnboardingPage />
            )
          }
        />
        </Routes>
        <Toaster
          position="bottom-right"
          toastOptions={{ className: " !bg-base-100 !text-base-content " }}
        />
      </main>
    </VideoCallProvider>
  );
};

export default App;
