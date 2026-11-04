import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import useAuthUser from "../hooks/userAuthUser.js";
import {
  createMessageNotification,
  fetchChatToken,
  fetchMyFriends,
} from "../lib/api.js";

const EMPTY_FRIENDS = [];
const MAX_SHARED_FILE_SIZE = 25 * 1024 * 1024;
const SHARED_FILE_EXTENSIONS = new Set([
  "avif",
  "csv",
  "doc",
  "docx",
  "gif",
  "jpeg",
  "jpg",
  "md",
  "mp3",
  "mp4",
  "mov",
  "pdf",
  "png",
  "ppt",
  "pptx",
  "txt",
  "wav",
  "webm",
  "webp",
  "xls",
  "xlsx",
]);

const getDirectChannelId = (firstUserId, secondUserId) =>
  `dm_${[firstUserId, secondUserId].sort().join("_")}`;

const getAvatar = (user) =>
  user?.image ||
  `https://api.dicebear.com/10.x/personas/svg?seed=${encodeURIComponent(user?.fullName || "VibeTalk")}`;

const formatMessageTime = (date) => {
  if (!date) return "";
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
};

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** unitIndex).toFixed(unitIndex ? 1 : 0)} ${units[unitIndex]}`;
};

const ChatIcon = ({ name, size = 20 }) => {
  const paths = {
    back: <path d="m15 18-6-6 6-6" />,
    send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    message: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" /></>,
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    video: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3" /></>,
    phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z" />,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
  };

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
};

const ChatPage = () => {
  const { authenticatedUser } = useAuthUser();
  const [searchParams] = useSearchParams();
  const friendIdFromUrl = searchParams.get("friend");
  const userId = authenticatedUser?._id?.toString();
  const [chatClient, setChatClient] = useState(null);
  const [connectionError, setConnectionError] = useState("");
  const [selectedFriendId, setSelectedFriendId] = useState("");
  const [activeChannelState, setActiveChannelState] = useState(null);
  const [messagesState, setMessagesState] = useState({
    channelId: "",
    messages: [],
  });
  const [messageText, setMessageText] = useState("");
  const [messageError, setMessageError] = useState({ channelId: "", text: "" });
  const [sending, setSending] = useState(false);
  const [loadedChannelId, setLoadedChannelId] = useState("");
  const [channelRetry, setChannelRetry] = useState(0);
  const [friendSearch, setFriendSearch] = useState("");
  const [unreadCounts, setUnreadCounts] = useState({});
  const [mobileChatOpen, setMobileChatOpen] = useState(() =>
    Boolean(friendIdFromUrl),
  );
  const [uploadingFile, setUploadingFile] = useState(false);
  const messageListRef = useRef(null);
  const fileInputRef = useRef(null);
  const activeCidRef = useRef("");

  const {
    data: friendsData,
    isLoading: friendsLoading,
    error: friendsError,
  } = useQuery({
    queryKey: ["friends"],
    queryFn: fetchMyFriends,
  });
  const friends = friendsData?.friends ?? EMPTY_FRIENDS;
  const filteredFriends = useMemo(
    () =>
      friends.filter((friend) =>
        friend.fullName?.toLowerCase().includes(friendSearch.toLowerCase()),
      ),
    [friends, friendSearch],
  );
  const preferredFriendId = selectedFriendId || friendIdFromUrl || "";
  const activeFriendId = friends.some(
    (friend) => friend._id?.toString() === preferredFriendId,
  )
    ? preferredFriendId
    : friends[0]?._id?.toString() ?? "";
  const selectedFriend = friends.find(
    (friend) => friend._id?.toString() === activeFriendId,
  );
  const activeChannelId =
    selectedFriend && userId
      ? getDirectChannelId(userId, selectedFriend._id.toString())
      : "";
  const activeChannel =
    activeChannelState?.channelId === activeChannelId
      ? activeChannelState.channel
      : null;
  const messages =
    messagesState.channelId === activeChannelId ? messagesState.messages : [];
  const channelLoading = Boolean(
    activeChannelId && loadedChannelId !== activeChannelId,
  );
  const currentMessageError =
    messageError.channelId === activeChannelId ? messageError.text : "";

  useEffect(() => {
    if (!userId) return undefined;
    let disposed = false;
    let client;

    const connect = async () => {
      try {
        setConnectionError("");
        const credentials = await fetchChatToken();
        if (!credentials.apiKey || !credentials.token || !credentials.user?.id) {
          throw new Error("Chat credentials were incomplete.");
        }

        const { StreamChat } = await import("stream-chat");
        client = new StreamChat(credentials.apiKey);
        await client.connectUser(credentials.user, credentials.token);
        if (disposed) {
          await client.disconnectUser();
          return;
        }
        setChatClient(client);
      } catch (error) {
        if (!disposed) {
          console.error("Could not connect to Stream Chat:", error);
          setConnectionError(
            error.response?.data?.message ||
              "Chat could not connect. Please try again.",
          );
        }
      }
    };

    connect();
    return () => {
      disposed = true;
      if (client?.userID) {
        client.disconnectUser().catch((error) => {
          console.error("Could not disconnect from Stream Chat:", error);
        });
      }
    };
  }, [userId]);

  useEffect(() => {
    if (!chatClient || !userId) return undefined;
    const handleNotification = (event) => {
      const senderId = event.user?.id ?? event.user_id;
      if (!senderId || senderId === userId || !event.channel_id) return;

      const friend = friends.find(
        (candidate) =>
          candidate._id?.toString() === senderId ||
          getDirectChannelId(userId, candidate._id?.toString()) === event.channel_id,
      );
      if (!friend) return;

      const channelId = getDirectChannelId(userId, friend._id.toString());
      if (activeCidRef.current === `messaging:${channelId}`) return;

      setUnreadCounts((current) => ({
        ...current,
        [friend._id]: (current[friend._id] ?? 0) + 1,
      }));
      toast(`New message from ${friend.fullName}`, { icon: "💬" });
    };

    chatClient.on("notification.message_new", handleNotification);
    return () => chatClient.off("notification.message_new", handleNotification);
  }, [chatClient, friends, userId]);

  useEffect(() => {
    if (!chatClient || !selectedFriend || !userId) {
      activeCidRef.current = "";
      return undefined;
    }

    let disposed = false;
    const channelId = getDirectChannelId(userId, selectedFriend._id.toString());
    const channel = chatClient.channel("messaging", channelId, {
      members: [userId, selectedFriend._id.toString()],
    });
    const handleNewMessage = (event) => {
      if (!event.message) return;
      setMessagesState((current) => {
        const currentMessages =
          current.channelId === channelId ? current.messages : [];
        return currentMessages.some((message) => message.id === event.message.id)
          ? current
          : {
              channelId,
              messages: [...currentMessages, event.message],
            };
      });
    };
    const subscription = channel.on("message.new", handleNewMessage);

    let watched = false;
    activeCidRef.current = `messaging:${channelId}`;

    channel
      .watch()
      .then(async () => {
        if (disposed) {
          await channel.stopWatching();
          return;
        }
        watched = true;
        setActiveChannelState({ channelId, channel });
        setMessagesState({
          channelId,
          messages: channel.state.messages,
        });
        setLoadedChannelId(channelId);
        try {
          await channel.markRead();
        } catch (error) {
          console.error("Could not mark chat as read:", error);
        }
      })
      .catch((error) => {
        if (disposed) return;
        console.error("Could not load chat messages:", error);
        setMessageError({
          channelId,
          text: "Could not load this conversation. Please try again.",
        });
        setLoadedChannelId(channelId);
      });

    return () => {
      disposed = true;
      subscription.unsubscribe();
      activeCidRef.current = "";
      if (watched) {
        channel.stopWatching().catch((error) => {
          console.error("Could not stop watching chat channel:", error);
        });
      }
    };
  }, [chatClient, selectedFriend, userId, channelRetry]);

  useEffect(() => {
    messageListRef.current?.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messagesState]);

  const handleSendMessage = async (event) => {
    event.preventDefault();
    const text = messageText.trim();
    if (!text || !activeChannel || sending) return;

    setSending(true);
    setMessageError({ channelId: activeChannelId, text: "" });
    try {
      const response = await activeChannel.sendMessage({ text });
      setMessagesState((current) => {
        const currentMessages =
          current.channelId === activeChannelId ? current.messages : [];
        return currentMessages.some(
          (message) => message.id === response.message.id,
        )
          ? current
          : {
              channelId: activeChannelId,
              messages: [...currentMessages, response.message],
            };
      });
      setMessageText("");
      createMessageNotification(selectedFriend._id).catch((error) => {
        console.error("Could not notify the recipient about this message:", error);
        toast.error("Message sent, but its notification could not be saved.");
      });
    } catch (error) {
      console.error("Could not send chat message:", error);
      setMessageError({
        channelId: activeChannelId,
        text: "Your message could not be sent. Please try again.",
      });
    } finally {
      setSending(false);
    }
  };

  const handleFileSelection = async (event) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !SHARED_FILE_EXTENSIONS.has(extension)) {
      toast.error("Choose an image, document, audio, or video file.");
      return;
    }
    if (file.size > MAX_SHARED_FILE_SIZE) {
      toast.error("Files must be 25 MB or smaller.");
      return;
    }
    if (!activeChannel || channelLoading || uploadingFile) {
      toast.error("The conversation is not ready for file sharing yet.");
      return;
    }

    setUploadingFile(true);
    try {
      const isImage = file.type.startsWith("image/");
      const uploaded = isImage
        ? await activeChannel.sendImage(file, file.name, file.type)
        : await activeChannel.sendFile(file, file.name, file.type);
      const assetUrl = uploaded.file;
      if (!assetUrl) {
        throw new Error("The file upload did not return a download URL.");
      }

      await activeChannel.sendMessage({
        attachments: [
          {
            type: isImage ? "image" : "file",
            asset_url: assetUrl,
            ...(isImage ? { thumb_url: assetUrl } : {}),
            title: file.name,
            file_size: file.size,
            mime_type: file.type,
          },
        ],
      });
      toast.success("File shared");
      createMessageNotification(selectedFriend._id).catch((error) => {
        console.error("Could not notify the recipient about this file:", error);
        toast.error("File shared, but its notification could not be saved.");
      });
    } catch (error) {
      console.error("Could not share file:", error);
      toast.error(
        error.response?.data?.message ||
          "File could not be uploaded. Please try a smaller file.",
      );
    } finally {
      setUploadingFile(false);
    }
  };

  return (
    <main className="chat-page">
      <header className="chat-page-header">
        <Link className="chat-brand" to="/">
          <img src="/logo.png" alt="" />
          <span>VibeTalk</span>
        </Link>
        <Link className="chat-dashboard-link" to="/">
          <ChatIcon name="home" size={18} />
          <span>Back to dashboard</span>
        </Link>
      </header>

      <section
        className={`chat-workspace${mobileChatOpen ? " mobile-chat-open" : ""}`}
        aria-label="Messages"
      >
        <aside className="chat-conversations">
          <div className="chat-conversations-heading">
            <div>
              <p>YOUR COMMUNITY</p>
              <h1>Messages</h1>
            </div>
            <span className="chat-online-indicator">
              <i />
              Live
            </span>
          </div>

          <label className="chat-friend-search">
            <ChatIcon name="search" size={18} />
            <input
              type="search"
              aria-label="Search conversations"
              placeholder="Search conversations"
              value={friendSearch}
              onChange={(event) => setFriendSearch(event.target.value)}
            />
          </label>

          <div className="chat-friend-list">
            {friendsLoading ? (
              <div className="chat-list-state">
                <span className="loading loading-spinner loading-sm" />
                Loading conversations...
              </div>
            ) : friendsError ? (
              <div className="chat-list-state is-error">
                Could not load your connections.
              </div>
            ) : friends.length === 0 ? (
              <div className="chat-list-empty">
                <span className="chat-empty-icon">
                  <ChatIcon name="message" size={22} />
                </span>
                <h2>No conversations yet</h2>
                <p>Add a learning partner to start chatting.</p>
                <Link to="/connections">Find connections</Link>
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="chat-list-state">No conversations found.</div>
            ) : (
              filteredFriends.map((friend) => {
                const isSelected = friend._id?.toString() === activeFriendId;
                const unreadCount = unreadCounts[friend._id] ?? 0;
                return (
                  <button
                    className={`chat-friend${isSelected ? " is-selected" : ""}`}
                    key={friend._id}
                    type="button"
                    onClick={() => {
                      setSelectedFriendId(friend._id.toString());
                      setUnreadCounts((current) => ({
                        ...current,
                        [friend._id]: 0,
                      }));
                      setMobileChatOpen(true);
                    }}
                  >
                    <span className="chat-friend-avatar-wrap">
                      <img src={getAvatar(friend)} alt="" />
                      <i />
                    </span>
                    <span className="chat-friend-copy">
                      <strong>{friend.fullName}</strong>
                      <span>
                        {friend.skill || friend.language || "Learning partner"}
                      </span>
                    </span>
                    {unreadCount > 0 && (
                      <span className="chat-unread-count">{unreadCount}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
          <div className="chat-sidebar-footer">
            <img src={getAvatar(authenticatedUser)} alt="" />
            <div>
              <strong>{authenticatedUser?.fullName || "Your profile"}</strong>
              <span>Available to chat</span>
            </div>
          </div>
        </aside>

        <section className="chat-conversation" aria-label="Selected conversation">
          {connectionError ? (
            <div className="chat-center-state is-error" role="alert">
              <span className="chat-empty-icon">
                <ChatIcon name="message" size={24} />
              </span>
              <h2>Chat is unavailable</h2>
              <p>{connectionError}</p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
            </div>
          ) : !chatClient ? (
            <div className="chat-center-state">
              <span className="loading loading-spinner loading-md" />
              <p>Connecting to chat...</p>
            </div>
          ) : selectedFriend ? (
            <>
              <header className="chat-conversation-header">
                <button
                  type="button"
                  className="chat-mobile-back"
                  aria-label="Back to conversations"
                  onClick={() => setMobileChatOpen(false)}
                >
                  <ChatIcon name="back" />
                </button>
                <img src={getAvatar(selectedFriend)} alt="" />
                <div>
                  <h2>{selectedFriend.fullName}</h2>
                  <p>
                    <i />
                    Learning partner
                  </p>
                </div>
                <div className="chat-header-actions">
                  <Link
                    className="chat-call-action"
                    to={`/call?friend=${encodeURIComponent(selectedFriend._id)}&mode=audio`}
                    aria-label={`Start audio call with ${selectedFriend.fullName}`}
                    title="Audio call"
                  >
                    <ChatIcon name="phone" size={18} />
                  </Link>
                  <Link
                    className="chat-call-action"
                    to={`/call?friend=${encodeURIComponent(selectedFriend._id)}&mode=video`}
                    aria-label={`Start video call with ${selectedFriend.fullName}`}
                    title="Video call"
                  >
                    <ChatIcon name="video" size={18} />
                  </Link>
                  <Link
                    className="chat-header-profile"
                    to="/connections"
                    aria-label="View connections"
                  >
                    <ChatIcon name="more" />
                  </Link>
                </div>
              </header>

              <div className="chat-message-list" ref={messageListRef}>
                <div className="chat-conversation-intro">
                  <img src={getAvatar(selectedFriend)} alt="" />
                  <h3>{selectedFriend.fullName}</h3>
                  <p>
                    This is the beginning of your conversation. Say hello and
                    start learning together!
                  </p>
                </div>

                {channelLoading ? (
                  <div className="chat-messages-loading">
                    <span className="loading loading-spinner loading-sm" />
                    Loading messages...
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwnMessage = message.user?.id === userId;
                    return (
                      <article
                        key={message.id}
                        className={`chat-message-row${isOwnMessage ? " is-own-message" : ""}`}
                      >
                        {!isOwnMessage && (
                          <img
                            className="chat-message-avatar"
                            src={getAvatar(selectedFriend)}
                            alt=""
                          />
                        )}
                        <div className="chat-message-content">
                          {!isOwnMessage && (
                            <span className="chat-message-author">
                              {selectedFriend.fullName}
                            </span>
                          )}
                          {message.text && (
                            <p className="chat-message-bubble">{message.text}</p>
                          )}
                          {message.attachments?.map((attachment, index) => {
                            const fileUrl =
                              attachment.asset_url || attachment.image_url;
                            if (!fileUrl) return null;
                            const isImage =
                              attachment.type === "image" ||
                              attachment.mime_type?.startsWith("image/");
                            const title =
                              attachment.title || "Shared file";

                            return isImage ? (
                              <a
                                className="chat-attachment-image"
                                href={fileUrl}
                                key={`${message.id}-attachment-${index}`}
                                rel="noreferrer"
                                target="_blank"
                              >
                                <img src={fileUrl} alt={title} loading="lazy" />
                              </a>
                            ) : (
                              <a
                                className="chat-file-attachment"
                                href={fileUrl}
                                key={`${message.id}-attachment-${index}`}
                                rel="noreferrer"
                                target="_blank"
                              >
                                <ChatIcon name="file" size={20} />
                                <span>
                                  <strong>{title}</strong>
                                  {attachment.file_size > 0 && (
                                    <small>
                                      {formatFileSize(attachment.file_size)}
                                    </small>
                                  )}
                                </span>
                              </a>
                            );
                          })}
                          <time dateTime={message.created_at}>
                            {formatMessageTime(message.created_at)}
                          </time>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>

              <div className="chat-composer-area">
                {currentMessageError && (
                  <div className="chat-message-error" role="alert">
                    <span>{currentMessageError}</span>
                    <button
                      type="button"
                      onClick={() => setChannelRetry((attempt) => attempt + 1)}
                    >
                      Retry
                    </button>
                  </div>
                )}
                <form className="chat-composer" onSubmit={handleSendMessage}>
                  <input
                    ref={fileInputRef}
                    className="chat-file-input"
                    type="file"
                    accept=".avif,.csv,.doc,.docx,.gif,.jpeg,.jpg,.md,.mp3,.mp4,.mov,.pdf,.png,.ppt,.pptx,.txt,.wav,.webm,.webp,.xls,.xlsx"
                    aria-label="Choose a file to share"
                    onChange={handleFileSelection}
                  />
                  <button
                    className="chat-file-button"
                    type="button"
                    aria-label="Share a file"
                    title="Share a file (25 MB max)"
                    disabled={!activeChannel || channelLoading || uploadingFile}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadingFile ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : (
                      <ChatIcon name="file" size={19} />
                    )}
                  </button>
                  <textarea
                    aria-label="Write a message"
                    placeholder={`Message ${selectedFriend.fullName}...`}
                    value={messageText}
                    rows={1}
                    onChange={(event) => setMessageText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                  />
                  <span className="chat-composer-hint">
                    Enter to send · Shift + Enter for a new line
                  </span>
                  <button
                    className="chat-send-button"
                    type="submit"
                    aria-label="Send message"
                    disabled={
                      !messageText.trim() ||
                      sending ||
                      channelLoading ||
                      !activeChannel
                    }
                  >
                    {sending ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : (
                      <ChatIcon name="send" size={19} />
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="chat-center-state">
              <span className="chat-empty-icon">
                <ChatIcon name="message" size={24} />
              </span>
              <h2>Select a conversation</h2>
              <p>Choose a learning partner to start chatting.</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
};

export default ChatPage;
