import React, { useState, useEffect, useRef } from "react";
import "./WorkspaceDetail.css";
import { 
  BsPlus, BsThreeDots, BsPencil, BsTrash, BsCheck, 
  BsPeopleFill, BsStar, BsStarFill, BsArrowLeft,
  BsPersonPlus, BsChatDots, BsClipboardCheck, BsFileText
} from "react-icons/bs";
import { IoMdClose } from "react-icons/io";
import { useParams, useNavigate } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors, // <-- Cần dùng useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { SortableCard } from './SortableCard';
import io from 'socket.io-client';
import { workspaceService } from '../services/workspaceService';

// 🔥 SỬ DỤNG BIẾN MÔI TRƯỜNG MỚI (chỉ URL cơ sở)
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL_BASE || 'http://localhost:5000';

// Droppable List Component
function DroppableList({ list, children }) {
  const { setNodeRef, isOver } = useDroppable({
    id: list.id,
    data: {
      listId: list.id
    }
  });

  return (
    <div 
      ref={setNodeRef} 
      className={`list-cards ${isOver ? 'droppable-over' : ''}`}
    >
      {children}
    </div>
  );
}

function WorkspaceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null); // <-- REF ĐỂ QUẢN LÝ SOCKET

  const [workspace, setWorkspace] = useState(null);

  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddList, setShowAddList] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [newCardTitle, setNewCardTitle] = useState("");
  const [addingCardToList, setAddingCardToList] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  const [lists, setLists] = useState([]);
  const [members, setMembers] = useState([]);
  
  // 🔥 KHAI BÁO VÀ GỌI HOOKS DND BÊN TRONG THÂN COMPONENT
  const dndSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Fetch workspace data VÀ Socket.IO Connection (HỢP NHẤT)
  useEffect(() => {
    // 1. Logic Fetch Data
    const fetchWorkspaceData = async () => {
      try {
        const data = await workspaceService.getWorkspaceDetail(id); 
        setWorkspace(data.workspace);
        setLists(data.lists);
        setMembers(data.members);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching workspace data:', err);
        setWorkspace(null);
        setLoading(false);
        alert(err.response?.data?.message || 'Không thể tải workspace. Vui lòng thử lại.');
      }
    };
    fetchWorkspaceData();
    
    // 2. Logic Socket.IO Connection (Dùng socketRef để tránh lỗi Strict Mode)
    
    // Nếu đã có socket (do chạy Strict Mode), chỉ chạy cleanup giả
    if (socketRef.current) {
        return () => {
            if (socketRef.current) {
                // Không đóng socket ở đây, để tránh lỗi WebSocket closed
            }
        };
    }
    
    // Khởi tạo Socket
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    setSocket(newSocket);
    socketRef.current = newSocket; // <-- LƯU SOCKET VÀO REF

    // Get user info
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : { username: 'Guest' };

    // Join workspace room
    newSocket.emit('join-workspace', {
      workspaceId: id,
      user: {
        id: user.user_id || Date.now(),
        username: user.username,
        avatar: user.avatar_url || '👤'
      }
    });

    // --- LISTENERS (Sử dụng một bộ duy nhất) ---

    // Listen for online users
    newSocket.on('workspace-users', (users) => {
      setOnlineUsers(users);
      console.log('👥 Online users:', users);
    });

    // Listen for list updates
    newSocket.on('list-added', (data) => {
      console.log('📋 New list added:', data);
      if (data.workspaceId === id) {
        setLists(prev => [...prev, data.list]);
      }
    });

    // Listen for card updates
    newSocket.on('card-added', (data) => {
      console.log('🎴 New card added:', data);
      if (data.workspaceId === id) {
        setLists(prev => prev.map(list =>
          list.id === data.listId
            ? { ...list, cards: [...list.cards, data.card] }
            : list
        ));
      }
    });

    // Listen for card moves
    newSocket.on('card-moved', (data) => {
      console.log('🔄 Card moved:', data);
      if (data.workspaceId === id) {
        setLists(data.lists);
      }
    });

    // Listen for list deletions
    newSocket.on('list-deleted', (data) => {
      console.log('🗑️ List deleted:', data);
      if (data.workspaceId === id) {
        setLists(prev => prev.filter(list => list.id !== data.listId));
      }
    });

    // Listen for card deletions
    newSocket.on('card-deleted', (data) => {
      console.log('🗑️ Card deleted:', data);
      if (data.workspaceId === id) {
        setLists(prev => prev.map(list =>
          list.id === data.listId
            ? { ...list, cards: list.cards.filter(card => card.id !== data.cardId) }
            : list
        ));
      }
    });
    
    // ✅ Listen for list updates
    newSocket.on('list-updated', (data) => {
      console.log('✏️ List updated:', data);
      if (data.workspaceId === id) {
        setLists(prev => prev.map(list =>
          list.id === data.listId
            ? { ...list, title: data.title }
            : list
        ));
      }
    });

    // ✅ Listen for card updates
    newSocket.on('card-updated', (data) => {
      console.log('✏️ Card updated:', data);
      if (data.workspaceId === id) {
        setLists(prev => prev.map(list => ({
          ...list,
          cards: list.cards.map(card =>
            card.id === data.cardId ? { ...card, ...data.cardData } : card
          )
        })));
      }
    });
    // --- KẾT THÚC LISTENERS ---
    
    // Cleanup THẬT
    return () => {
      if (socketRef.current) {
          socketRef.current.emit('leave-workspace', { workspaceId: id });
          newSocket.close(); // Dùng newSocket
          socketRef.current = null; // Xóa ref
      }
    };
  }, [id]);

  // Drag and Drop Handler
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over) return;

    // Get source list ID
    const activeListId = active.data.current?.listId;
    if (!activeListId) return;

    // Determine target list ID
    let overListId = over.data.current?.listId;
    
    // If over.id is a list ID (dropping on empty area), use it directly
    if (!overListId && lists.find(list => list.id === over.id)) {
      overListId = over.id;
    }

    if (!overListId) return;

    const activeList = lists.find(list => list.id === activeListId);
    const overList = lists.find(list => list.id === overListId);

    if (!activeList || !overList) return;

    const activeCard = activeList.cards.find(card => card.id === active.id);
    if (!activeCard) return;

    if (activeListId === overListId) {
      // Same list - reorder cards
      const oldIndex = activeList.cards.findIndex(card => card.id === active.id);
      let newIndex;

      if (over.id === overListId) {
        // Dropped on empty area - move to end
        newIndex = activeList.cards.length - 1;
      } else {
        // Dropped on another card
        newIndex = overList.cards.findIndex(card => card.id === over.id);
      }

      if (oldIndex === newIndex) return;

      const newCards = arrayMove(activeList.cards, oldIndex, newIndex);
      
      const newLists = lists.map(list =>
        list.id === activeListId ? { ...list, cards: newCards } : list
      );

      setLists(newLists);

      // Emit socket event
      if (socket) {
        socket.emit('move-card', {
          workspaceId: id,
          lists: newLists,
          cardId: active.id,
          fromListId: activeListId,
          toListId: overListId,
          position: newIndex
        });
      }
    } else {
      // Different lists - move card between lists
      const activeCards = activeList.cards.filter(card => card.id !== active.id);
      let insertIndex;

      if (over.id === overListId) {
        // Dropped on empty list area - add to end
        insertIndex = overList.cards.length;
      } else {
        // Dropped on a card in target list
        insertIndex = overList.cards.findIndex(card => card.id === over.id);
      }
      
      const newOverCards = [...overList.cards];
      newOverCards.splice(insertIndex, 0, activeCard);

      const newLists = lists.map(list => {
        if (list.id === activeListId) return { ...list, cards: activeCards };
        if (list.id === overListId) return { ...list, cards: newOverCards };
        return list;
      });

      setLists(newLists);

      // Emit socket event
      if (socket) {
        socket.emit('move-card', {
          workspaceId: id,
          lists: newLists,
          cardId: active.id,
          fromListId: activeListId,
          toListId: overListId,
          position: insertIndex
        });
      }
    }
  };

  const handleAddList = async () => {
    if (!newListTitle.trim()) return;

    try {
      const newList = await workspaceService.addList(id, newListTitle);
      setLists(prev => [...prev, newList]);
      setNewListTitle("");
      setShowAddList(false);

      // Emit socket event
      if (socket) {
        // Gửi thông tin list mới tạo đến server để broadcast cho các client khác
        socket.emit('add-list', {
          workspaceId: id,
          list: newList
        });
      }
    } catch (err) {
      console.error('Error adding list:', err);
      alert('Không thể thêm list. Vui lòng thử lại.');
    }
  };

  const handleAddCard = async (listId) => {
    if (!newCardTitle.trim()) return;

    try {
      const newCard = await workspaceService.addCard(id, listId, {
        title: newCardTitle,
        priority: "medium"
      });

      setLists(lists.map(list =>
        list.id === listId
          ? { ...list, cards: [...list.cards, newCard] }
          : list
      ));

      setNewCardTitle("");
      setAddingCardToList(null);

      // Emit socket event
      if (socket) {
        socket.emit('add-card', {
          workspaceId: id,
          listId: listId,
          card: newCard
        });
      }
    } catch (err) {
      console.error('Error adding card:', err);
      alert('Không thể thêm card. Vui lòng thử lại.');
    }
  };

  const toggleStar = async () => {
    try {
      await workspaceService.updateWorkspace(id, { starred: !workspace.starred });
      setWorkspace({ ...workspace, starred: !workspace.starred });
    } catch (err) {
      console.error('Error toggling star:', err);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return;
    
    try {
      const result = await workspaceService.inviteMember(id, inviteEmail, inviteRole);
      setMembers([...members, result.member]);
      alert(`Đã gửi lời mời đến ${inviteEmail} với vai trò ${inviteRole}`);
      
      setInviteEmail("");
      setInviteRole("member");
      setShowAddMember(false);
    } catch (err) {
      console.error('Error inviting member:', err);
      alert(err.response?.data?.error || 'Không thể mời thành viên. Vui lòng thử lại.');
    }
  };

  const handleChangeRole = async (memberId, newRole) => {
    try {
      await workspaceService.updateMemberRole(id, memberId, newRole);
      setMembers(members.map(m => 
        m.id === memberId ? { ...m, role: newRole } : m
      ));
      alert(`Đã thay đổi vai trò thành ${newRole}`);
    } catch (err) {
      console.error('Error changing role:', err);
      alert('Không thể thay đổi vai trò. Vui lòng thử lại.');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (window.confirm("Bạn có chắc muốn xóa thành viên này?")) {
      try {
        await workspaceService.removeMember(id, memberId);
        setMembers(members.filter(m => m.id !== memberId));
        alert("Đã xóa thành viên");
      } catch (err) {
        console.error('Error removing member:', err);
        alert('Không thể xóa thành viên. Vui lòng thử lại.');
      }
    }
  };

  // ✅ CHỈNH SỬA LIST (RENAME)
  const [editingListId, setEditingListId] = useState(null);
  const [editingListTitle, setEditingListTitle] = useState("");

  const handleStartEditList = (list) => {
    setEditingListId(list.id);
    setEditingListTitle(list.title);
  };

  const handleSaveListTitle = async (listId) => {
    if (!editingListTitle.trim()) {
      alert("Tên list không được để trống");
      return;
    }

    try {
      await workspaceService.updateList(id, listId, editingListTitle);
      setLists(lists.map(list =>
        list.id === listId ? { ...list, title: editingListTitle } : list
      ));
      setEditingListId(null);
      setEditingListTitle("");

      // Emit socket event
      if (socket) {
        socket.emit('update-list', {
          workspaceId: id,
          listId: listId,
          title: editingListTitle
        });
      }
    } catch (err) {
      console.error('Error updating list:', err);
      alert('Không thể cập nhật list. Vui lòng thử lại.');
    }
  };

  const handleCancelEditList = () => {
    setEditingListId(null);
    setEditingListTitle("");
  };

  // ✅ XÓA LIST
  const handleDeleteList = async (listId) => {
    if (!window.confirm("Bạn có chắc muốn xóa list này? Tất cả card trong list sẽ bị xóa.")) {
      return;
    }

    try {
      await workspaceService.deleteList(id, listId);
      setLists(lists.filter(list => list.id !== listId));

      // Emit socket event
      if (socket) {
        socket.emit('delete-list', {
          workspaceId: id,
          listId: listId
        });
      }
    } catch (err) {
      console.error('Error deleting list:', err);
      alert(err.response?.data?.error || 'Không thể xóa list. Vui lòng thử lại.');
    }
  };

  // ✅ CHỈNH SỬA CARD
  const [editingCardId, setEditingCardId] = useState(null);
  const [editCardData, setEditCardData] = useState({
    title: "",
    description: "",
    priority: "medium"
  });

  const handleStartEditCard = (card) => {
    setEditingCardId(card.id);
    setEditCardData({
      title: card.title,
      description: card.description || "",
      priority: card.priority || "medium"
    });
  };

  const handleSaveCard = async (cardId) => {
    if (!editCardData.title.trim()) {
      alert("Tên card không được để trống");
      return;
    }

    console.log('🔧 Updating card:', cardId, editCardData);

    try {
      const result = await workspaceService.updateCard(id, cardId, editCardData);
      console.log('✅ Card updated:', result);
      
      // Update lists with new card data
      setLists(lists.map(list => ({
        ...list,
        cards: list.cards.map(card =>
          card.id === cardId ? { ...card, ...result.card } : card
        )
      })));

      setEditingCardId(null);

      // Emit socket event
      if (socket) {
        socket.emit('update-card', {
          workspaceId: id,
          cardId: cardId,
          cardData: result.card
        });
      }
    } catch (err) {
      console.error('❌ Error updating card:', err);
      alert(err.response?.data?.error || 'Không thể cập nhật card. Vui lòng thử lại.');
    }
  };

  const handleCancelEditCard = () => {
    setEditingCardId(null);
    setEditCardData({ title: "", description: "", priority: "medium" });
  };

  // ✅ XÓA CARD
  const handleDeleteCard = async (listId, cardId) => {
    console.log('🗑️ Deleting card:', cardId, 'from list:', listId);
    
    if (!window.confirm("Bạn có chắc muốn xóa card này?")) {
      return;
    }

    try {
      await workspaceService.deleteCard(id, cardId);
      console.log('✅ Card deleted successfully');
      
      // Update lists by removing the card
      setLists(lists.map(list =>
        list.id === listId
          ? { ...list, cards: list.cards.filter(card => card.id !== cardId) }
          : list
      ));

      // Emit socket event
      if (socket) {
        socket.emit('delete-card', {
          workspaceId: id,
          listId: listId,
          cardId: cardId
        });
      }
    } catch (err) {
      console.error('❌ Error deleting card:', err);
      console.error('Error details:', err.response?.data);
      alert(err.response?.data?.error || 'Không thể xóa card. Vui lòng thử lại.');
    }
  };

  if (loading) {
    return (
      <div className="workspace-detail-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Đang tải workspace...</p>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="workspace-detail-container">
        <div className="error-state">
          <p>Workspace không tồn tại</p>
          <button onClick={() => navigate('/workspaces')} className="retry-btn">
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-detail-container">
      {/* Header */}
      <div className="workspace-detail-header">
        <div className="header-left-section">
          <button className="back-btn" onClick={() => navigate("/workspaces")}>
            <BsArrowLeft /> Quay lại
          </button>
          <div className="workspace-info">
            <div className="workspace-icon-small" style={{ backgroundColor: workspace.color }}>
              {workspace.icon}
            </div>
            <div>
              <h1>{workspace.name}</h1>
              <p>{workspace.description}</p>
            </div>
          </div>
        </div>

        <div className="header-actions">
          <button className="star-btn-header" onClick={toggleStar}>
            {workspace.starred ? <BsStarFill /> : <BsStar />}
          </button>
          
          {/* Online Users Indicator */}
          {onlineUsers.length > 0 && (
            <div className="online-users-indicator">
              <div className="online-avatars">
                {onlineUsers.slice(0, 3).map((user, index) => (
                  <div 
                    key={user.id} 
                    className="online-avatar"
                    style={{ zIndex: onlineUsers.length - index }}
                    title={user.username}
                  >
                    {user.avatar}
                  </div>
                ))}
                {onlineUsers.length > 3 && (
                  <div className="online-count">+{onlineUsers.length - 3}</div>
                )}
              </div>
              <span className="online-text">{onlineUsers.length} online</span>
            </div>
          )}

          <button className="members-btn" onClick={() => setShowMembersModal(true)}>
            <BsPeopleFill /> {members.length} Members
          </button>
          <button className="menu-btn-header">
            <BsThreeDots />
          </button>
        </div>
      </div>

      {/* Board Area */}
      <DndContext
        sensors={dndSensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="board-lists">
          {lists.map((list) => (
            <div key={list.id} className="board-list">
              <div className="list-header">
                <h3>{list.title}</h3>
                <div className="list-actions">
                  <span className="card-count">{list.cards.length}</span>
                </div>
              </div>

              <SortableContext
                items={list.cards.map(card => card.id)}
                strategy={verticalListSortingStrategy}
              >
                <DroppableList list={list}>
                  {list.cards.map((card) => (
                    editingCardId === card.id ? (
                      <div key={card.id} className="edit-card-form">
                        <input
                          type="text"
                          placeholder="Tiêu đề card..."
                          value={editCardData.title}
                          onChange={(e) => setEditCardData({ ...editCardData, title: e.target.value })}
                        />
                        <textarea
                          placeholder="Mô tả..."
                          value={editCardData.description}
                          onChange={(e) => setEditCardData({ ...editCardData, description: e.target.value })}
                          rows="3"
                        />
                        <select
                          value={editCardData.priority}
                          onChange={(e) => setEditCardData({ ...editCardData, priority: e.target.value })}
                        >
                          <option value="low">Thấp</option>
                          <option value="medium">Trung bình</option>
                          <option value="high">Cao</option>
                        </select>
                        <div className="edit-card-actions">
                          <button onClick={() => handleSaveCard(card.id)}>
                            <BsCheck /> Lưu
                          </button>
                          <button onClick={handleCancelEditCard}>
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div key={card.id} className="card-wrapper">
                        <SortableCard card={card} listId={list.id} />
                        <div className="card-hover-actions">
                          <button 
                            className="card-edit-btn" 
                            onClick={() => handleStartEditCard(card)}
                            title="Chỉnh sửa"
                          >
                            <BsPencil />
                          </button>
                          <button 
                            className="card-delete-btn" 
                            onClick={() => handleDeleteCard(list.id, card.id)}
                            title="Xóa"
                          >
                            <BsTrash />
                          </button>
                        </div>
                      </div>
                    )
                  ))}
                  {list.cards.length === 0 && (
                    <div className="empty-list-placeholder">
                      Kéo thẻ vào đây
                    </div>
                  )}
                </DroppableList>
              </SortableContext>

              {addingCardToList === list.id ? (
                <div className="add-card-form">
                  <input
                    type="text"
                    placeholder="Nhập tiêu đề card..."
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCard(list.id)}
                    autoFocus
                  />
                  <div className="form-actions">
                    <button onClick={() => handleAddCard(list.id)}>
                      <BsCheck /> Thêm
                    </button>
                    <button onClick={() => setAddingCardToList(null)}>
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="add-card-btn"
                  onClick={() => setAddingCardToList(list.id)}
                >
                  <BsPlus /> Thêm thẻ
                </button>
              )}
            </div>
          ))}

          {/* Add List Button */}
          {showAddList ? (
            <div className="add-list-form">
              <input
                type="text"
                placeholder="Nhập tiêu đề danh sách..."
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddList()}
                autoFocus
              />
              <div className="form-actions">
                <button onClick={handleAddList}>
                  <BsCheck /> Thêm
                </button>
                <button onClick={() => setShowAddList(false)}>
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            <button
              className="add-list-btn"
              onClick={() => setShowAddList(true)}
            >
              <BsPlus /> Thêm danh sách
            </button>
          )}
        </div>
      </DndContext>

      {/* Members Management Modal */}
      {showMembersModal && (
        <div className="modal-overlay" onClick={() => setShowMembersModal(false)}>
          <div className="members-management-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><BsPeopleFill /> Quản lý thành viên</h2>
              <button className="close-modal-btn" onClick={() => setShowMembersModal(false)}>
                <IoMdClose />
              </button>
            </div>

            <div className="modal-content">
              {/* Invite Section */}
              <div className="invite-section">
                <h3>Mời thành viên mới</h3>
                <div className="invite-form">
                  <input
                    type="email"
                    placeholder="Nhập email..."
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="email-input"
                  />
                  <select 
                    value={inviteRole} 
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="role-select"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button onClick={handleInviteMember} className="invite-btn">
                    Gửi lời mời
                  </button>
                </div>
                <p className="invite-hint">💡 Thành viên sẽ nhận email với link tham gia workspace</p>
              </div>

              {/* Members List */}
              <div className="members-section">
                <h3>Danh sách thành viên ({members.length})</h3>
                <div className="members-table">
                  <div className="table-header">
                    <div className="col-member">Thành viên</div>
                    <div className="col-email">Email</div>
                    <div className="col-role">Vai trò</div>
                    <div className="col-joined">Tham gia</div>
                    <div className="col-actions">Thao tác</div>
                  </div>
                  
                  {members.map(member => (
                    <div key={member.id} className="table-row">
                      <div className="col-member">
                        <div className="member-avatar-small">{member.avatar}</div>
                        <span className="member-name">{member.name}</span>
                      </div>
                      <div className="col-email">{member.email}</div>
                      <div className="col-role">
                        {member.role === "owner" ? (
                          <span className="role-badge owner">Owner</span>
                        ) : (
                          <select 
                            value={member.role}
                            onChange={(e) => handleChangeRole(member.id, e.target.value)}
                            className="role-select-inline"
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </div>
                      <div className="col-joined">{member.joinedDate}</div>
                      <div className="col-actions">
                        {member.role !== "owner" && (
                          <button 
                            onClick={() => handleRemoveMember(member.id)}
                            className="remove-member-btn"
                            title="Xóa thành viên"
                          >
                            <BsTrash />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Role Permissions Info */}
              <div className="permissions-info">
                <h3>Phân quyền vai trò</h3>
                <div className="permissions-grid">
                  <div className="permission-card">
                    <div className="permission-title">👑 Owner</div>
                    <ul>
                      <li>✅ Toàn quyền quản lý workspace</li>
                      <li>✅ Xóa workspace</li>
                      <li>✅ Thêm/xóa thành viên</li>
                      <li>✅ Thay đổi vai trò</li>
                      <li>✅ Chỉnh sửa cài đặt</li>
                    </ul>
                  </div>
                  <div className="permission-card">
                    <div className="permission-title">⚙️ Admin</div>
                    <ul>
                      <li>✅ Thêm/xóa thành viên</li>
                      <li>✅ Quản lý tasks/notes</li>
                      <li>✅ Tạo/xóa lists</li>
                      <li>❌ Không thể xóa workspace</li>
                      <li>❌ Không thể thay đổi owner</li>
                    </ul>
                  </div>
                  <div className="permission-card">
                    <div className="permission-title">👤 Member</div>
                    <ul>
                      <li>✅ Xem nội dung workspace</li>
                      <li>✅ Tạo/sửa tasks của mình</li>
                      <li>✅ Thêm notes</li>
                      <li>❌ Không thể xóa lists</li>
                      <li>❌ Không thể quản lý thành viên</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Members Panel (Optional) */}
      {showAddMember && (
        <div className="modal-overlay" onClick={() => setShowAddMember(false)}>
          <div className="members-panel" onClick={(e) => e.stopPropagation()}>
            <h3><BsPeopleFill /> Thành viên ({members.length})</h3>
            <div className="members-list">
              {members.map(member => (
                <div key={member.id} className="member-item">
                  <div className="member-avatar">{member.avatar}</div>
                  <div className="member-info">
                    <div className="member-name">{member.name}</div>
                    <div className="member-role">{member.role}</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="add-member-btn">
              <BsPersonPlus /> Mời thành viên
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkspaceDetail;
