import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar as BigCalendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './Calendar.css'; // File CSS đã cập nhật
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs';

// Cấu hình moment
import 'moment/locale/vi';
moment.locale('vi');
const localizer = momentLocalizer(moment);

// Lấy user ID
const getUserId = () => {
    try {
        const u = localStorage.getItem("user");
        return u ? JSON.parse(u)?.user_id : null;
    } catch (e) {
        console.error("Lỗi lấy user ID:", e); return null;
    }
};

// --- COMPONENT TÙY CHỈNH CHO TASK CARD ---
const CustomEvent = ({ event }) => {
  const formatTime = (time) => moment(time).format('HH:mm');
  // Lấy class màu từ event object (do eventPropGetter gán vào)
  const eventTypeClass = event.className || 'event-default';

  return (
    // Áp dụng class màu trực tiếp vào wrapper
    <div className={`custom-event-wrapper ${eventTypeClass}`}>
      <div className="custom-event-time">
        {`${formatTime(event.start)} - ${formatTime(event.end)}`}
      </div>
      <div className="custom-event-title">
        {event.title}
      </div>
      <div className="custom-event-avatars">
        {/* Placeholder - Thêm logic avatar thật nếu cần */}
        <span>👤</span>
      </div>
    </div>
  );
};

// --- COMPONENT CHO MODAL SỰ KIỆN ---
const EventModal = ({ event, onClose, onSave, onDelete }) => {
  // State riêng cho form trong modal
  const [title, setTitle] = useState(event?.title || '');
  // Format dates for datetime-local input, handling potential timezone issues implicitly by using local time
  const [startTime, setStartTime] = useState(event?.start ? moment(event.start).format('YYYY-MM-DDTHH:mm') : moment().format('YYYY-MM-DDTHH:mm'));
  const [endTime, setEndTime] = useState(event?.end ? moment(event.end).format('YYYY-MM-DDTHH:mm') : moment().add(1, 'hour').format('YYYY-MM-DDTHH:mm'));
  const [description, setDescription] = useState(event?.description || '');
  const [color, setColor] = useState(event?.color || 'default'); // State for color
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isNewEvent = !event?.id && !event?.event_id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (moment(endTime).isBefore(moment(startTime))) {
        alert("Thời gian kết thúc không thể trước thời gian bắt đầu!");
        return;
    }
    setIsSaving(true);
    const eventData = {
      ...event,
      title,
      // Convert local datetime-local string back to Date object (will be UTC upon stringification)
      start: new Date(startTime),
      end: new Date(endTime),
      description,
      color: color, // Include color
      user_id: getUserId()
    };
    try {
      await onSave(eventData);
    } catch (error) {
       alert(`Lỗi lưu sự kiện: ${error.message}`);
       setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isNewEvent || !window.confirm(`Bạn có chắc muốn xóa sự kiện "${event.title}"?`)) {
      return;
    }
    setIsDeleting(true);
     try {
        await onDelete(event.event_id || event.id);
     } catch (error) {
        alert(`Lỗi xóa sự kiện: ${error.message}`);
        setIsDeleting(false);
     }
  };

  // --- Giao diện Modal ---
  return (
    <div className="event-modal-overlay" onClick={onClose}>
      <div className="event-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{isNewEvent ? 'Tạo sự kiện mới' : 'Chi tiết sự kiện'}</h2>
        <form onSubmit={handleSubmit}>
          {/* Title Input */}
          <div className="form-group">
            <label htmlFor="event-title">Tiêu đề:</label>
            <input id="event-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Thêm tiêu đề..." />
          </div>
          {/* Time Inputs */}
          <div className="form-group time-group">
             <div>
                <label htmlFor="event-start">Bắt đầu:</label>
                <input id="event-start" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
             </div>
             <div>
                <label htmlFor="event-end">Kết thúc:</label>
                <input id="event-end" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
             </div>
          </div>
           {/* Description Input */}
          <div className="form-group">
            <label htmlFor="event-description">Nội dung:</label>
            <textarea id="event-description" value={description} onChange={(e) => setDescription(e.target.value)} rows="3" placeholder="Thêm mô tả..." ></textarea>
          </div>
          {/* Color Selector (Example) */}
          <div className="form-group">
              <label htmlFor="event-color">Màu sắc:</label>
              <select id="event-color" value={color} onChange={(e) => setColor(e.target.value)}>
                  <option value="default">Mặc định (Xanh dương)</option>
                  <option value="green">Xanh lá</option>
                  <option value="orange">Cam</option>
                  <option value="yellow">Vàng</option>
                  <option value="purple">Tím</option>
                  <option value="pink">Hồng</option>
                  <option value="blue">Xanh dương nhạt</option>
              </select>
          </div>
          {/* Actions */}
          <div className="modal-actions">
            {!isNewEvent && ( <button type="button" className="delete-btn" onClick={handleDelete} disabled={isDeleting || isSaving}> {isDeleting ? 'Đang xóa...' : 'Xóa'} </button> )}
            <button type="button" onClick={onClose} disabled={isSaving || isDeleting}>Hủy</button>
            <button type="submit" className="save-btn" disabled={isSaving || isDeleting}> {isSaving ? 'Đang lưu...' : (isNewEvent ? 'Tạo' : 'Lưu thay đổi')} </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// --- COMPONENT LỊCH CHÍNH ---
const MyCalendar = () => {
  const [events, setEvents] = useState([]);
  const [currentView, setCurrentView] = useState(Views.WEEK);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // --- Hàm gọi API ---
  const fetchEvents = useCallback(async (start, end) => {
    const userId = getUserId();
    if (!userId) {
      setError("Chưa đăng nhập");
      setEvents([]);
      return;
    }
    setLoading(true);
    setError(null); // Clear previous error
    try {
      const startISO = start.toISOString();
      const endISO = end.toISOString();

      console.log(`[API Call] Fetching events for user ${userId} from ${startISO} to ${endISO}`);
      const response = await fetch(`/api/calendar/events?userId=${userId}&start=${startISO}&end=${endISO}`);

      // Check if response is ok FIRST
      if (!response.ok) {
        let errorMsg = `Lỗi HTTP: ${response.status}`;
        try {
            // Try to parse error JSON from backend
            const errData = await response.json();
            errorMsg = errData.message || errorMsg;
        } catch (parseError) {
             // If response is not JSON (like HTML error page), read as text
             console.error("Response was not JSON:", parseError);
             try {
                const textError = await response.text();
                // Avoid showing full HTML page as error
                if (textError.toLowerCase().includes('<!doctype html')) {
                    errorMsg += " (Server returned HTML error page)";
                } else {
                    errorMsg += `: ${textError.substring(0, 100)}...`; // Show snippet
                }
             } catch {}
        }
        throw new Error(errorMsg);
      }

      // Only parse JSON if response is ok
      const data = await response.json();
      console.log("[API Response] Events received:", data);

      // Định dạng lại dữ liệu cho BigCalendar
      const formattedEvents = data.map(ev => ({
        ...ev,
        id: ev.event_id || ev.id,
        title: ev.title,
       start: new Date(ev.start), 
       end: new Date(ev.end),     // Parse ISO string from backend
        description: ev.description,
        type: ev.color || ev.type || 'default', // Use 'color' field from backend
        color: ev.color || 'default', // Also store color directly if needed
        // Keep other original fields from backend if necessary
        
      }));
      setEvents(formattedEvents);

    } catch (err) {
      console.error("Lỗi fetch sự kiện:", err);
      setError(`Không thể tải sự kiện: ${err.message}.`); // Don't show mock data on error
      setEvents([]); // Show empty calendar on error
    } finally {
      setLoading(false);
    }
  }, []); // Remove date/view dependency

  // --- useEffect để fetch sự kiện ---
  useEffect(() => {
    console.log("Date or View changed, fetching events...");
    const { start, end } = getRange(currentDate, currentView);
    fetchEvents(start, end);
  }, [currentDate, currentView, fetchEvents]);

  // --- Các hàm xử lý sự kiện ---
  const handleSelectSlot = useCallback(({ start, end }) => {
    setSelectedEvent({ start, end });
    setIsModalOpen(true);
  }, []);

  const handleSelectEvent = useCallback((event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  }, []);

  // --- Các hàm điều khiển Header ---
  const handleNavigate = useCallback((action) => {
      let newDate = currentDate;
      let unit = 'day';
      if(currentView === Views.WEEK) unit = 'week';
      if(currentView === Views.MONTH) unit = 'month';
      if (action === 'PREV') newDate = moment(currentDate).subtract(1, unit).toDate();
      else if (action === 'NEXT') newDate = moment(currentDate).add(1, unit).toDate();
      else if (action === 'TODAY') newDate = new Date();
      setCurrentDate(newDate);
  }, [currentDate, currentView]);

  const handleViewChange = useCallback((newView) => { setCurrentView(newView); }, []);

  // --- Hàm gán class màu ---
  const eventPropGetter = useCallback((event) => {
      const eventType = event.type || event.color || 'default'; // Use type or color
      return { className: `event-${eventType}` };
  }, []);

  // --- HÀM XỬ LÝ LƯU SỰ KIỆN (GỌI API - UNCOMMENTED) ---
  const handleSaveEvent = useCallback(async (eventData) => {
    const isNew = !eventData.id && !eventData.event_id;
    const url = isNew ? '/api/calendar/events' : `/api/calendar/events/${eventData.event_id || eventData.id}`;
    const method = isNew ? 'POST' : 'PUT';

    console.log(`[API Call] ${method} ${url}`, eventData);
    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ // Gửi đúng format backend mong đợi
                user_id: eventData.user_id,
                title: eventData.title,
                description: eventData.description,
                start_time: eventData.start.toISOString(), // Gửi ISO string (UTC)
                end_time: eventData.end.toISOString(),     // Gửi ISO string (UTC)
                color: eventData.color // Gửi màu
            }),
        });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || `HTTP error ${response.status}`);
        }
        console.log("[API Response] Save successful");
        // Lưu thành công
        setIsModalOpen(false);
        setSelectedEvent(null);
        // Tải lại danh sách sự kiện
        const { start, end } = getRange(currentDate, currentView);
        fetchEvents(start, end); // Fetch lại để cập nhật UI

    } catch (error) {
        console.error("Lỗi lưu sự kiện:", error);
        throw error; // Ném lỗi để modal hiển thị alert
    }
  }, [currentDate, currentView, fetchEvents]);

  // --- HÀM XỬ LÝ XÓA SỰ KIỆN (GỌI API - UNCOMMENTED) ---
  const handleDeleteEvent = useCallback(async (eventId) => {
    const userId = getUserId();
    if (!eventId || !userId) {
        console.error("Missing eventId or userId for deletion");
        throw new Error("Không thể xác định sự kiện hoặc người dùng để xóa.");
    };

    const url = `/api/calendar/events/${eventId}?userId=${userId}`;

    console.log(`[API Call] DELETE ${url}`);
    try {
        const response = await fetch(url, { method: 'DELETE' });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || `HTTP error ${response.status}`);
        }
        console.log("[API Response] Delete successful");
        // Xóa thành công
        setIsModalOpen(false);
        setSelectedEvent(null);
        // Tải lại danh sách sự kiện
        const { start, end } = getRange(currentDate, currentView);
        fetchEvents(start, end); // Fetch lại để cập nhật UI

    } catch (error) {
        console.error("Lỗi xóa sự kiện:", error);
        throw error; // Ném lỗi để modal hiển thị alert
    }
  }, [currentDate, currentView, fetchEvents]);

  // Hiển thị ngày tháng trên header
  const DateDisplayLabel = useMemo(() => {
    if (currentView === Views.MONTH) return moment(currentDate).format('MMMM, YYYY');
    if (currentView === Views.WEEK) {
        const start = moment(currentDate).startOf('week').format('D');
        const end = moment(currentDate).endOf('week').format('D MMMM, YYYY');
        return `${start} - ${end}`;
    }
    if (currentView === Views.DAY) return moment(currentDate).format('dddd, D MMMM, YYYY');
    return moment(currentDate).format('MMMM, YYYY');
  }, [currentDate, currentView]);

  return (
    <div className="calendar-container">

      {/* --- HEADER --- */}
      <div className="calendar-header">
          <div className="header-left">
              <button className="nav-today-btn" onClick={() => handleNavigate('TODAY')}>Hôm nay</button>
              <div className="nav-buttons">
                  <button title="Trước" onClick={() => handleNavigate('PREV')}><BsChevronLeft /></button>
                  <button title="Sau" onClick={() => handleNavigate('NEXT')}><BsChevronRight /></button>
              </div>
              <span className="date-display-label">{DateDisplayLabel}</span>
          </div>
          <div className="header-right">
              <div className="view-tabs">
                  <button className={currentView === Views.DAY ? 'active' : ''} onClick={() => handleViewChange(Views.DAY)}>Ngày</button>
                  <button className={currentView === Views.WEEK ? 'active' : ''} onClick={() => handleViewChange(Views.WEEK)}>Tuần</button>
                  <button className={currentView === Views.MONTH ? 'active' : ''} onClick={() => handleViewChange(Views.MONTH)}>Tháng</button>
              </div>
              <button
                  className="create-btn"
                  onClick={() => {
                      const defaultStart = moment().add(1, 'hour').startOf('hour');
                      setSelectedEvent({ start: defaultStart.toDate(), end: defaultStart.add(1, 'hour').toDate() });
                      setIsModalOpen(true);
                  }}
              >
                  Tạo sự kiện
              </button>
          </div>
      </div>

      {/* --- Calendar Content --- */}
      <div className="calendar-content">
        {loading && <p className="loading-text">Đang tải...</p>}
        {!loading && error && <p className="error-text">{error}</p>}

        <BigCalendar
          localizer={localizer}
          events={events} // Luôn hiển thị events (có thể rỗng nếu lỗi)
          startAccessor="start"
          endAccessor="end"
          style={{ flex: 1 }}

          toolbar={false}
          view={currentView}
          date={currentDate}

          onNavigate={() => {}} // Use custom header buttons
          onView={() => {}}   // Use custom header buttons

          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable

          components={{
            event: CustomEvent,
            week: { header: CustomWeekHeader },
            day: { header: CustomWeekHeader }
          }}
          eventPropGetter={eventPropGetter}

          timeslots={1}
          step={60}
          min={moment().hour(4).minute(0).toDate()}
          max={moment().hour(22).minute(0).toDate()}

          messages={{
                next: "Sau", previous: "Trước", today: "Hôm nay",
                month: "Tháng", week: "Tuần", day: "Ngày", agenda: "Lịch trình",
                date: "Ngày", time: "Giờ", event: "Sự kiện",
                noEventsInRange: "Không có sự kiện nào trong khoảng này.",
                showMore: total => `+ ${total} thêm`
          }}
        />
      </div>

      {/* --- EVENT MODAL --- */}
      {isModalOpen && (
        <EventModal
          event={selectedEvent}
          onClose={() => { setIsModalOpen(false); setSelectedEvent(null); }}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
        />
      )}

    </div>
  );
}; // End MyCalendar

