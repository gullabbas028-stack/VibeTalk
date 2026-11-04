import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  acceptFriendRequest,
  fetchFriendRequests,
  fetchOutgoingFriendRequests,
  rejectFriendRequest,
} from "../lib/api.js";

const avatarFor = (user) =>
  user?.image ||
  `https://api.dicebear.com/10.x/personas/svg?seed=${encodeURIComponent(user?.fullName || "VibeTalk")}`;

const formatRequestDate = (date) => {
  if (!date) return "";
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    parsedDate,
  );
};

const RequestPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("incoming");
  const [search, setSearch] = useState("");

  const {
    data: incomingData,
    isLoading: incomingLoading,
    error: incomingError,
  } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: fetchFriendRequests,
  });
  const {
    data: outgoingData,
    isLoading: outgoingLoading,
    error: outgoingError,
  } = useQuery({
    queryKey: ["outgoingFriendRequests"],
    queryFn: fetchOutgoingFriendRequests,
  });

  const refreshRequests = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] }),
      queryClient.invalidateQueries({ queryKey: ["outgoingFriendRequests"] }),
      queryClient.invalidateQueries({ queryKey: ["friends"] }),
      queryClient.invalidateQueries({ queryKey: ["recommendedUsers"] }),
      queryClient.invalidateQueries({ queryKey: ["notificationSummary"] }),
      queryClient.invalidateQueries({ queryKey: ["notificationAlerts"] }),
    ]);
  };
  const acceptRequest = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: async (data) => {
      await refreshRequests();
      toast.success(
        data.notificationWarning
          ? "Request accepted, but the notification could not be saved."
          : "Connection request accepted",
      );
    },
    onError: (error) =>
      toast.error(error.response?.data?.message || "Could not accept request"),
  });
  const declineRequest = useMutation({
    mutationFn: rejectFriendRequest,
    onSuccess: async () => {
      await refreshRequests();
      toast.success("Connection request declined");
    },
    onError: (error) =>
      toast.error(error.response?.data?.message || "Could not decline request"),
  });

  const incomingRequests = incomingData?.incomingRequests ?? [];
  const outgoingRequests = outgoingData?.outgoingRequests ?? [];
  const displayedRequests =
    activeTab === "incoming" ? incomingRequests : outgoingRequests;
  const filteredRequests = useMemo(
    () =>
      displayedRequests.filter((request) => {
        const user =
          activeTab === "incoming" ? request.sender : request.recipient;
        return `${user?.fullName ?? ""} ${user?.location ?? ""} ${user?.skill ?? ""} ${user?.language ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase());
      }),
    [activeTab, displayedRequests, search],
  );
  const isLoading = activeTab === "incoming" ? incomingLoading : outgoingLoading;
  const error = activeTab === "incoming" ? incomingError : outgoingError;
  const isMutating = acceptRequest.isPending || declineRequest.isPending;

  return (
    <main className="dashboard-content">
      <section className="dashboard-section">
        <div className="dashboard-section-heading requests-page-heading">
          <div>
            <p className="dashboard-eyebrow">GROW YOUR COMMUNITY</p>
            <h1>Connection Requests</h1>
            <p>Manage invitations from other learners and check on yours.</p>
          </div>
          <label className="dashboard-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Search requests"
              aria-label="Search connection requests"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        <div className="requests-tabs" role="tablist" aria-label="Request type">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "incoming"}
            className={activeTab === "incoming" ? "is-active" : ""}
            onClick={() => {
              setActiveTab("incoming");
              setSearch("");
            }}
          >
            Received
            {incomingRequests.length > 0 && (
              <span>{incomingRequests.length}</span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "outgoing"}
            className={activeTab === "outgoing" ? "is-active" : ""}
            onClick={() => {
              setActiveTab("outgoing");
              setSearch("");
            }}
          >
            Sent
            {outgoingRequests.length > 0 && (
              <span>{outgoingRequests.length}</span>
            )}
          </button>
        </div>

        {error ? (
          <div className="dashboard-message is-error" role="alert">
            Could not load {activeTab} requests. Please try again.
          </div>
        ) : isLoading ? (
          <div className="dashboard-message">
            <span className="loading loading-spinner loading-sm" />
            Loading {activeTab} requests...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="dashboard-empty requests-empty">
            <span className="connections-empty-icon" aria-hidden="true">
              {activeTab === "incoming" ? "↙" : "↗"}
            </span>
            <h2>
              {search
                ? "No requests match your search"
                : activeTab === "incoming"
                  ? "No requests received"
                  : "No pending requests sent"}
            </h2>
            <p>
              {search
                ? "Try another name, location, language, or skill."
                : activeTab === "incoming"
                  ? "When someone wants to connect, their request will appear here."
                  : "Requests you send will appear here until they are accepted."}
            </p>
            {!search && (
              <Link className="btn btn-primary btn-sm" to="/">
                Discover learners
              </Link>
            )}
          </div>
        ) : (
          <div className="requests-list">
            {filteredRequests.map((request) => {
              const isIncoming = activeTab === "incoming";
              const person = isIncoming ? request.sender : request.recipient;
              if (!person) return null;
              const isCurrentRequest = acceptRequest.variables === request._id ||
                declineRequest.variables === request._id;

              return (
                <article className="request-card" key={request._id}>
                  <img className="request-avatar" src={avatarFor(person)} alt="" />
                  <div className="request-person">
                    <h2>{person.fullName}</h2>
                    <p className="request-person-meta">
                      {[person.location, person.language, person.skill]
                        .filter(Boolean)
                        .join(" · ") || "VibeTalk learner"}
                    </p>
                    {person.bio && <p className="request-person-bio">{person.bio}</p>}
                    {formatRequestDate(request.createdAt) && (
                      <time dateTime={request.createdAt}>
                        {isIncoming ? "Received" : "Sent"}{" "}
                        {formatRequestDate(request.createdAt)}
                      </time>
                    )}
                  </div>
                  {isIncoming ? (
                    <div className="request-actions">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={isMutating}
                        onClick={() => acceptRequest.mutate(request._id)}
                      >
                        {isCurrentRequest && acceptRequest.isPending ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : (
                          "Accept"
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={isMutating}
                        onClick={() => declineRequest.mutate(request._id)}
                      >
                        {isCurrentRequest && declineRequest.isPending ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : (
                          "Decline"
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="request-pending-badge">
                      <i />
                      Pending
                    </span>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
};

export default RequestPage;
