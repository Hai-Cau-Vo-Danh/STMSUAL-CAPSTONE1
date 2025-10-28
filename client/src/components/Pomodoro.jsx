import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BsPlayFill, BsPauseFill, BsStopFill, BsSkipEndFill, BsGearFill } from 'react-icons/bs';
import './Pomodoro.css'; // We will update this CSS file too

// Default settings
const DEFAULT_SETTINGS = {
    focus: 25,
    shortBreak: 5,
    longBreak: 15,
    cyclesBeforeLongBreak: 4,
    autoStartBreaks: false,
    autoStartFocus: false,
};

// Simple audio alert function (replace URL if needed)
const playAlarm = () => {
    try {
        // Use a reliable short sound
        const audio = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg"); 
        audio.play().catch(e => console.warn("Audio playback failed:", e)); // Handle autoplay restrictions
    } catch (e) {
        console.error("Failed to play alarm:", e);
    }
};

// Helper to get user ID
const getUserId = () => {
    try { const u = localStorage.getItem("user"); return u ? JSON.parse(u)?.user_id : null; }
    catch (e) { console.error("Error getting user ID:", e); return null; }
};


const Pomodoro = () => {
    // ----- Settings State -----
    const [settings, setSettings] = useState(() => {
        try {
            const saved = localStorage.getItem('pomodoroSettings');
            return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
        } catch {
            return DEFAULT_SETTINGS;
        }
    });
    const [showSettings, setShowSettings] = useState(false); // Toggle for settings modal/panel

    // ----- Timer State -----
    const [mode, setMode] = useState('focus'); // 'focus', 'shortBreak', 'longBreak'
    const [timeLeft, setTimeLeft] = useState(settings.focus * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [cycle, setCycle] = useState(1); // Current cycle number (1-based)
    const intervalRef = useRef(null); // To store interval ID
    const sessionStartTimeRef = useRef(null); // To store start time of the current session

     // ----- History State -----
     const [history, setHistory] = useState([]);
     const [historyLoading, setHistoryLoading] = useState(false);
     const [historyError, setHistoryError] = useState(null);
     const [showHistory, setShowHistory] = useState(false); // Toggle for history panel


    // ----- Effects -----
    // Timer countdown effect
    useEffect(() => {
      document.title = `${formatTime(timeLeft)} - ${modeDisplay()} | Pomodoro`;
        if (isRunning && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && isRunning) {
            // isRunning check prevents double trigger if manually skipped
            clearInterval(intervalRef.current);
            setIsRunning(false); // Stop the timer first
            playAlarm();
            handleSessionEnd(); // Then handle switching modes/saving
        }
        // Cleanup interval on unmount or when isRunning/timeLeft changes
        return () => clearInterval(intervalRef.current);
    }, [isRunning, timeLeft]); // Rerun effect when isRunning or timeLeft changes

   


     // Fetch history on component mount
     useEffect(() => {
         fetchHistory();
     }, []); // Run once


    // ----- Timer Logic Functions -----
    const startTimer = () => {
        if (timeLeft <= 0) return; // Don't start if time is up
        sessionStartTimeRef.current = new Date(); // Record start time
        setIsRunning(true);
    };

    const pauseTimer = () => {
        clearInterval(intervalRef.current);
        setIsRunning(false);
    };

    const stopAndResetTimer = () => {
        clearInterval(intervalRef.current);
        
        const wasRunningFocus = isRunning && mode === 'focus';
        const startTime = sessionStartTimeRef.current;
        
        if (wasRunningFocus && startTime) {
            const endTime = new Date();
            const durationToSave = settings.focus; 
            
            // 1. Call saveSession to save to the database
            saveSession(startTime, endTime, durationToSave, 'focus'); 
            
            // 2. IMMEDIATELY call fetchHistory afterwards! 👇
            fetchHistory(); // Fetch immediately after saving attempt
            
            console.log(`History save triggered by Stop/Reset. Intended Duration: ${durationToSave}`);
        }

        // 3. Then reset the state
        setIsRunning(false);
        setMode('focus');
        setCycle(1);
        setTimeLeft(settings.focus * 60);
        sessionStartTimeRef.current = null; 
    };

    const handleSessionEnd = () => {
        const finishedMode = mode; // Capture the mode that just finished
        const startTime = sessionStartTimeRef.current; // Get the start time
        sessionStartTimeRef.current = null; // Reset start time ref

        // --- Save History for completed FOCUS session ---
        if (finishedMode === 'focus' && startTime) {
            const endTime = new Date();
            const durationMinutes = settings.focus;
            saveSession(startTime, endTime, durationMinutes, 'focus');
            // Fetch history again after saving
            fetchHistory(); 
        }

        // --- Switch Mode ---
        let nextMode = 'focus';
        let nextTime = settings.focus * 60;
        let nextCycle = cycle;

        if (finishedMode === 'focus') {
            if (cycle >= settings.cyclesBeforeLongBreak) {
                nextMode = 'longBreak';
                nextTime = settings.longBreak * 60;
                nextCycle = 1; // Reset cycle after long break
            } else {
                nextMode = 'shortBreak';
                nextTime = settings.shortBreak * 60;
                // Cycle increments only after focus->break transition, BEFORE long break reset
                 nextCycle = cycle + 1; // Increment cycle here
            }
        } else { // Finished a break (short or long)
            nextMode = 'focus';
            nextTime = settings.focus * 60;
            // Cycle was already updated/reset when break started
             nextCycle = cycle;
        }

        setMode(nextMode);
        setTimeLeft(nextTime);
        setCycle(nextCycle);

        // Auto-start next session based on settings
        if (nextMode === 'focus' && settings.autoStartFocus) {
            startTimer();
        } else if ((nextMode === 'shortBreak' || nextMode === 'longBreak') && settings.autoStartBreaks) {
            startTimer();
        } else {
             setIsRunning(false); // Explicitly ensure timer stops if no auto-start
        }
    };
    
    // Skip current session (counts as completed focus for history if skipped during focus)
    const handleSkip = () => {
        if (!window.confirm(`Bạn có muốn bỏ qua phiên ${modeDisplay()} hiện tại?`)) return;
        
        clearInterval(intervalRef.current);
        setIsRunning(false); // Stop timer
        playAlarm(); // Play sound on skip too
        
        // Treat skipped focus as completed for history saving purposes
        const finishedMode = mode;
        const startTime = sessionStartTimeRef.current;
        if (finishedMode === 'focus' && startTime) {
             const endTime = new Date();
             let durationMinutes = 0;
         switch(finishedMode) {
             case 'focus': durationMinutes = settings.focus; break;
             // Không lưu history cho break khi skip
             // case 'shortBreak': durationMinutes = settings.shortBreak; break; 
             // case 'longBreak': durationMinutes = settings.longBreak; break;
             default: durationMinutes = settings.focus; // Mặc định
         }
         // Chỉ lưu nếu là focus
         if (durationMinutes > 0 && finishedMode === 'focus') {
             saveSession(startTime, endTime, durationMinutes, 'focus');
             fetchHistory();
         }
        }
        
        // Immediately trigger the logic for session end
        handleSessionEnd(); 
    };

    // ----- History Functions -----
     const saveSession = async (startTime, endTime, durationMinutes, type) => {
         const userId = getUserId();
         if (!userId) {
             console.error("Cannot save session: User ID not found.");
             // Maybe show error to user
             return;
         }
         console.log(`Saving ${type} session for user ${userId}: ${durationMinutes} mins`);
         try {
             const response = await fetch('http://localhost:5000/api/pomodoro/session', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                     userId: userId,
                     startTime: startTime.toISOString(), // Send as ISO string
                     endTime: endTime.toISOString(),     // Send as ISO string
                     duration: durationMinutes,
                     type: type
                 }),
             });
             if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.message || `HTTP error ${response.status}`);
             }
             const result = await response.json();
             console.log("Session saved successfully:", result);
             // Maybe show success message briefly?
         } catch (error) {
             console.error("Error saving Pomodoro session:", error);
             // Show error message to user
             setHistoryError(`Lỗi lưu session: ${error.message}`);
         }
     };

     const fetchHistory = async () => {
         const userId = getUserId();
         if (!userId) {
              setHistoryError("Chưa đăng nhập.");
              return;
         }
         setHistoryLoading(true);
         setHistoryError(null);
         try {
             const response = await fetch(`http://localhost:5000/api/pomodoro/history?userId=${userId}`);
             if (!response.ok) throw new Error(`Lỗi HTTP: ${response.status}`);
             const data = await response.json();
             setHistory(data);
         } catch (err) {
             console.error("Lỗi fetch Pomo history:", err);
             setHistoryError(err.message);
         } finally {
             setHistoryLoading(false);
         }
     };

    // ----- Settings Functions -----
    const handleSettingsChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : parseInt(value, 10) || 0 // Ensure number for durations
        }));
    };

    const saveSettings = () => {
        localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
        setShowSettings(false);
        // Apply new focus time immediately if timer is reset
        if (!isRunning && mode === 'focus') {
             setTimeLeft(settings.focus * 60);
        }
        // Handle other modes if needed
    };

    // ----- Display Helpers -----
    const formatTime = (secondsValue) => {
        const mins = String(Math.floor(secondsValue / 60)).padStart(2, '0');
        const secs = String(secondsValue % 60).padStart(2, '0');
        return `${mins}:${secs}`;
    };

    const modeDisplay = () => {
        switch (mode) {
            case 'focus': return `Tập trung (Vòng ${cycle}/${settings.cyclesBeforeLongBreak})`;
            case 'shortBreak': return 'Nghỉ ngắn';
            case 'longBreak': return 'Nghỉ dài';
            default: return 'Focus';
        }
    };


    // ----- RENDER -----
    return (
        <div className="pomodoro-container">
            {/* --- Settings Button --- */}
            <button className="settings-toggle-btn" onClick={() => setShowSettings(true)}>
                <BsGearFill /> Cài đặt
            </button>

            {/* --- Main Timer Display --- */}
             <div className="pomodoro-tomato-bg"> {/* Container for background */}
                 <div className="pomodoro-digital-time">
                     <h2>{formatTime(timeLeft)}</h2>
                 </div>
             </div>
             <p className="pomodoro-mode-display">{modeDisplay()}</p>


            {/* --- Controls --- */}
            <div className="pomodoro-controls">
                <button onClick={stopAndResetTimer} title="Dừng & Reset" disabled={!isRunning && timeLeft === settings[mode]*60}>
                    <BsStopFill />
                </button>
                <button onClick={isRunning ? pauseTimer : startTimer} className="main-btn" title={isRunning ? 'Tạm dừng' : 'Bắt đầu'}>
                    {isRunning ? <BsPauseFill /> : <BsPlayFill />}
                </button>
                <button onClick={handleSkip} title="Bỏ qua phiên" disabled={!isRunning && timeLeft === settings[mode]*60}>
                    <BsSkipEndFill />
                </button>
            </div>


            {/* --- History Toggle Button --- */}
            <button className="history-toggle-btn" onClick={() => { setShowHistory(!showHistory); if (!showHistory) fetchHistory(); }}>
                 {showHistory ? 'Ẩn Lịch sử' : 'Xem Lịch sử'}
             </button>

             {/* --- History Panel --- */}
             {showHistory && (
                 <div className="pomodoro-history panel">
                     <h3>Lịch sử phiên Focus</h3>
                     {historyLoading && <p>Đang tải...</p>}
                     {historyError && <p className="error-msg">Lỗi: {historyError}</p>}
                     {!historyLoading && !historyError && history.length === 0 && <p>Chưa có dữ liệu.</p>}
                     {!historyLoading && !historyError && history.length > 0 && (
                         <ul>
        {history.map(s => {
            // --- 👇 CALCULATE ACTUAL ELAPSED TIME ---
            let actualDurationText = `${s.duration} phút`; // Default to intended duration
            try {
                const start = new Date(s.startTime);
                const end = new Date(s.endTime);
                // Calculate difference in seconds
                const diffSeconds = Math.round((end - start) / 1000); 
                
                // Ensure difference is positive and reasonable (e.g., less than a few hours)
                if (diffSeconds >= 0 && diffSeconds < (s.duration * 60 * 2)) { // Allow some buffer
                    const actualMinutes = Math.floor(diffSeconds / 60);
                    const actualSeconds = diffSeconds % 60;
                    // Format the actual elapsed time
                    actualDurationText = `${actualMinutes} phút ${actualSeconds} giây`; 
                } else {
                     console.warn(`Calculated duration (${diffSeconds}s) seems wrong for session ${s.id}, using intended duration.`);
                }

            } catch (e) {
                console.error("Error calculating actual duration:", e);
                // Fallback to intended duration if parsing fails
            }
            // --- END CALCULATION ---

            return (
                <li key={s.id}>
                    {/* Format end time */}
                    {new Date(s.endTime).toLocaleString('vi-VN', { 
                        day: '2-digit', month: '2-digit', year: 'numeric', 
                        hour: '2-digit', minute: '2-digit', second: '2-digit' 
                    })} 
                    {/* 👇 Display ACTUAL calculated time AND intended duration */}
                    - {actualDurationText} / ({s.duration} phút dự định) 
                </li>
            );
        })}
    </ul>
                     )}
                 </div>
             )}


            {/* --- Settings Modal/Panel --- */}
            {showSettings && (
                <div className="settings-modal-overlay" onClick={() => setShowSettings(false)}>
                    <div className="settings-modal panel" onClick={(e) => e.stopPropagation()}>
                        <h3>Cài đặt Pomodoro</h3>
                        <div className="setting-item">
                            <label htmlFor="focus">Thời gian Tập trung (phút):</label>
                            <input type="number" id="focus" name="focus" min="1" value={settings.focus} onChange={handleSettingsChange} />
                        </div>
                        <div className="setting-item">
                            <label htmlFor="shortBreak">Nghỉ ngắn (phút):</label>
                            <input type="number" id="shortBreak" name="shortBreak" min="1" value={settings.shortBreak} onChange={handleSettingsChange} />
                        </div>
                        <div className="setting-item">
                            <label htmlFor="longBreak">Nghỉ dài (phút):</label>
                            <input type="number" id="longBreak" name="longBreak" min="1" value={settings.longBreak} onChange={handleSettingsChange} />
                        </div>
                         <div className="setting-item">
                            <label htmlFor="cyclesBeforeLongBreak">Số vòng trước khi Nghỉ dài:</label>
                            <input type="number" id="cyclesBeforeLongBreak" name="cyclesBeforeLongBreak" min="1" value={settings.cyclesBeforeLongBreak} onChange={handleSettingsChange} />
                        </div>
                        <div className="setting-item checkbox">
                            <input type="checkbox" id="autoStartBreaks" name="autoStartBreaks" checked={settings.autoStartBreaks} onChange={handleSettingsChange} />
                            <label htmlFor="autoStartBreaks">Tự động bắt đầu Nghỉ</label>
                        </div>
                        <div className="setting-item checkbox">
                            <input type="checkbox" id="autoStartFocus" name="autoStartFocus" checked={settings.autoStartFocus} onChange={handleSettingsChange} />
                            <label htmlFor="autoStartFocus">Tự động bắt đầu Tập trung</label>
                        </div>
                        <div className="settings-actions">
                            <button onClick={() => setShowSettings(false)}>Hủy</button>
                            <button onClick={saveSettings} className="save">Lưu Cài đặt</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Pomodoro;