// Component tùy chỉnh cho Header cột
const CustomWeekHeader = ({ label, date }) => (
    <div className="custom-week-header">
        {/* SỬA 'dddd' thành 'ddd' */}
        <span className="day-name">{moment(date).format('ddd').toUpperCase()}</span>
        <span className="day-number">{moment(date).format('DD')}</span>
    </div>
);


// Hàm helper tính toán phạm vi ngày/tuần/tháng
const getRange = (date, view) => {
    if (view === Views.MONTH) {
        const startOfMonth = moment(date).startOf('month');
        const endOfMonth = moment(date).endOf('month');
        return { start: startOfMonth.startOf('week').toDate(), end: endOfMonth.endOf('week').toDate() };
    }
    if (view === Views.WEEK) {
        return { start: moment(date).startOf('week').toDate(), end: moment(date).endOf('week').toDate() };
    }
    return { start: moment(date).startOf('day').toDate(), end: moment(date).endOf('day').toDate() };
};

// Hàm tạo dữ liệu mẫu (chỉ dùng khi fetch lỗi)
const getMockData = (currentDate) => [
     { id: 'mock-1', title: 'Mẫu: Họp team', start: moment(currentDate).startOf('week').add(1, 'day').hour(9).toDate(), end: moment(currentDate).startOf('week').add(1, 'day').hour(10).toDate(), type: 'green' },
     { id: 'mock-2', title: 'Mẫu: Deadline báo cáo', start: moment(currentDate).startOf('week').add(3, 'day').hour(14).toDate(), end: moment(currentDate).startOf('week').add(3, 'day').hour(15).toDate(), type: 'orange' },
];


export default MyCalendar;