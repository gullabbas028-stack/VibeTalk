import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchMyFriends } from "../lib/api.js";

const EMPTY_FRIENDS = [];

const avatarFor = (user) =>
  user.image ||
  `https://api.dicebear.com/10.x/personas/svg?seed=${encodeURIComponent(user.fullName || "VibeTalk")}`;

const ConnectionsPage = () => {
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["friends"],
    queryFn: fetchMyFriends,
  });
  const friends = data?.friends ?? EMPTY_FRIENDS;
  const filteredFriends = useMemo(
    () =>
      friends.filter((friend) =>
        `${friend.fullName} ${friend.location} ${friend.language} ${friend.skill}`
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [friends, search],
  );

  return (
    <main className="dashboard-content">
      <section className="dashboard-section">
        <div className="dashboard-section-heading">
          <div>
            <p className="dashboard-eyebrow">YOUR COMMUNITY</p>
            <h1>Connections</h1>
            <p>
              {friends.length} learning{" "}
              {friends.length === 1 ? "partner" : "partners"} in your network
            </p>
          </div>
          <label className="dashboard-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Search connections"
              aria-label="Search connections"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        {error ? (
          <div className="dashboard-message is-error" role="alert">
            Could not load your connections. Please try again.
          </div>
        ) : isLoading ? (
          <div className="dashboard-message">
            <span className="loading loading-spinner loading-sm" />
            Loading your connections...
          </div>
        ) : filteredFriends.length === 0 ? (
          <div className="dashboard-empty dashboard-connections-empty">
            <span className="connections-empty-icon" aria-hidden="true">
              ♧
            </span>
            <h2>{search ? "No connections match your search" : "Your network is waiting"}</h2>
            <p>
              {search
                ? "Try another name, location, language, or skill."
                : "Find learners who share your interests and start practicing together."}
            </p>
            {!search && (
              <Link className="btn btn-primary btn-sm" to="/">
                Discover learners
              </Link>
            )}
          </div>
        ) : (
          <div className="partner-grid connections-grid">
            {filteredFriends.map((friend) => (
              <article className="connection-card" key={friend._id}>
                <div className="connection-card-heading">
                  <img src={avatarFor(friend)} alt="" />
                  <div>
                    <h2>{friend.fullName}</h2>
                    {friend.location && (
                      <p>
                        <span aria-hidden="true">⌖</span>
                        {friend.location}
                      </p>
                    )}
                  </div>
                  <span className="connection-status">Connected</span>
                </div>
                <p className="connection-bio">
                  {friend.bio || "A learning partner in your VibeTalk community."}
                </p>
                <div className="connection-tags">
                  {friend.language && (
                    <span className="partner-language">
                      <span aria-hidden="true">🌐</span>
                      {friend.language}
                    </span>
                  )}
                  {friend.skill && (
                    <span className="partner-skill">Skill: {friend.skill}</span>
                  )}
                </div>
                <Link
                  className="connection-message-button"
                  to={`/chat?friend=${encodeURIComponent(friend._id)}`}
                >
                  <span aria-hidden="true">✉</span>
                  Message
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default ConnectionsPage;
