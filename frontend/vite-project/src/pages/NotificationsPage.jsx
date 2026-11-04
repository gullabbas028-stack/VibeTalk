import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  deleteNotification,
  fetchNotificationPreferences,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  retryNotificationEmail,
  updateNotificationPreferences,
} from "../lib/api.js";

const notificationTypes = [
  { value: "friend_request", label: "Connection requests", key: "friendRequests" },
  { value: "friend_request_accepted", label: "Accepted requests", key: "acceptedRequests" },
  { value: "new_message", label: "New messages", key: "messages" },
  { value: "account_update", label: "Account and system updates", key: "accountUpdates" },
  { value: "event_reminder", label: "Event reminders", key: "events" },
  { value: "promotional_offer", label: "Product updates", key: "promotions" },
];

const notificationIcon = {
  friend_request: "↗",
  friend_request_accepted: "✓",
  new_message: "✉",
  account_update: "◎",
  system_alert: "!",
  event_reminder: "◷",
  promotional_offer: "✦",
};

const formatDate = (date) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));

const deliveryLabel = (delivery) => {
  const labels = {
    delivered: "In-app",
    sent: "Email sent",
    pending: "Email queued",
    sending: "Sending email",
    failed: "Email failed",
    not_configured: "Email setup needed",
    not_requested: "",
  };
  return labels[delivery?.status] || "";
};

