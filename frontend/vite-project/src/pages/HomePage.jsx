import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  fetchMyFriends,
  fetchOutgoingFriendRequests,
  fetchRecommendedUsers,
  sendFriendRequest,
} from "../lib/api.js";

const Icon = ({ name, size = 20 }) => {
  const paths = {
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    requests: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 8v6M17 11h6" /></>,
  };

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
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

const UserAvatar = ({ user, className = "" }) => (
  <img
    className={`partner-avatar ${className}`}
    src={
      user?.image ||
      `https://api.dicebear.com/10.x/personas/svg?seed=${encodeURIComponent(user?.fullName || "VibeTalk")}`
    }
    alt=""
  />
);

const PartnerCard = ({
  user,
  isConnected = false,
  isSent,
  onSend,
  isSending,
}) => (
  <article className="partner-card">
    <div className="partner-card-top">
      <UserAvatar user={user} />
      <div className="partner-identity">
        <h3>{user.fullName}</h3>
        {user.location && (
          <p className="partner-location">
            <Icon name="pin" size={16} />
            <span>{user.location}</span>
          </p>
        )}
      </div>
      {isConnected ? (
        <Link
          className="partner-request-button is-connected"
          to={`/chat?friend=${encodeURIComponent(user._id)}`}
        >
          <span>Message</span>
        </Link>
      ) : (
        <button
          className={`partner-request-button${isSent ? " is-sent" : ""}`}
          type="button"
          onClick={() => onSend?.(user._id)}
          disabled={isSent || isSending}
        >
          <Icon name={isSent ? "check" : "requests"} size={16} />
          <span>{isSent ? "Request sent" : "Connection Request"}</span>
        </button>
      )}
    </div>
    <p className="partner-bio">
      {user.bio || "Ready to connect, share skills, and grow with like-minded people."}
    </p>
    <div className="partner-tags">
      {user.language && (
        <span className="partner-language">
          <span aria-hidden="true">🌐</span>
          {user.language}
        </span>
      )}
      {user.skill && <span className="partner-skill">Skill: {user.skill}</span>}
    </div>
  </article>
);

const HomePage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sentRequests, setSentRequests] = useState(() => new Set());

  const {
    data: friendsData,
    isLoading: friendsLoading,
    error: friendsError,
  } = useQuery({
    queryKey: ["friends"],
    queryFn: fetchMyFriends,
  });
  const {
    data: recommendedData,
    isLoading: recommendationsLoading,
    error: recommendationsError,
  } = useQuery({
    queryKey: ["recommendedUsers"],
    queryFn: fetchRecommendedUsers,
  });
  const { data: outgoingData } = useQuery({
    queryKey: ["outgoingFriendRequests"],
    queryFn: fetchOutgoingFriendRequests,
  });
  const {
    mutate: requestConnection,
    variables: pendingUserId,
    isPending: requestPending,
  } = useMutation({
    mutationFn: sendFriendRequest,
    onSuccess: (data, userId) => {
      queryClient.invalidateQueries({ queryKey: ["recommendedUsers"] });
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
      queryClient.invalidateQueries({ queryKey: ["outgoingFriendRequests"] });
      if (data.notificationWarning) {
        toast.error("Request sent, but its notification could not be saved.");
      } else {
        toast.success("Connection request sent");
      }
      setSentRequests((current) => new Set(current).add(userId));
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Could not send request");
    },
  });

  const friends = friendsData?.friends ?? [];
  const recommendations = recommendedData?.users ?? [];
  const outgoingIds = new Set(
    (outgoingData?.outgoingRequests ?? []).map((request) =>
      typeof request.recipient === "string"
        ? request.recipient
        : request.recipient?._id,
    ),
  );
  const filteredRecommendations = recommendations.filter((user) =>
    `${user.fullName} ${user.location} ${user.skill} ${user.language}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <main className="dashboard-content">
      <section className="dashboard-section">
        <div className="dashboard-section-heading">
          <div>
            <p className="dashboard-eyebrow">YOUR COMMUNITY</p>
            <h1>Learning Partners</h1>
            <p>Connect and practice skills with your learning partners</p>
          </div>
          <Link className="dashboard-text-link" to="/connections">
            View connections
          </Link>
        </div>

        {friendsError ? (
          <div className="dashboard-message is-error" role="alert">
            Could not load your connections. Please refresh to try again.
          </div>
        ) : friendsLoading ? (
          <div className="dashboard-message">
            <span className="loading loading-spinner loading-sm" />
            Loading your learning partners...
          </div>
        ) : friends.length === 0 ? (
          <div className="dashboard-empty">
            <h2>No connections yet</h2>
            <p>
              Connect with learning partners below to start practicing together!
            </p>
          </div>
        ) : (
          <div className="partner-grid friends-grid">
            {friends.map((friend) => (
              <PartnerCard key={friend._id} user={friend} isConnected />
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-section dashboard-recommendations">
        <div className="dashboard-section-heading">
          <div>
            <p className="dashboard-eyebrow">MEET YOUR NEXT PARTNER</p>
            <h2>Expand Your Network</h2>
            <p>Meet learners ready to exchange skills and practice together</p>
          </div>
          <label className="dashboard-search">
            <Icon name="search" size={18} />
            <input
              type="search"
              placeholder="Search learners"
              aria-label="Search learners"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        {recommendationsError ? (
          <div className="dashboard-message is-error" role="alert">
            Could not load learners. Please refresh to try again.
          </div>
        ) : recommendationsLoading ? (
          <div className="dashboard-message">
            <span className="loading loading-spinner loading-sm" />
            Finding learning partners...
          </div>
        ) : filteredRecommendations.length === 0 ? (
          <div className="dashboard-empty dashboard-empty-small">
            <h3>
              {search ? "No learners match your search" : "No learners to show yet"}
            </h3>
            <p>
              {search
                ? "Try another name, location, language, or skill."
                : "Check back soon to discover new learning partners."}
            </p>
          </div>
        ) : (
          <div className="partner-grid">
            {filteredRecommendations.map((user) => {
              const isSent = sentRequests.has(user._id) || outgoingIds.has(user._id);
              return (
                <PartnerCard
                  key={user._id}
                  user={user}
                  isSent={isSent}
                  onSend={requestConnection}
                  isSending={requestPending && pendingUserId === user._id}
                />
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
};

export default HomePage;
