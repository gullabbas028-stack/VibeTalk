import { axiosInstance } from "./axios"

export const registerUser = async (formData) => {
      const response = await axiosInstance.post("/auth/signup", formData);
      return response.data;
    };

export const loginUser = async (formData) => {
      const response = await axiosInstance.post("/auth/login", formData);
      return response.data;
    };

export const fetchAuthUser = async () => {
      const response = await axiosInstance.get('/auth/me');
      return response.data;
    };

    export const completeOnboarding = async (formData) => {
      const response = await axiosInstance.post('/auth/onboarding', formData);
      return response.data;
    }

    export const fetchRecommendedUsers = async () => {
          const response = await axiosInstance.get("/user");
          return response.data;
        };

    export const fetchMyFriends = async () => {
          const response = await axiosInstance.get("/user/friends");
          return response.data;
        };

    export const fetchChatToken = async () => {
          const response = await axiosInstance.get("/chat/token");
          return response.data;
        };

    export const fetchFriendRequests = async () => {
          const response = await axiosInstance.post("/user/friend-request");
          return response.data;
        };

    export const fetchOutgoingFriendRequests = async () => {
          const response = await axiosInstance.post("/user/friend-request/outgoing");
          return response.data;
        };

    export const acceptFriendRequest = async (requestId) => {
              const response = await axiosInstance.post(
                `/user/friend-request/${requestId}/accept`,
              );
              return response.data;
            };

    export const rejectFriendRequest = async (requestId) => {
              const response = await axiosInstance.post(
                `/user/friend-request/${requestId}/reject`,
              );
              return response.data;
            };

    export const sendFriendRequest = async (userId) => {
          const response = await axiosInstance.post(`/user/friend-request/${userId}`);
          return response.data;
        };

    export const fetchNotifications = async (params) => {
              const response = await axiosInstance.get("/notifications", { params });
              return response.data;
            };

    export const fetchNotificationPreferences = async () => {
              const response = await axiosInstance.get("/notifications/preferences");
              return response.data;
            };

    export const updateNotificationPreferences = async (preferences) => {
              const response = await axiosInstance.patch(
                "/notifications/preferences",
                preferences,
              );
              return response.data;
            };

    export const markNotificationRead = async (notificationId) => {
              const response = await axiosInstance.patch(
                `/notifications/${notificationId}/read`,
              );
              return response.data;
            };

    export const markAllNotificationsRead = async () => {
              const response = await axiosInstance.post("/notifications/read-all");
              return response.data;
            };

    export const deleteNotification = async (notificationId) => {
              const response = await axiosInstance.delete(
                `/notifications/${notificationId}`,
              );
              return response.data;
            };

    export const retryNotificationEmail = async (notificationId) => {
              const response = await axiosInstance.post(
                `/notifications/${notificationId}/retry-email`,
              );
              return response.data;
            };

    export const createMessageNotification = async (recipientId) => {
              const response = await axiosInstance.post("/notifications/message", {
                recipientId,
              });
              return response.data;
            };