const PreferencesForm = ({ settings, onSave, isSaving }) => {
  const [draft, setDraft] = useState(settings.preferences);
  const { emailConfigured, smsConfigured } = settings;

  const updateChannel = (channel, enabled) => {
    setDraft((current) => ({
      ...current,
      channels: { ...current.channels, [channel]: enabled },
    }));
  };

  const updateTypeChannel = (type, channel, enabled) => {
    setDraft((current) => ({
      ...current,
      types: {
        ...current.types,
        [type]: { ...current.types[type], [channel]: enabled },
      },
    }));
  };

  return (
    <form
      className="notification-preferences"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(draft);
      }}
    >
      <section className="notification-settings-section">
        <div className="notification-subheading">
          <h2>Delivery channels</h2>
          <p>Turn channels on or off for all notification types.</p>
        </div>
        <div className="notification-channel-cards">
          <label className="notification-channel-card">
            <span className="notification-channel-icon">◎</span>
            <span className="notification-channel-copy">
              <strong>In-app</strong>
              <small>Notification center and live alerts</small>
            </span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={draft.channels.inApp}
              onChange={(event) => updateChannel("inApp", event.target.checked)}
            />
          </label>

          <label className="notification-channel-card">
            <span className="notification-channel-icon">✉</span>
            <span className="notification-channel-copy">
              <strong>Email</strong>
              <small>{emailConfigured ? "Delivered with Resend" : "Resend setup required"}</small>
            </span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={draft.channels.email}
              onChange={(event) => updateChannel("email", event.target.checked)}
            />
          </label>

          <label className="notification-channel-card is-disabled">
            <span className="notification-channel-icon">▣</span>
            <span className="notification-channel-copy">
              <strong>SMS</strong>
              <small>{smsConfigured ? "SMS delivery enabled" : "Not configured"}</small>
            </span>
            <input
              type="checkbox"
              className="toggle"
              checked={draft.channels.sms}
              disabled
              aria-label="SMS notifications are not configured"
            />
          </label>
        </div>
        {!emailConfigured && (
          <div className="notification-setup-notice">
            Email delivery is not configured yet. Add <code>RESEND_API_KEY</code>{" "}
            and <code>RESEND_FROM_EMAIL</code> to the backend environment before
            email notifications can be sent.
          </div>
        )}
      </section>

      <section className="notification-settings-section">
        <div className="notification-subheading">
          <h2>Subscriptions</h2>
          <p>Choose which kinds of updates you receive and where.</p>
        </div>
        <div className="notification-preference-table-wrap">
          <table className="notification-preference-table">
            <thead>
              <tr>
                <th scope="col">Notification type</th>
                <th scope="col">In-app</th>
                <th scope="col">Email</th>
                <th scope="col">SMS</th>
              </tr>
            </thead>
            <tbody>
              {notificationTypes.map((type) => (
                <tr key={type.value}>
                  <th scope="row">{type.label}</th>
                  <td>
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary checkbox-sm"
                      aria-label={`${type.label} in-app notifications`}
                      checked={draft.types[type.key].inApp}
                      disabled={!draft.channels.inApp}
                      onChange={(event) =>
                        updateTypeChannel(type.key, "inApp", event.target.checked)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary checkbox-sm"
                      aria-label={`${type.label} email notifications`}
                      checked={draft.types[type.key].email}
                      disabled={!draft.channels.email}
                      onChange={(event) =>
                        updateTypeChannel(type.key, "email", event.target.checked)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      aria-label={`${type.label} SMS notifications`}
                      checked={draft.types[type.key].sms}
                      disabled
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="notification-preferences-footer">
        <p>Preferences are saved to your account.</p>
        <button className="btn btn-primary" type="submit" disabled={isSaving}>
          {isSaving && <span className="loading loading-spinner loading-sm" />}
          {isSaving ? "Saving..." : "Save preferences"}
        </button>
      </div>
    </form>
  );
};

const NotificationsPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("activity");
  const [typeFilter, setTypeFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const queryParams = {
    page,
    limit: 20,
    type: typeFilter,
    read: readFilter,
    q: search || undefined,
  };
  const {
    data: history,
    isLoading: historyLoading,
    error: historyError,
  } = useQuery({
    queryKey: ["notifications", queryParams],
    queryFn: () => fetchNotifications(queryParams),
    enabled: activeTab === "activity",
    refetchInterval: 15_000,
  });
  const {
    data: settings,
    isLoading: preferencesLoading,
    error: preferencesError,
  } = useQuery({
    queryKey: ["notificationPreferences"],
    queryFn: fetchNotificationPreferences,
    enabled: activeTab === "preferences",
  });

  const refreshHistory = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      queryClient.invalidateQueries({ queryKey: ["notificationSummary"] }),
      queryClient.invalidateQueries({ queryKey: ["notificationAlerts"] }),
    ]);
  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: refreshHistory,
    onError: (error) =>
      toast.error(error.response?.data?.message || "Could not update notification"),
  });
  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: refreshHistory,
    onError: (error) =>
      toast.error(error.response?.data?.message || "Could not update notifications"),
  });
  const removeNotification = useMutation({
    mutationFn: deleteNotification,
    onSuccess: refreshHistory,
    onError: (error) =>
      toast.error(error.response?.data?.message || "Could not delete notification"),
  });
  const retryEmail = useMutation({
    mutationFn: retryNotificationEmail,
    onSuccess: () => {
      refreshHistory();
      toast.success("Email retry queued");
    },
    onError: (error) =>
      toast.error(error.response?.data?.message || "Could not retry email"),
  });
  const savePreferences = useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: (data) => {
      queryClient.setQueryData(["notificationPreferences"], data);
      toast.success("Notification preferences saved");
    },
    onError: (error) =>
      toast.error(error.response?.data?.message || "Could not save preferences"),
  });

  const totalPages = Math.max(
    1,
    Math.ceil((history?.total ?? 0) / (history?.limit ?? 20)),
  );

  return (
    <main className="notifications-page">
      <header className="notifications-page-header">
        <Link className="notifications-brand" to="/">
          <img src="/logo.png" alt="" />
          <span>VibeTalk</span>
        </Link>
        <Link className="notifications-back-link" to="/">
          ← <span>Dashboard</span>
        </Link>
      </header>

      <section className="notifications-panel">
        <div className="notifications-title-row">
          <div>
            <p className="notifications-eyebrow">YOUR ACCOUNT</p>
            <h1>Notifications</h1>
            <p>Stay up to date with your learning community.</p>
          </div>
          {activeTab === "activity" && (history?.unreadCount ?? 0) > 0 && (
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              disabled={markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              Mark all as read
            </button>
          )}
        </div>

        <div className="notifications-tabs" role="tablist">
          <button
            id="notifications-activity-tab"
            className={activeTab === "activity" ? "is-active" : ""}
            type="button"
            role="tab"
            aria-selected={activeTab === "activity"}
            aria-controls="notifications-activity"
            onClick={() => setActiveTab("activity")}
          >
            Activity
            {(history?.unreadCount ?? 0) > 0 && (
              <span>{history.unreadCount}</span>
            )}
          </button>
          <button
            id="notifications-preferences-tab"
            className={activeTab === "preferences" ? "is-active" : ""}
            type="button"
            role="tab"
            aria-selected={activeTab === "preferences"}
            aria-controls="notifications-preferences"
            onClick={() => setActiveTab("preferences")}
          >
            Preferences
          </button>
        </div>

        {activeTab === "activity" ? (
          <section
            id="notifications-activity"
            className="notifications-activity"
            role="tabpanel"
            aria-labelledby="notifications-activity-tab"
          >
            <div className="notification-filters">
              <form
                className="notification-search"
                onSubmit={(event) => {
                  event.preventDefault();
                  setPage(1);
                  setSearch(searchInput.trim());
                }}
              >
                <input
                  type="search"
                  placeholder="Search notifications"
                  aria-label="Search notification history"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
                <button className="btn btn-primary btn-sm" type="submit">
                  Search
                </button>
              </form>
              <div className="notification-select-filters">
                <label>
                  <span>Type</span>
                  <select
                    value={typeFilter}
                    onChange={(event) => {
                      setPage(1);
                      setTypeFilter(event.target.value);
                    }}
                  >
                    <option value="all">All types</option>
                    {notificationTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Status</span>
                  <select
                    value={readFilter}
                    onChange={(event) => {
                      setPage(1);
                      setReadFilter(event.target.value);
                    }}
                  >
                    <option value="all">All</option>
                    <option value="unread">Unread</option>
                    <option value="read">Read</option>
                  </select>
                </label>
              </div>
            </div>

            {historyError ? (
              <div className="notifications-state is-error" role="alert">
                Could not load notification history. Please try again.
              </div>
            ) : historyLoading ? (
              <div className="notifications-state">
                <span className="loading loading-spinner loading-sm" />
                Loading your notifications...
              </div>
            ) : history?.notifications?.length ? (
              <>
                <div className="notification-list">
                  {history.notifications.map((notification) => {
                    const emailStatus = notification.channels?.email;
                    const link = notification.link || "/";
                    return (
                      <article
                        key={notification._id}
                        className={`notification-item${notification.readAt ? " is-read" : " is-unread"}`}
                      >
                        <div className={`notification-item-icon type-${notification.type}`}>
                          {notification.actor?.image ? (
                            <img src={notification.actor.image} alt="" />
                          ) : (
                            notificationIcon[notification.type] || "•"
                          )}
                        </div>
                        <div className="notification-item-content">
                          <div className="notification-item-title">
                            {!notification.readAt && (
                              <span className="notification-unread-dot" />
                            )}
                            <Link
                              to={link}
                              onClick={() => {
                                if (!notification.readAt) {
                                  markRead.mutate(notification._id);
                                }
                              }}
                            >
                              {notification.title}
                            </Link>
                          </div>
                          <p>{notification.message}</p>
                          <time dateTime={notification.createdAt}>
                            {formatDate(notification.createdAt)}
                          </time>
                          <div className="notification-delivery-status">
                            {deliveryLabel(notification.channels?.inApp) && (
                              <span className="delivery-status is-success">
                                {deliveryLabel(notification.channels.inApp)}
                              </span>
                            )}
                            {deliveryLabel(emailStatus) && (
                              <span
                                className={`delivery-status ${
                                  ["failed", "not_configured"].includes(emailStatus.status)
                                    ? "is-warning"
                                    : emailStatus.status === "sent"
                                      ? "is-success"
                                      : "is-pending"
                                }`}
                              >
                                {deliveryLabel(emailStatus)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="notification-item-actions">
                          {!notification.readAt && (
                            <button
                              type="button"
                              aria-label="Mark as read"
                              title="Mark as read"
                              onClick={() => markRead.mutate(notification._id)}
                            >
                              ✓
                            </button>
                          )}
                          {["failed", "not_configured"].includes(emailStatus?.status) && (
                            <button
                              type="button"
                              aria-label="Retry email delivery"
                              title="Retry email delivery"
                              disabled={retryEmail.isPending}
                              onClick={() => retryEmail.mutate(notification._id)}
                            >
                              ↻
                            </button>
                          )}
                          <button
                            type="button"
                            aria-label="Delete notification"
                            title="Delete notification"
                            disabled={removeNotification.isPending}
                            onClick={() => removeNotification.mutate(notification._id)}
                          >
                            ×
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
                <div className="notification-pagination">
                  <span>
                    Page {page} of {totalPages} · {history.total} notifications
                  </span>
                  <div>
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((current) => current - 1)}
                    >
                      Previous
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((current) => current + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="notifications-empty">
                <span>✦</span>
                <h2>You&apos;re all caught up</h2>
                <p>Important updates from your community will show up here.</p>
              </div>
            )}
          </section>
        ) : (
          <section
            id="notifications-preferences"
            className="notifications-settings"
            role="tabpanel"
            aria-labelledby="notifications-preferences-tab"
          >
            {preferencesError ? (
              <div className="notifications-state is-error" role="alert">
                Could not load your notification preferences.
              </div>
            ) : preferencesLoading || !settings ? (
              <div className="notifications-state">
                <span className="loading loading-spinner loading-sm" />
                Loading preferences...
              </div>
            ) : (
              <PreferencesForm
                key={JSON.stringify(settings.preferences)}
                settings={settings}
                onSave={(preferences) => savePreferences.mutate(preferences)}
                isSaving={savePreferences.isPending}
              />
            )}
          </section>
        )}
      </section>
    </main>
  );
};

export default NotificationsPage;
