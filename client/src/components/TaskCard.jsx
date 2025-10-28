import React from 'react';
import './TaskCard.css';
// --- (CODE MỚI) IMPORT ICON 3 CHẤM ---
import { BsThreeDots, BsGearFill } from 'react-icons/bs';
// --- KẾT THÚC CODE MỚI ---
import attachmentIcon from '../assets/TaskManagement-icon/Icon__Paperclip.svg';
import clockIcon from '../assets/TaskManagement-icon/Icon__Clock.svg';
import flagGreen from '../assets/TaskManagement-icon/Icon__Flag__green.svg';
import flagYellow from '../assets/TaskManagement-icon/Icon__Flag__yellow.svg';
import flagRed from '../assets/TaskManagement-icon/Icon__Flag__red.svg';
import avatarMan from '../assets/TaskManagement-icon/Avatar-man.svg';
import avatarMan2 from '../assets/TaskManagement-icon/Avatar_man2.svg';
import avatarWoman from '../assets/TaskManagement-icon/Avatar__woman.svg';
import defaultAvatar from '../assets/Trangchu/avt.png';

// (ĐÃ SỬA) Nhận thêm prop 'onEditClick'
function TaskCard({ task, isOverlay = false, onEditClick, ...props }) {

  const priorityFlags = {
    low: flagGreen,
    medium: flagYellow,
    high: flagRed,
  };
  
  const avatars = {
    1: avatarMan,
    2: avatarMan2,
    3: avatarWoman
  };

  const priorityKey = task.priority || 'medium';
  const priorityClass = `priority-${priorityKey}`;
  const overlayClass = isOverlay ? 'overlay-style' : '';

  return (
    <div
      className={`task-card ${priorityClass} ${overlayClass}`}
      {...props} // Áp dụng props DND (style, ref)
    >
      <div className="task-header">
        <h4 className="task-title">{task.title}</h4>
        
        {/* --- (CODE MỚI) NÚT BÁNH RĂNG ĐỂ CHỈNH SỬA --- */}
        {/* Chỉ hiển thị nút khi không phải là overlay (đang kéo) */}
        {!isOverlay && (
          <button 
            className="task-edit-btn" 
            title="Chỉnh sửa task"
            // Ngăn sự kiện "pointerdown" (chuột nhấn xuống) lan ra ngoài
            // để DND kit không nhận nhầm đây là sự kiện kéo
            onPointerDownCapture={(e) => e.stopPropagation()}
            onClick={(e) => {
                e.stopPropagation(); // Ngăn click lan ra ngoài
                if (onEditClick) onEditClick(); // Gọi hàm mở modal
            }}
          >
            <BsGearFill /> {/* 👈 SỬA THÀNH ICON BÁNH RĂNG */}
          </button>
        )}
        {/* --- KẾT THÚC CODE MỚI --- */}

      </div>

      {/* ... (Phần còn lại của TaskCard giữ nguyên) ... */}
      
      {task.tags && task.tags.length > 0 && (
        <div className="task-tags-display">
          {task.tags.map((tag, index) => (
            <span key={index} className="task-tag-badge">#{tag}</span>
          ))}
        </div>
      )}
      {task.description && (
        <p className="task-description">{task.description}</p>
      )}
      <div className="task-footer">
        <div className="task-meta">
          {priorityFlags[priorityKey] && (
            <img
              src={priorityFlags[priorityKey]}
              alt={`Priority: ${priorityKey}`}
              className="priority-flag"
            />
          )}
          {task.date && (
            <span className="task-date">
              <img src={clockIcon} alt="Date" className="meta-icon" />
              {task.date}
            </span>
          )}
        </div>
        <div className="task-avatars">
          {/* (Tạm ẩn avatars) */}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;