import axios from "axios";

// Định nghĩa API URL cơ sở (Dùng biến môi trường Vercel/Vite hoặc localhost)
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Hàm lấy Header xác thực
const getAuthHeader = () => {
  const token = localStorage.getItem("token");

  if (!token) {
    console.warn("⚠️ No token found. User needs to login.");
  }

  return {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
  };
};

// ĐỊNH NGHĨA VÀ EXPORT DỊCH VỤ WORKSPACE DUY NHẤT
export const workspaceService = {
  // Get all workspaces
  getAllWorkspaces: async () => {
    // Sửa endpoint để sử dụng API_URL cơ sở
    const response = await axios.get(`${API_URL}/workspaces`, getAuthHeader());
    return response.data;
  },

  // Get workspace detail
  getWorkspaceDetail: async (workspaceId) => {
    const response = await axios.get(
      `${API_URL}/workspaces/${workspaceId}`,
      getAuthHeader()
    );
    return response.data;
  },

  // Create workspace
  createWorkspace: async (workspaceData) => {
    // Sửa endpoint để sử dụng API_URL cơ sở
    const response = await axios.post(`${API_URL}/workspaces`, workspaceData, getAuthHeader());
    return response.data;
  },

  // Update workspace
  updateWorkspace: async (workspaceId, updateData) => {
    const response = await axios.put(
      `${API_URL}/workspaces/${workspaceId}`,
      updateData,
      getAuthHeader()
    );
    return response.data;
  },

  // Delete workspace
  deleteWorkspace: async (workspaceId) => {
    const response = await axios.delete(
      `${API_URL}/workspaces/${workspaceId}`,
      getAuthHeader()
    );
    return response.data;
  },

  // Invite member
  inviteMember: async (workspaceId, email, role) => {
    const response = await axios.post(
      `${API_URL}/workspaces/${workspaceId}/invite`,
      { email, role },
      getAuthHeader()
    );
    return response.data;
  },

  // Update member role
  updateMemberRole: async (workspaceId, memberId, role) => {
    const response = await axios.put(
      `${API_URL}/workspaces/${workspaceId}/members/${memberId}/role`,
      { role },
      getAuthHeader()
    );
    return response.data;
  },

  // Remove member
  removeMember: async (workspaceId, memberId) => {
    const response = await axios.delete(
      `${API_URL}/workspaces/${workspaceId}/members/${memberId}`,
      getAuthHeader()
    );
    return response.data;
  },

  // Add list
  addList: async (workspaceId, title) => {
    const response = await axios.post(
      `${API_URL}/workspaces/${workspaceId}/lists`,
      { title },
      getAuthHeader()
    );
    return response.data;
  },

  // Add card
  addCard: async (workspaceId, listId, cardData) => {
    // Extract numeric ID if listId is in format "list-123"
    const actualListId = listId.toString().startsWith("list-")
      ? listId.split("-")[1]
      : listId;

    const response = await axios.post(
      `${API_URL}/workspaces/${workspaceId}/lists/${actualListId}/cards`,
      cardData,
      getAuthHeader()
    );
    return response.data;
  },

  // Update list (rename)
  updateList: async (workspaceId, listId, title) => {
    const response = await axios.put(
      `${API_URL}/workspaces/${workspaceId}/lists/${listId}`,
      { title },
      getAuthHeader()
    );
    return response.data;
  },

  // Delete list
  deleteList: async (workspaceId, listId) => {
    const response = await axios.delete(
      `${API_URL}/workspaces/${workspaceId}/lists/${listId}`,
      getAuthHeader()
    );
    return response.data;
  },

  // Update card
  updateCard: async (workspaceId, cardId, cardData) => {
    // Extract numeric ID if cardId is in format "card-123"
    const actualCardId = cardId.toString().startsWith("card-")
      ? cardId.split("-")[1]
      : cardId;

    const response = await axios.put(
      `${API_URL}/workspaces/${workspaceId}/cards/${actualCardId}`,
      cardData,
      getAuthHeader()
    );
    return response.data;
  },

  // Delete card
  deleteCard: async (workspaceId, cardId) => {
    // Extract numeric ID if cardId is in format "card-123"
    const actualCardId = cardId.toString().startsWith("card-")
      ? cardId.split("-")[1]
      : cardId;

    const response = await axios.delete(
      `${API_URL}/workspaces/${workspaceId}/cards/${actualCardId}`,
      getAuthHeader()
    );
    return response.data;
  },

  // Move card between lists
  moveCard: async (workspaceId, cardId, toListId, position) => {
    // Extract numeric IDs
    const actualCardId = cardId.toString().startsWith("card-")
      ? cardId.split("-")[1]
      : cardId;
    const actualListId = toListId.toString().startsWith("list-")
      ? toListId.split("-")[1]
      : toListId;

    const response = await axios.put(
      `${API_URL}/workspaces/${workspaceId}/cards/${actualCardId}/move`,
      { list_id: actualListId, position },
      getAuthHeader()
    );
    return response.data;
  },
};