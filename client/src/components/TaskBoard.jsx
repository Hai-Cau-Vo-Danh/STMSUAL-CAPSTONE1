import React, { useState, useEffect } from 'react';
import TaskCard from './TaskCard';
import './TaskBoard.css';
import { BsPlus, BsThreeDots, BsSearch, BsTag } from 'react-icons/bs';
import { IoClose, IoSparkles } from 'react-icons/io5';

// Imports từ @dnd-kit
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


// Component bọc TaskCard
const SortableTaskItem = ({ task, openEditModal }) => { // 👈 Nhận openEditModal
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    const displayDate = task.deadline ? new Date(task.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '';

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners} // 👈 Gắn listeners (kéo) vào wrapper
            className="draggable-task-wrapper"
            // Bỏ onDoubleClick
        >
            {/* (ĐÃ SỬA) Truyền onEditClick vào TaskCard */}
            <TaskCard 
                task={{ ...task, date: displayDate }} 
                onEditClick={() => openEditModal(task)} // 👈 Truyền hàm
            />
        </div>
    );
};


// Component Cột
const TaskColumn = ({ columnId, title, tasksCount, tasks, openCreateModal, openEditModal }) => { // 👈 Nhận openEditModal
    return (
        <div className="task-column">
            <div className="column-header">
                <div className="column-title-wrapper">
                    <h3 className="column-title">{title}</h3>
                    <span className="column-count">{tasksCount}</span>
                </div>
                <div className="column-actions">
                    <button className="column-btn add-btn" onClick={() => openCreateModal(columnId)} title="Thêm CV"> <BsPlus /> </button>
                    <button className="column-btn menu-btn"> <BsThreeDots /> </button>
                </div>
            </div>
            <div className="column-content">
                <SortableContext
                    items={tasks.map(task => task.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {tasks.map((task) => (
                        // --- (ĐÃ SỬA) TRUYỀN ĐÚNG HÀM openEditModal ---
                        <SortableTaskItem key={task.id} task={task} openEditModal={openEditModal} />
                        // --- KẾT THÚC SỬA ---
                    ))}
                </SortableContext>
            </div>
            <button className="add-task-btn-in-column" onClick={() => openCreateModal(columnId)}> + Thêm công việc </button>
        </div>
    );
};



const TaskBoard = () => {
    // States
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [selectedColumn, setSelectedColumn] = useState('todo');
    const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
    const [currentTag, setCurrentTag] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [columns, setColumns] = useState({});
    const [activeTask, setActiveTask] = useState(null);

    const [newTask, setNewTask] = useState({
        title: '', description: '', priority: 'medium', deadline: '', tags: []
    });

    const getUserId = () => {
        try { const u = localStorage.getItem("user"); return u ? JSON.parse(u)?.user_id : null; }
        catch (e) { console.error("Lỗi user ID:", e); return null; }
    };

    // Hàm fetchTasks (đã sửa)
    const fetchTasks = async () => {
        setIsLoading(true);
        setError(null);
        const userId = getUserId();
        if (!userId) {
            setError("Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.");
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/tasks?userId=${userId}`);
            if (!response.ok) {
                 if (response.status === 404) throw new Error(`API /api/tasks không tồn tại (404).`);
                 if (response.status === 500) throw new Error(`Lỗi 500. Kiểm tra terminal backend (lỗi CSDL?).`);
                 throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!Array.isArray(data)) {
                console.error("API /api/tasks không trả về mảng (Array). Dữ liệu:", data);
                throw new Error("Dữ liệu nhận được từ server không đúng định dạng (không phải mảng).");
            }

            const columnsObject = data.reduce((acc, col) => {
                if (col && col.id) {
                     acc[col.id] = { ...col, tasks: col.tasks || [] };
                }
                return acc;
            }, {}); 

            // Đảm bảo tất cả các cột đều tồn tại
            const allColumnIds = ['todo', 'review', 'done']; // Các cột bạn muốn hiển thị
            const finalizedColumns = {};
            
            const titleMap = { 
                'todo': columnsObject['todo']?.title || 'To Do', 
                'review': columnsObject['review']?.title || 'In Review', 
                'done': columnsObject['done']?.title || 'Done' 
            };
            
            allColumnIds.forEach(id => {
                finalizedColumns[id] = {
                    id: id,
                    title: titleMap[id],
                    tasks: columnsObject[id]?.tasks || [],
                    count: columnsObject[id]?.count || 0
                };
            });

            setColumns(finalizedColumns);

        } catch (err) {
            setError(`Không thể tải công việc: ${err.message}`);
            console.error("Fetch error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch Tasks khi component mount
    useEffect(() => {
        fetchTasks();
    }, []); // Chỉ chạy 1 lần khi mount


    // Natural Language Parsing (Giữ nguyên)
    const parseNaturalLanguage = (input) => { /* ... giữ nguyên code parse ... */
        const parsed = { title: input, priority: 'medium', deadline: '', tags: [] };
        if (input.toLowerCase().includes('khẩn cấp') || input.toLowerCase().includes('urgent') || input.toLowerCase().includes('cao')) { parsed.priority = 'high'; }
        else if (input.toLowerCase().includes('trung bình') || input.toLowerCase().includes('medium')) { parsed.priority = 'medium'; }
        else if (input.toLowerCase().includes('thấp') || input.toLowerCase().includes('low')) { parsed.priority = 'low'; }
        const datePatterns = [ { pattern: /hôm nay|today/i, value: new Date().toISOString().split('T')[0] }, { pattern: /ngày mai|mai|tomorrow/i, value: new Date(Date.now() + 86400000).toISOString().split('T')[0] }, { pattern: /(\d{1,2})\/(\d{1,2})(?:\/(\d{4}|\d{2}))?/i, value: (match) => { return ''; } } ];
         for (const { pattern, value } of datePatterns) { const match = input.match(pattern); if (match) { parsed.deadline = typeof value === 'function' ? value(match) : value; break; } }
        const tagMatches = input.match(/#[\w\u00C0-\u024F\u1E00-\u1EFF]+/g); if (tagMatches) { parsed.tags = tagMatches.map(tag => tag.substring(1)); }
        let cleanTitle = input; if (parsed.tags.length > 0) { parsed.tags.forEach(tag => { cleanTitle = cleanTitle.replace(`#${tag}`, ''); }); }
        ['khẩn cấp', 'urgent', 'cao', 'trung bình', 'medium', 'thấp', 'low', 'hôm nay', 'ngày mai'].forEach(keyword => { cleanTitle = cleanTitle.replace(new RegExp(keyword, 'gi'), ''); });
        parsed.title = cleanTitle.trim(); return parsed;
    };


    // --- (HÀM DND) ---
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function findColumnContainingTask(taskId) {
        if (!taskId || !columns) return undefined;
        return Object.keys(columns).find(columnId =>
            columns[columnId] && columns[columnId].tasks.some(task => task.id === taskId)
        );
    }

    function handleDragStart(event) {
        const { active } = event;
        const taskId = active.id;
        const columnId = findColumnContainingTask(taskId);
        if (columnId) {
            setActiveTask(columns[columnId].tasks.find(task => task.id === taskId));
        }
    }

    function handleDragOver(event) {
        const { active, over } = event;
        const activeId = active.id;
        const overId = over?.id;

        if (!overId || !columns) return;
        
        const activeColumnId = findColumnContainingTask(activeId);
        const overColumnId = columns[overId] ? overId : findColumnContainingTask(overId);

        if (!activeColumnId || !overColumnId || activeColumnId === overColumnId) {
            return;
        }

        setColumns((prev) => {
            const activeItems = prev[activeColumnId]?.tasks || [];
            const overItems = prev[overColumnId]?.tasks || [];
            const activeIndex = activeItems.findIndex((task) => task.id === activeId);
            let overIndex = overItems.findIndex((task) => task.id === overId);

            if (activeIndex === -1) return prev;

            let newIndex;
            if (columns[overId]) { 
                 newIndex = overItems.length;
            } else {
                newIndex = overIndex >= 0 ? overIndex : overItems.length;
            }

            const nextColumns = JSON.parse(JSON.stringify(prev));
            const [draggedTask] = nextColumns[activeColumnId].tasks.splice(activeIndex, 1);
            if (!draggedTask) return prev;
            
            draggedTask.status = overColumnId; 
            nextColumns[overColumnId].tasks.splice(newIndex, 0, draggedTask);
            
            nextColumns[activeColumnId].count = nextColumns[activeColumnId].tasks.length;
            nextColumns[overColumnId].count = nextColumns[overColumnId].tasks.length;
            
            return nextColumns;
        });
    }

    async function handleDragEnd(event) {
        const { active, over } = event;
        const activeId = active.id;
        const overId = over?.id;

        setActiveTask(null);

        if (!overId || !columns) return;

        const activeColumnId = findColumnContainingTask(activeId);
        const overColumnId = columns[overId] ? overId : findColumnContainingTask(overId);

        if (!activeColumnId || !overColumnId) return;
        
        const originalColumns = JSON.parse(JSON.stringify(columns)); 

        if (activeColumnId === overColumnId) {
            const column = columns[activeColumnId];
            const oldIndex = column.tasks.findIndex(task => task.id === activeId);
            let newIndex = column.tasks.findIndex(task => task.id === overId); 
            
            if (newIndex === -1) { 
                 if (overId === activeColumnId) {
                     newIndex = column.tasks.length - 1;
                 } else {
                     return;
                 }
            }
            
            if (oldIndex === newIndex) return;

            setColumns((prev) => {
                const updatedTasks = arrayMove(prev[activeColumnId].tasks, oldIndex, newIndex);
                return {
                    ...prev,
                    [activeColumnId]: { ...prev[activeColumnId], tasks: updatedTasks }
                };
            });
            return;
        }

        // DI CHUYỂN SANG CỘT KHÁC
        const userId = getUserId();
        if (!userId) { alert("Lỗi User ID!"); setColumns(originalColumns); return; }

        try {
            const response = await fetch(`http://localhost:5000/api/tasks/${activeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, status: overColumnId })
            });
            if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || 'Lỗi server'); }
            console.log(`Task ${activeId} status updated successfully`);

        } catch (err) {
            setError(`Lỗi cập nhật status: ${err.message}`);
            alert(`Lỗi cập nhật status: ${err.message}`);
            fetchTasks(); // Rollback
        }
    }
    // --- KẾT THÚC HÀM DND ---


    // (Các hàm CRUD: handleQuickCreate, ..., openEditModal giữ nguyên)
    const handleQuickCreate = async () => { /* ... giữ nguyên ... */
        if (!naturalLanguageInput.trim()) return; const userId = getUserId(); if (!userId) { alert("..."); return; } const parsed = parseNaturalLanguage(naturalLanguageInput); const taskData = { creator_id: userId, title: parsed.title, priority: parsed.priority, deadline: parsed.deadline || null, status: selectedColumn }; setIsLoading(true); setError(null); try { const response = await fetch('http://localhost:5000/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(taskData) }); const createdTask = await response.json(); if (!response.ok) throw new Error(createdTask.message || 'Lỗi'); setColumns(prev => { const t = createdTask.status || selectedColumn; if (!prev[t]) return prev; const n = { ...createdTask }; const u = [n, ...(prev[t].tasks || [])]; return { ...prev, [t]: { ...prev[t], tasks: u, count: u.length } }; }); setNaturalLanguageInput(''); setShowCreateModal(false); } catch (err) { setError(`Lỗi: ${err.message}`); alert(`Lỗi: ${err.message}`); } finally { setIsLoading(false); }
    };
    const handleCreateTask = async () => { /* ... giữ nguyên ... */
        if (!newTask.title.trim()) return; const userId = getUserId(); if (!userId) { alert("..."); return; } const taskData = { creator_id: userId, title: newTask.title, description: newTask.description || null, priority: newTask.priority, deadline: newTask.deadline || null, status: selectedColumn }; setIsLoading(true); setError(null); try { const response = await fetch('http://localhost:5000/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(taskData) }); const createdTask = await response.json(); if (!response.ok) throw new Error(createdTask.message || 'Lỗi'); setColumns(prev => { const t = createdTask.status || selectedColumn; if (!prev[t]) return prev; const n = { ...createdTask }; const u = [n, ...(prev[t].tasks || [])]; return { ...prev, [t]: { ...prev[t], tasks: u, count: u.length } }; }); setNewTask({ title: '', description: '', priority: 'medium', deadline: '', tags: [] }); setCurrentTag(''); setShowCreateModal(false); } catch (err) { setError(`Lỗi: ${err.message}`); alert(`Lỗi: ${err.message}`); } finally { setIsLoading(false); }
     };
    const handleEditTask = async () => { /* ... giữ nguyên ... */
        if (!editingTask || !editingTask.title.trim()) return; const userId = getUserId(); if (!userId) { alert("..."); return; } const deadlineToSend = editingTask.deadline || null; const updateData = { user_id: userId, title: editingTask.title, description: editingTask.description || null, priority: editingTask.priority, deadline: deadlineToSend, status: editingTask.status }; setIsLoading(true); setError(null); try { const response = await fetch(`http://localhost:5000/api/tasks/${editingTask.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updateData) }); const updatedTask = await response.json(); if (!response.ok) throw new Error(updatedTask.message || 'Lỗi'); setColumns(prev => { const n = { ...prev }; let colChanged = false; let oldColId; for (const c in n) { const taskIndex = n[c].tasks.findIndex(t => t.id === updatedTask.id); if (taskIndex !== -1) { oldColId = c; if (c !== updatedTask.status) { colChanged = true; n[c].tasks.splice(taskIndex, 1); n[c].count = n[c].tasks.length; } else { n[c].tasks[taskIndex] = { ...updatedTask }; } break; } } if (colChanged && n[updatedTask.status]) { n[updatedTask.status].tasks.unshift({ ...updatedTask }); n[updatedTask.status].count = n[updatedTask.status].tasks.length; } return n; }); setShowEditModal(false); setEditingTask(null); setCurrentTag(''); } catch (err) { setError(`Lỗi: ${err.message}`); alert(`Lỗi: ${err.message}`); } finally { setIsLoading(false); }
     };
    const handleDeleteTask = async (taskId) => { /* ... giữ nguyên ... */
        if (!window.confirm("Bạn chắc chắn muốn xóa?")) return; const userId = getUserId(); if (!userId) { alert("..."); return; } setIsLoading(true); setError(null); try { const response = await fetch(`http://localhost:5000/api/tasks/${taskId}?userId=${userId}`, { method: 'DELETE' }); const data = await response.json(); if (!response.ok) throw new Error(data.message || 'Lỗi'); setColumns(prev => { const n = { ...prev }; for (const c in n) { const tasksBefore = n[c].tasks.length; n[c].tasks = n[c].tasks.filter(t => t.id !== taskId); if (tasksBefore > n[c].tasks.length) { n[c].count = n[c].tasks.length; } } return n; }); setShowEditModal(false); setEditingTask(null); } catch (err) { setError(`Lỗi: ${err.message}`); alert(`Lỗi: ${err.message}`); } finally { setIsLoading(false); }
     };
    const handleAddTag = (isEdit = false) => { /* ... giữ nguyên ... */ if (currentTag.trim()) { if (isEdit && editingTask) { setEditingTask({ ...editingTask, tags: [...(editingTask.tags || []), currentTag.trim()] }); } else { setNewTask({ ...newTask, tags: [...(newTask.tags || []), currentTag.trim()] }); } setCurrentTag(''); } };
    const handleRemoveTag = (tagIndex, isEdit = false) => { /* ... giữ nguyên ... */ if (isEdit && editingTask) { setEditingTask({ ...editingTask, tags: (editingTask.tags || []).filter((_, i) => i !== tagIndex) }); } else { setNewTask({ ...newTask, tags: (newTask.tags || []).filter((_, i) => i !== tagIndex) }); } };
    const openCreateModal = (columnId) => { /* ... giữ nguyên ... */ setSelectedColumn(columnId); setNewTask({ title: '', description: '', priority: 'medium', deadline: '', tags: [] }); setCurrentTag(''); setNaturalLanguageInput(''); setError(null); setShowCreateModal(true); };
    const openEditModal = (task) => { /* ... giữ nguyên ... */ const deadlineForInput = task.deadline ? task.deadline.split('T')[0] : ''; setEditingTask({ ...task, tags: task.tags || [], deadline: deadlineForInput, priority: task.priority || task.flag || 'low' }); setCurrentTag(''); setError(null); setShowEditModal(true); };

    // Lọc task (Sắp xếp lại thứ tự cột)
    const columnsToRender = Object.values(columns)
        .sort((a, b) => {
             const order = { 'todo': 1, 'review': 2, 'done': 3 }; // Bỏ 'inprogress'
             return (order[a.id] || 99) - (order[b.id] || 99);
        })
        .map(col => ({
            ...col,
            tasks: (col.tasks || []).filter(task =>
                !searchQuery ||
                task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (task.tags && task.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
            )
        }));


    // --- RENDER ---
    if (isLoading && Object.keys(columns).length === 0) { return <div>Đang tải...</div>; }
    if (error && Object.keys(columns).length === 0) { return <div style={{ color: 'red', padding: '20px' }}>Lỗi: {error}</div>; }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="taskboard-wrapper">
                {/* Header */}
                <div className="taskboard-top-header">
                   <h1 className="taskboard-main-title">📋 Quản lý Công việc</h1>
                   <div className="taskboard-search-bar"> <BsSearch className="search-icon" /> <input type="text" className="search-input" placeholder="Tìm kiếm..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /> </div>
                </div>
                {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

                {/* Kanban Board */}
                <div className="task-board">
                    {columnsToRender.map((column) => (
                        <SortableContext
                            key={column.id}
                            items={column.tasks.map(task => task.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {/* (ĐÃ SỬA) Truyền openEditModal vào TaskColumn */}
                            <TaskColumn 
                                columnId={column.id}
                                title={column.title}
                                tasksCount={column.tasks.length}
                                tasks={column.tasks} // Truyền tasks đã lọc
                                openCreateModal={openCreateModal}
                                openEditModal={openEditModal} // 👈 SỬA Ở ĐÂY
                            />
                        </SortableContext>
                    ))}
                </div>

                {/* Overlay hiển thị task khi đang kéo */}
                <DragOverlay>
                    {activeTask ? (
                         <TaskCard
                            task={{ ...activeTask, date: activeTask.deadline ? new Date(activeTask.deadline).toLocaleDateString('en-GB', { day:'2-digit', month: 'short' }) : '' }}
                            isOverlay={true} // Báo cho TaskCard biết đây là overlay
                         />
                    ) : null}
                </DragOverlay>

                {/* Modals (Giữ nguyên JSX) */}
                {/* Create */}
                {showCreateModal && (<div className="modal-overlay" onClick={() => setShowCreateModal(false)}> <div className="modal-content task-modal" onClick={(e) => e.stopPropagation()}> <div className="modal-header"> <h3 className="modal-title">Tạo CV mới</h3> <button className="close-modal-btn" onClick={() => setShowCreateModal(false)}> <IoClose /> </button> </div> <div className="modal-body"> {error && <p style={{color: 'red'}}>{error}</p>} <div className="natural-input-section"> <label className="form-label"><IoSparkles className="sparkle-icon" /> Nhập nhanh</label> <div className="natural-input-wrapper"> <input type="text" className="natural-input" placeholder='VD: "Báo cáo khẩn cấp hôm nay #Design"' value={naturalLanguageInput} onChange={(e) => setNaturalLanguageInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleQuickCreate()}/> <button className="quick-create-btn" onClick={handleQuickCreate} disabled={isLoading}> <IoSparkles /> {isLoading ? '...' : 'Tạo'} </button> </div> <p className="input-hint">💡 Gợi ý: "hôm nay/mai", "cao/tb/thấp", "#tag"</p> </div> <div className="divider"><span>Hoặc</span></div> <div className="form-group"> <label>Tiêu đề *</label> <input type="text" className="form-input" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}/> </div> <div className="form-group"> <label>Mô tả</label> <textarea className="form-textarea" rows="3" value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}/> </div> <div className="form-row"> <div className="form-group"> <label>Ưu tiên</label> <select className="form-select" value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}> <option value="low">🟢 Thấp</option> <option value="medium">🟡 TB</option> <option value="high">🔴 Cao</option> </select> </div> <div className="form-group"> <label>Deadline</label> <input type="date" className="form-input" value={newTask.deadline} onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}/> </div> </div> {/* Tags */} </div> <div className="modal-footer"> <button className="btn-cancel" onClick={() => setShowCreateModal(false)} disabled={isLoading}> Hủy </button> <button className="btn-create" onClick={handleCreateTask} disabled={!newTask.title.trim() || isLoading}> {isLoading ? '...' : 'Tạo'} </button> </div> </div> </div> )}
                {/* Edit */}
                {showEditModal && editingTask && (<div className="modal-overlay" onClick={() => setShowEditModal(false)}> <div className="modal-content task-modal" onClick={(e) => e.stopPropagation()}> <div className="modal-header"> <h3 className="modal-title">Chỉnh sửa</h3> <div className="modal-header-actions"> <button className="delete-btn" onClick={() => handleDeleteTask(editingTask.id)} title="Xóa" disabled={isLoading}> 🗑️ </button> <button className="close-modal-btn" onClick={() => setShowEditModal(false)} disabled={isLoading}> <IoClose /> </button> </div> </div> <div className="modal-body"> {error && <p style={{color: 'red'}}>{error}</p>} <div className="form-group"> <label>Tiêu đề *</label> <input type="text" className="form-input" value={editingTask.title} onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}/> </div> <div className="form-group"> <label>Mô tả</label> <textarea className="form-textarea" rows="3" value={editingTask.description || ''} onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}/> </div> <div className="form-row"> <div className="form-group"> <label>Ưu tiên</label> <select className="form-select" value={editingTask.priority} onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })}> <option value="low">🟢 Thấp</option> <option value="medium">🟡 TB</option> <option value="high">🔴 Cao</option> </select> </div> <div className="form-group"> <label>Deadline</label> <input type="date" className="form-input" value={editingTask.deadline || ''} onChange={(e) => setEditingTask({ ...editingTask, deadline: e.target.value })}/> </div> </div> {/* Tags */} </div> <div className="modal-footer"> <button className="btn-cancel" onClick={() => setShowEditModal(false)} disabled={isLoading}> Hủy </button> <button className="btn-save" onClick={handleEditTask} disabled={!editingTask.title.trim() || isLoading}> {isLoading ? '...' : 'Lưu'} </button> </div> </div> </div> )}

            </div>
        </DndContext>
    );
};

export default TaskBoard;