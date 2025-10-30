import eventlet # <-- Đảm bảo eventlet đã được import ở đây
eventlet.monkey_patch() # <-- DÒNG NÀY PHẢI ĐẶT NGAY SAU IMPORT EVENTLET
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import jwt
from DB.models import User, Workspace, WorkspaceMember
from time import sleep
from flask_socketio import SocketIO, emit, join_room, leave_room
from DB.models import Task 
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import requests
from DB.database import get_db, engine
from DB.models import User, Task, Workspace, Tag, Note, Notification, WorkspaceMember, Board, BoardList, BoardCard
from sqlalchemy import text
from sqlalchemy import desc 
from datetime import datetime, timezone
import traceback 
from werkzeug.security import generate_password_hash, check_password_hash
import json
from DB.models import CalendarEvent
from DB.models import PomodoroSession
from sqlalchemy import func


# THÊM CÁC IMPORT CẦN THIẾT
import cloudinary
import cloudinary.uploader
from datetime import datetime, timedelta 

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')
study_rooms = {}
room_timer_tasks = {}

# 🔹 Tải biến môi trường
load_dotenv()

# --- CẤU HÌNH CLOUDINARY TỪ FILE .ENV ---
cloudinary.config(cloudinary_url=os.getenv("CLOUDINARY_URL"), secure=True)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = "gemini-2.5-flash" 

# --- DỮ LIỆU HUẤN LUYỆN AI (Giữ nguyên) ---
AI_KNOWLEDGE = """
Bạn là một AI chatbot tên MiMi ChatBot, trợ lý của hệ thống STMSUAI,được thiết kế bởi Admin Minh của nhóm. 
Tính cách: dễ thương, thân thiện, nhí nhảnh, xưng "tớ" với người dùng. 

Nhiệm vụ của bạn là phân tích tin nhắn của người dùng, phân loại ý định (intent), và tạo ra một câu trả lời tự nhiên (reply) phù hợp với giọng điệu của MiMi ChatBot.
LUÔN LUÔN CHỈ TRẢ LỜI BẰNG ĐỊNH DẠNG JSON chứa các trường sau:
-   "intent": Phân loại ý định ("create_task" hoặc "chat").
-   "reply": Câu trả lời tự nhiên, thân thiện mà MiMi sẽ nói với người dùng.
-   Nếu tạo task thành công hãy nhắn sau tin nhắn đó dòng "Hãy kiểm tra trong mục TASK nhé!".

Nếu intent là "create_task", JSON phải chứa THÊM các trường:
-   "title": Tên công việc (Nếu không rõ, đặt là null).
-   "priority": 'low', 'medium', hoặc 'high' (Mặc định 'medium').
-   "deadline": Ngày theo định dạng YYYY-MM-DD (null nếu không có).
   VÀ câu "reply" PHẢI là lời xác nhận đã tạo task.

Nếu intent là "chat", JSON KHÔNG cần các trường task, và câu "reply" PHẢI là lời phản hồi tự nhiên, đúng ngữ cảnh cho tin nhắn của người dùng.

Ví dụ:
1.  Người dùng: "Tạo task báo cáo khẩn cấp ngày mai"
    {"intent": "create_task", "reply": "💖 Ok nè, tớ đã tạo task 'Báo cáo' khẩn cấp cho ngày mai rồi nha!", "title": "Báo cáo", "priority": "high", "deadline": "YYYY-MM-DD (ngày mai)"}
2.  Người dùng: "Lên lịch họp team"
    {"intent": "create_task", "reply": "💖 Đã xong! Tớ thêm task 'Họp team' vào danh sách rồi đó!", "title": "Họp team", "priority": "medium", "deadline": null}
3.  Người dùng: "Chào Mimi"
    {"intent": "chat", "reply": "💖 Chào cậu! Cần tớ giúp gì hong nè? ✨"}
4.  Người dùng: "Cậu có thể giúp gì?"
    {"intent": "chat", "reply": "💖 Tớ có thể giúp tạo task nè, hoặc chỉ đơn giản là tám chuyện với cậu thui! 😊"}
5.  Người dùng: "blablabla gì đó" (Không rõ intent tạo task)
    {"intent": "chat", "reply": "💖 Hmm, tớ chưa hiểu ý cậu lắm 🥺 Cậu nói rõ hơn được không?"}

LUÔN LUÔN CHỈ TRẢ LỜI BẰNG JSON. KHÔNG THÊM BẤT KỲ TEXT NÀO KHÁC.
"""

# (Tất cả các route test, login, register, profile... giữ nguyên)

# ✅ Route test backend
@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({"message": "✅ Backend STMSUAI đang hoạt động!"})

# ✅ Route test database connection
@app.route('/api/db-test', methods=['GET'])
def db_test():
    try:
        db = next(get_db())
        db.execute(text("SELECT 1"))
        users_count = db.query(User).count()
        tasks_count = db.query(Task).count()
        return jsonify({
            "message": "✅ Kết nối database thành công!",
            "database": "my_project_STMSUAI_db",
            "users_count": users_count,
            "tasks_count": tasks_count
        })
    except Exception as e:
        return jsonify({"error": f"❌ Lỗi database: {str(e)}"}), 500

# ✅ Route lấy danh sách users
@app.route('/api/users', methods=['GET'])
def get_users():
    try:
        db = next(get_db())
        users = db.query(User).limit(10).all()
        users_list = [{
            "user_id": user.user_id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at else None
        } for user in users]
        return jsonify({"users": users_list, "count": len(users_list)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ✅ Route đăng ký tài khoản
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not all([username, email, password]):
        return jsonify({"message": "Thiếu thông tin đăng ký!"}), 400

    db = next(get_db())
    existing_user = db.query(User).filter_by(email=email).first()
    if existing_user:
        return jsonify({"message": "Email đã tồn tại!"}), 400

    hashed_pw = generate_password_hash(password)
    new_user = User(username=username, email=email, password_hash=hashed_pw)
    db.add(new_user)
    db.commit()

    return jsonify({"message": "Đăng ký thành công!"}), 201

# ✅ Route đăng nhập tài khoản
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not all([email, password]):
        return jsonify({"message": "Thiếu email hoặc mật khẩu!"}), 400

    db: Session = None # Khởi tạo db là None
    try:
        db = next(get_db()) # Gán db trong try
        user = db.query(User).filter_by(email=email).first()

        # Kiểm tra user và mật khẩu
        if not user or not check_password_hash(user.password_hash, password):
            return jsonify({"message": "Sai email hoặc mật khẩu!"}), 401

        # --- TẠO TOKEN ---
        payload = {
            'user_id': user.user_id,
            'email': user.email,
            'role': user.role,
            'exp': datetime.now(timezone.utc) + timedelta(days=1) # Hết hạn sau 1 ngày
        }
        secret_key = app.config['SECRET_KEY']
        if not secret_key:
             print("⚠️ Lỗi: SECRET_KEY chưa được cấu hình trong .env!")
             return jsonify({"message": "Lỗi cấu hình server"}), 500

        try:
            token = jwt.encode(payload, secret_key, algorithm="HS256")
            print(f"🔑 SECRET_KEY đang dùng để MÃ HÓA (tại /api/login): '{secret_key}'")
            print(f"🔒 Token vừa được TẠO (tại /api/login): '{token}'")
        except Exception as jwt_err:
             print(f"❌ Lỗi tạo JWT: {jwt_err}")
             return jsonify({"message": "Lỗi tạo token xác thực"}), 500
        # --- KẾT THÚC TẠO TOKEN ---

        # Trả về user info VÀ token
        return jsonify({
            "message": "Đăng nhập thành công!",
            "user": {
                "user_id": user.user_id,
                "username": user.username,
                "email": user.email,
                "avatar_url": user.avatar_url,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "role": user.role
            },
            "token": token # <-- TRẢ TOKEN VỀ ĐÂY!
        }), 200

    except Exception as e:
         print(f"❌ Lỗi /api/login: {e}")
         traceback.print_exc() # In chi tiết lỗi ra console backend
         return jsonify({"message": "Lỗi máy chủ khi đăng nhập"}), 500
    finally:
         if db:
             db.close() # Đảm bảo đóng session


@app.route('/api/ai-chat', methods=['POST'])
def ai_chat():
    data = request.get_json()
    user_message = data.get("message", "").strip()
    user_id = data.get('user_id')  # LẤY USER_ID TỪ FRONTEND

    db: Session = next(get_db())  # LẤY DB SESSION

    if not user_id:
        return jsonify({"reply": "⚠️ Lỗi: Không xác thực được người dùng!"}), 400

    if not user_message:
        return jsonify({"reply": "⚠️ Bạn chưa nhập tin nhắn nào!"}), 400

    if not GEMINI_API_KEY:
        return jsonify({"reply": "⚠️ Thiếu GEMINI_API_KEY trong file .env"}), 500

    reply_to_send = "💖 Mimi ChatBot xin lỗi, có lỗi xảy ra 🥺"  # Default error reply

    try:
        # 1. Gửi tin nhắn đến Gemini để phân tích intent VÀ lấy reply
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "contents": [{"parts": [{"text": f"{AI_KNOWLEDGE}\n\nNgười dùng: {user_message}"}]}]
        }
        headers = {"Content-Type": "application/json"}
        res = requests.post(url, headers=headers, json=payload)
        res_data = res.json()

        # --- KIỂM TRA LỖI GEMINI ---
        if "candidates" not in res_data:
            print("❌ Lỗi từ Gemini API:")
            print(json.dumps(res_data, indent=2))
            error_message = res_data.get("error", {}).get("message", "Lỗi không xác định từ Gemini.")
            if "API key not valid" in error_message:
                error_message = "API Key của Gemini không hợp lệ."
            reply_to_send = f"💖 Mimi ChatBot xin lỗi 🥺: {error_message}"
            return jsonify({"reply": reply_to_send})

        ai_reply_text_json = res_data["candidates"][0]["content"]["parts"][0]["text"]

        # 2. Xử lý phản hồi JSON từ Gemini
        try:
            clean_json_text = ai_reply_text_json.strip().replace("```json", "").replace("```", "").strip()
            ai_data = json.loads(clean_json_text)
            intent = ai_data.get("intent")
            reply_from_gemini = ai_data.get("reply", "💖 Tớ nhận được rồi nè, nhưng chưa biết trả lời sao 🥺")
            reply_to_send = reply_from_gemini

        except Exception as e:
            print(f"Lỗi đọc JSON từ Gemini: {e}")
            print(f"Dữ liệu gốc: {ai_reply_text_json}")
            reply_to_send = "💖 Mimi ChatBot xin lỗi, tớ không hiểu phản hồi từ hệ thống 🥺"
            return jsonify({"reply": reply_to_send})

        # 3. Nếu intent là CREATE_TASK thì tạo task thật trong DB
        if intent == "create_task":
            title_from_ai = ai_data.get("title")

            if title_from_ai:
                priority = ai_data.get("priority", "medium")
                deadline_val = None
                deadline_str = ai_data.get("deadline")

                if deadline_str:
                    today = datetime.now()
                    if "ngày mai" in deadline_str:
                        deadline_val = today + timedelta(days=1)
                    elif "hôm nay" in deadline_str:
                        deadline_val = today
                    else:
                        try:
                            deadline_val = datetime.strptime(deadline_str.split(" ")[0], "%Y-%m-%d")
                        except ValueError:
                            pass

                try:
                    new_task = Task(
                        creator_id=user_id,
                        title=title_from_ai,
                        priority=priority,
                        deadline=deadline_val,
                        status='todo'
                    )
                    db.add(new_task)
                    db.commit()
                    print(f"✅ AI đã tạo task '{title_from_ai}' thành công!")
                except Exception as e:
                    db.rollback()
                    print(f"Lỗi tạo task qua AI: {e}")
                    reply_to_send = f"💖 Mimi ChatBot xin lỗi 🥺 Tớ đã cố tạo task '{title_from_ai}' nhưng thất bại: {e}"
            else:
                reply_to_send = "💖 Hmmm, cậu muốn tạo task gì thế? Nói rõ hơn giúp tớ nha! 🥺"
                print("⚠️ AI không trích xuất được title để tạo task.")

        # 4. Trả về phản hồi
        return jsonify({"reply": reply_to_send})

    except Exception as e:
        print(f"❌ Lỗi AI nghiêm trọng: {e}")
        reply_to_send = f"Lỗi nghiêm trọng khi gọi AI: {str(e)}"
        return jsonify({"reply": reply_to_send}), 500

    finally:
        if db:
            db.close()



# --- (CODE CŨ GIỮ NGUYÊN) ---
@app.route('/api/profile/update', methods=['POST'])
def update_profile():
    user_id = request.form.get('user_id')
    new_username = request.form.get('username')
    new_email = request.form.get('email')
    avatar_file = request.files.get('avatar_file')

    if not all([user_id, new_username, new_email]):
        return jsonify({"message": "Thiếu thông tin user_id, username hoặc email!"}), 400

    db = next(get_db())
    
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return jsonify({"message": "Không tìm thấy người dùng!"}), 404

    if new_username != user.username:
        existing_username = db.query(User).filter(User.username == new_username).first()
        if existing_username:
            return jsonify({"message": "Username này đã có người sử dụng!"}), 400
    
    if new_email != user.email:
        existing_email = db.query(User).filter(User.email == new_email).first()
        if existing_email:
            return jsonify({"message": "Email này đã có người sử dụng!"}), 400

    user.username = new_username
    user.email = new_email
    
    if avatar_file:
        try:
            upload_result = cloudinary.uploader.upload(
                avatar_file,
                crop="thumb", 
                gravity="face", 
                width=150, 
                height=150, 
                radius="max"
            )
            new_avatar_url = upload_result.get('secure_url')
            if new_avatar_url:
                user.avatar_url = new_avatar_url
        except Exception as e:
            print(f"Lỗi tải ảnh lên Cloudinary: {e}")
            pass 

    db.commit() 
    db.refresh(user) 

    return jsonify({
        "message": "Cập nhật hồ sơ thành công!",
        "user": {
            "user_id": user.user_id,
            "username": user.username,
            "email": user.email,
            "avatar_url": user.avatar_url
        }
    }), 200


from flask_mail import Mail, Message
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadTimeSignature
import time 

# --- CẤU HÌNH FLASK-MAIL ---
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS') == 'True'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_USERNAME')

mail = Mail(app)

app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'mot-chuoi-bi-mat-rat-kho-doan-abc123')
s = URLSafeTimedSerializer(app.config['SECRET_KEY'])


# ✅ API 1: Gửi link quên mật khẩu
@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')

    if not email:
        return jsonify({"message": "Vui lòng nhập email!"}), 400

    db = next(get_db())
    user = db.query(User).filter_by(email=email).first()

    if not user:
        print(f"Yêu cầu reset mật khẩu cho email không tồn tại: {email}")
        return jsonify({"message": "Nếu email tồn tại, link reset sẽ được gửi."}), 200

    token = s.dumps(email, salt='password-reset-salt')
    reset_link = f"http://localhost:5173/reset-password/{token}"

    try:
        msg = Message(
            subject="[STMSUAI] Yêu cầu đặt lại mật khẩu",
            sender=app.config['MAIL_DEFAULT_SENDER'],
            recipients=[email]
        )
        msg.html = f"""
        <p>Chào bạn {user.username},</p>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
        <p>Vui lòng nhấp vào link dưới đây để đặt lại mật khẩu. Link này sẽ hết hạn sau 1 giờ.</p>
        <a href="{reset_link}" 
           style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block;">
           Đặt lại mật khẩu
        </a>
        <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
        <p>Trân trọng,<br>Đội ngũ STMSUAI - Admin Minh</p>
        """
        mail.send(msg)
        return jsonify({"message": "Đã gửi link đặt lại mật khẩu qua email."}), 200
    except Exception as e:
        print(f"Lỗi gửi mail: {e}")
        return jsonify({"message": f"Lỗi máy chủ khi gửi mail: {e}"}), 500


# ✅ API 2: Xử lý reset mật khẩu
@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    token = data.get('token')
    new_password = data.get('password')

    if not token or not new_password:
        return jsonify({"message": "Thiếu token hoặc mật khẩu mới!"}), 400

    try:
        email = s.loads(token, salt='password-reset-salt', max_age=3600)
    except SignatureExpired:
        return jsonify({"message": "Link đã hết hạn! Vui lòng yêu cầu lại."}), 400
    except BadTimeSignature:
        return jsonify({"message": "Link không hợp lệ!"}), 400
    except Exception:
        return jsonify({"message": "Link không hợp lệ!"}), 400

    db = next(get_db())
    user = db.query(User).filter_by(email=email).first()

    if not user:
        return jsonify({"message": "Người dùng không tồn tại!"}), 404

    hashed_pw = generate_password_hash(new_password)
    user.password_hash = hashed_pw
    db.commit()

    return jsonify({"message": "Đã cập nhật mật khẩu thành công!"}), 200


from sqlalchemy import desc 

# ✅ API: Lấy tất cả Tasks (theo trạng thái)
@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    print("--- GET /api/tasks ĐƯỢC GỌI ---")
    user_id = request.args.get('userId')
    if not user_id:
        return jsonify({"message": "Thiếu user ID"}), 400

    try:
        user_id = int(user_id)
    except ValueError:
        return jsonify({"message": "User ID không hợp lệ"}), 400

    db: Session = next(get_db())
    
    try:
        tasks_db = db.query(Task).filter(Task.creator_id == user_id).order_by(desc(Task.created_at)).all()
        
        tasks_by_status = {
            "todo": [],
            "inprogress": [], 
            "review": [],
            "done": []
        }
        
        for task in tasks_db:
            task_data = {
                "id": task.task_id, 
                "title": task.title,
                "description": task.description,
                "deadline": task.deadline.isoformat() if task.deadline else None,
                "priority": task.priority,
                "status": task.status,
                "createdAt": task.created_at.isoformat() if task.created_at else None,
            }
            if task.status in tasks_by_status:
                tasks_by_status[task.status].append(task_data)
            else:
                 tasks_by_status["todo"].append(task_data)

        response_columns = [
            {"id": "todo", "title": "To do", "tasks": tasks_by_status["todo"], "count": len(tasks_by_status["todo"])},
            {"id": "review", "title": "In Review", "tasks": tasks_by_status["review"], "count": len(tasks_by_status["review"])},
            {"id": "done", "title": "Done", "tasks": tasks_by_status["done"], "count": len(tasks_by_status["done"])},
        ]

        return jsonify(response_columns), 200 

    except Exception as e:
        print(f"Lỗi lấy tasks: {e}")
        db.rollback()
        return jsonify({"message": f"Lỗi máy chủ khi lấy tasks: {str(e)}"}), 500


# ✅ API: Tạo Task mới
@app.route('/api/tasks', methods=['POST'])
def create_task():
    data = request.get_json()
    
    user_id = data.get('creator_id') 
    title = data.get('title')
    status = data.get('status', 'todo') 

    if not user_id or not title:
        return jsonify({"message": "Thiếu User ID hoặc Tiêu đề Task!"}), 400

    db: Session = next(get_db())

    try:
        new_task = Task(
            creator_id=user_id,
            title=title,
            description=data.get('description'),
            deadline=data.get('deadline'), 
            priority=data.get('priority', 'medium'),
            status=status,
        )
        db.add(new_task)
        db.commit()
        db.refresh(new_task)

        created_task_data = {
            "id": new_task.task_id,
            "title": new_task.title,
            "description": new_task.description,
            "deadline": new_task.deadline.isoformat() if new_task.deadline else None,
            "priority": new_task.priority,
            "status": new_task.status,
            "createdAt": new_task.created_at.isoformat() if new_task.created_at else None,
        }
        return jsonify(created_task_data), 201

    except Exception as e:
        print(f"Lỗi tạo task: {e}")
        db.rollback()
        return jsonify({"message": f"Lỗi máy chủ khi tạo task: {str(e)}"}), 500


# ✅ API: Cập nhật Task (PUT)
@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.get_json()
    user_id = data.get('user_id') 

    if not user_id:
         return jsonify({"message": "Thiếu user ID"}), 400
         
    db: Session = next(get_db())
    
    try:
        task = db.query(Task).filter(Task.task_id == task_id).first()

        if not task:
            return jsonify({"message": "Task không tồn tại!"}), 404

        if task.creator_id != user_id:
             return jsonify({"message": "Bạn không có quyền sửa task này!"}), 403
        
        if 'title' in data: task.title = data['title']
        if 'description' in data: task.description = data['description']
        if 'deadline' in data: task.deadline = data['deadline'] 
        if 'priority' in data: task.priority = data['priority']
        if 'status' in data: task.status = data['status']

        db.commit()
        db.refresh(task)

        updated_task_data = {
            "id": task.task_id,
            "title": task.title,
            "description": task.description,
            "deadline": task.deadline.isoformat() if task.deadline else None,
            "priority": task.priority,
            "status": task.status,
            "createdAt": task.created_at.isoformat() if task.created_at else None,
        }
        return jsonify(updated_task_data), 200

    except Exception as e:
        print(f"Lỗi cập nhật task {task_id}: {e}")
        db.rollback()
        return jsonify({"message": f"Lỗi máy chủ khi cập nhật task: {str(e)}"}), 500



# ✅ API: Xóa Task
@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    user_id = request.args.get('userId') 
    if not user_id:
        return jsonify({"message": "Thiếu user ID"}), 400
    try:
        user_id = int(user_id)
    except ValueError:
        return jsonify({"message": "User ID không hợp lệ"}), 400

    db: Session = next(get_db())

    try:
        task = db.query(Task).filter(Task.task_id == task_id).first()

        if not task:
            return jsonify({"message": "Task không tồn tại!"}), 404
            
        if task.creator_id != user_id:
             return jsonify({"message": "Bạn không có quyền xóa task này!"}), 403

        db.delete(task)
        db.commit()
        
        return jsonify({"message": f"Đã xóa task {task_id}"}), 200 

    except Exception as e:
        print(f"Lỗi xóa task {task_id}: {e}")
        db.rollback()
        return jsonify({"message": f"Lỗi máy chủ khi xóa task: {str(e)}"}), 500


# ✅ API: Lấy tất cả Notes
@app.route('/api/notes', methods=['GET'])
def get_notes():
    user_id = request.args.get('userId')
    if not user_id:
        return jsonify({"message": "Thiếu user ID"}), 400
    try:
        user_id = int(user_id)
    except ValueError:
        return jsonify({"message": "User ID không hợp lệ"}), 400

    db: Session = next(get_db())
    try:
        notes_db = db.query(Note).filter(Note.creator_id == user_id)\
            .order_by(desc(Note.pinned), desc(Note.updated_at)).all()
        
        notes_list = []
        for note in notes_db:
            notes_list.append({
                "id": note.note_id, 
                "title": note.title,
                "content": note.content,
                "tags": [], 
                "color": note.color_hex, 
                "pinned": note.pinned,
                "date": note.updated_at.isoformat() 
            })
            
        return jsonify(notes_list), 200

    except Exception as e:
        print(f"Lỗi lấy notes: {e}")
        db.rollback()
        return jsonify({"message": f"Lỗi máy chủ khi lấy notes: {str(e)}"}), 500


# ✅ API: Tạo Note mới
@app.route('/api/notes', methods=['POST'])
def create_note():
    data = request.get_json()
    user_id = data.get('creator_id')
    
    if not user_id:
        return jsonify({"message": "Thiếu creator_id"}), 400

    db: Session = next(get_db())
    try:
        new_note = Note(
            creator_id=user_id,
            title=data.get('title', 'Không có tiêu đề'), 
            content=data.get('content'),
            pinned=data.get('pinned', False),
            color_hex=data.get('color', '#e0f2fe')
        )
        db.add(new_note)
        db.commit()
        db.refresh(new_note)

        created_note_data = {
            "id": new_note.note_id,
            "title": new_note.title,
            "content": new_note.content,
            "tags": [],
            "color": new_note.color_hex,
            "pinned": new_note.pinned,
            "date": new_note.updated_at.isoformat()
        }
        return jsonify(created_note_data), 201

    except Exception as e:
        print(f"Lỗi tạo note: {e}")
        db.rollback()
        return jsonify({"message": f"Lỗi máy chủ khi tạo note: {str(e)}"}), 500


# ✅ API: Cập nhật Note (Sửa, Ghim)
@app.route('/api/notes/<int:note_id>', methods=['PUT'])
def update_note(note_id):
    data = request.get_json()
    user_id = data.get('user_id') 

    if not user_id:
         return jsonify({"message": "Thiếu user ID"}), 400
         
    db: Session = next(get_db())
    try:
        note = db.query(Note).filter(Note.note_id == note_id).first()
        if not note:
            return jsonify({"message": "Note không tồn tại!"}), 404
        if note.creator_id != user_id:
             return jsonify({"message": "Bạn không có quyền sửa note này!"}), 403
        
        note.title = data.get('title', note.title)
        note.content = data.get('content', note.content)
        note.pinned = data.get('pinned', note.pinned)
        note.color_hex = data.get('color', note.color_hex)

        db.commit()
        db.refresh(note)

        updated_note_data = {
            "id": note.note_id,
            "title": note.title,
            "content": note.content,
            "tags": [],
            "color": note.color_hex,
            "pinned": note.pinned,
            "date": note.updated_at.isoformat()
        }
        return jsonify(updated_note_data), 200

    except Exception as e:
        print(f"Lỗi cập nhật note {note_id}: {e}")
        db.rollback()
        return jsonify({"message": f"Lỗi máy chủ khi cập nhật note: {str(e)}"}), 500


# ✅ API: Xóa Note
@app.route('/api/notes/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    user_id = request.args.get('userId') 
    if not user_id:
        return jsonify({"message": "Thiếu user ID"}), 400
    try:
        user_id = int(user_id)
    except ValueError:
        return jsonify({"message": "User ID không hợp lệ"}), 400

    db: Session = next(get_db())
    try:
        note = db.query(Note).filter(Note.note_id == note_id).first()
        if not note:
            return jsonify({"message": "Note không tồn tại!"}), 404
        if note.creator_id != user_id:
             return jsonify({"message": "Bạn không có quyền xóa note này!"}), 403

        db.delete(note)
        db.commit()
        
        return jsonify({"message": f"Đã xóa note {note_id}"}), 200

    except Exception as e:
        print(f"Lỗi xóa note {note_id}: {e}")
        db.rollback()
        return jsonify({"message": f"Lỗi máy chủ khi xóa note: {str(e)}"}), 500
   
@app.route('/api/pomodoro/history', methods=['GET'])
def get_pomodoro_history():
    user_id = request.args.get('userId')
    if not user_id:
        return jsonify({"message": "Thiếu user ID"}), 400
    try:
        user_id = int(user_id)
    except ValueError:
        return jsonify({"message": "User ID không hợp lệ"}), 400

    db: Session = None # 👈 Initialize db to None BEFORE the try block
    try:
        db = next(get_db()) # Assign db inside the try block
        # Get last 50 sessions, newest first
        sessions = db.query(PomodoroSession)\
                     .filter(PomodoroSession.user_id == user_id)\
                     .order_by(desc(PomodoroSession.end_time))\
                     .limit(50)\
                     .all()

        history = [{
            "id": s.session_id,
            "startTime": s.start_time.isoformat(),
            "endTime": s.end_time.isoformat(),
            "duration": s.duration_minutes,
            "type": s.type
        } for s in sessions]

        return jsonify(history), 200
    except Exception as e:
        print(f"Lỗi lấy lịch sử Pomodoro: {e}")
        # db.rollback() # Rollback is often handled by session closing or context manager
        return jsonify({"message": f"Lỗi máy chủ: {str(e)}"}), 500
    finally:
        # 👇 Correct indentation and add check
        if db: # Only close if db was successfully assigned
            db.close()
         
         
@app.route('/api/calendar/events', methods=['GET'])
def get_calendar_events():
    print("\n--- [API] /api/calendar/events called (REAL VERSION) ---")
    user_id = request.args.get('userId')
    start_iso = request.args.get('start')
    end_iso = request.args.get('end')

    if not all([user_id, start_iso, end_iso]):
        return jsonify({"message": "Thiếu userId, start hoặc end"}), 400

    db: Session = None
    try:
        user_id_int = int(user_id)
        
        # Chuyển đổi chuỗi ISO từ frontend thành đối tượng datetime
        start_dt = datetime.fromisoformat(start_iso.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_iso.replace('Z', '+00:00'))

        db = next(get_db())
        
        # Logic query LỊCH:
        # Lấy tất cả sự kiện có MỘT PHẦN nằm trong khoảng thời gian
        # (start_time < end_range) VÀ (end_time > start_range)
        events_db = db.query(CalendarEvent).filter(
            CalendarEvent.user_id == user_id_int,
            CalendarEvent.start_time < end_dt, # Bắt đầu trước khi range kết thúc
            CalendarEvent.end_time > start_dt   # Kết thúc sau khi range bắt đầu
        ).all()

        # Format lại dữ liệu cho React Big Calendar
        formatted_events = []
        for ev in events_db:
            formatted_events.append({
                "id": ev.event_id,
                "event_id": ev.event_id,
                "title": ev.title,
                "start": ev.start_time.isoformat(), # Gửi lại ISO string (UTC)
                "end": ev.end_time.isoformat(),   # Gửi lại ISO string (UTC)
                "description": ev.description,
                "color": ev.color or 'default', # Đảm bảo có giá trị default
                "type": ev.color or 'default'
            })
        
        print(f"[API] Tìm thấy {len(formatted_events)} sự kiện cho user {user_id_int}")
        return jsonify(formatted_events), 200

    except ValueError as ve:
        print(f"[API Lỗi] Định dạng ngày tháng không hợp lệ: {ve}")
        return jsonify({"message": f"Định dạng ngày tháng không hợp lệ: {ve}"}), 400
    except Exception as e:
        if db: db.rollback()
        print(f"Lỗi lấy sự kiện lịch:")
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi lấy sự kiện: {str(e)}"}), 500
    finally:
        if db: db.close()

# POST Event (IMPLEMENTED)
@app.route('/api/calendar/events', methods=['POST'])
def create_calendar_event():
    data = request.get_json()
    user_id = data.get('user_id')
    title = data.get('title')
    start_time_iso = data.get('start_time')
    end_time_iso = data.get('end_time')
    description = data.get('description')
    color = data.get('color', 'default') # Get color from request or default

    if not all([user_id, title, start_time_iso, end_time_iso]):
        return jsonify({"message": "Thiếu thông tin sự kiện (user_id, title, start_time, end_time)"}), 400

    db: Session = None
    try:
        user_id_int = int(user_id)
        db = next(get_db())

        # Parse dates
        try:
            start_dt = datetime.fromisoformat(start_time_iso.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end_time_iso.replace('Z', '+00:00'))
            if start_dt.tzinfo is None: start_dt = start_dt.replace(tzinfo=timezone.utc)
            if end_dt.tzinfo is None: end_dt = end_dt.replace(tzinfo=timezone.utc)
        except ValueError as ve:
             return jsonify({"message": f"Định dạng start_time/end_time không hợp lệ: {ve}"}), 400

        # Validate end time >= start time
        if end_dt < start_dt:
            return jsonify({"message": "Thời gian kết thúc không thể trước thời gian bắt đầu"}), 400

        new_event = CalendarEvent(
            user_id=user_id_int,
            title=title,
            description=description,
            start_time=start_dt,
            end_time=end_dt,
            color=color
        )
        db.add(new_event)
        db.commit()
        db.refresh(new_event)
        print(f"[API] Event created successfully: ID {new_event.event_id}")

        # Return the created event data
        created_event_data = {
            "event_id": new_event.event_id,
            "id": new_event.event_id,
            "title": new_event.title,
            "start": new_event.start_time.isoformat(),
            "end": new_event.end_time.isoformat(),
            "description": new_event.description,
            "color": new_event.color,
            "type": new_event.color
        }
        return jsonify(created_event_data), 201

    except ValueError:
         return jsonify({"message": "User ID không hợp lệ"}), 400
    except Exception as e:
        if db: db.rollback()
        print(f"Lỗi tạo sự kiện lịch:")
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi tạo sự kiện: {str(e)}"}), 500
    finally:
        if db: db.close()

# PUT Event (IMPLEMENTED)
@app.route('/api/calendar/events/<int:event_id>', methods=['PUT'])
def update_calendar_event(event_id):
    data = request.get_json()
    user_id = data.get('user_id')
    # Get updated fields
    title = data.get('title')
    start_time_iso = data.get('start_time')
    end_time_iso = data.get('end_time')
    description = data.get('description')
    color = data.get('color')

    if not user_id: return jsonify({"message": "Thiếu user ID"}), 400

    db: Session = None
    try:
        user_id_int = int(user_id)
        db = next(get_db())

        event = db.query(CalendarEvent).filter(
            CalendarEvent.event_id == event_id,
            CalendarEvent.user_id == user_id_int # Ensure user owns the event
        ).first()

        if not event:
            return jsonify({"message": "Không tìm thấy sự kiện hoặc bạn không có quyền sửa"}), 404

        # Update fields if provided in request
        if title is not None: event.title = title
        if description is not None: event.description = description
        if color is not None: event.color = color

        # Parse and update times if provided
        start_dt = event.start_time # Keep old value if not provided
        end_dt = event.end_time
        time_updated = False
        try:
            if start_time_iso:
                start_dt = datetime.fromisoformat(start_time_iso.replace('Z', '+00:00'))
                if start_dt.tzinfo is None: start_dt = start_dt.replace(tzinfo=timezone.utc)
                time_updated = True
            if end_time_iso:
                end_dt = datetime.fromisoformat(end_time_iso.replace('Z', '+00:00'))
                if end_dt.tzinfo is None: end_dt = end_dt.replace(tzinfo=timezone.utc)
                time_updated = True
        except ValueError as ve:
            return jsonify({"message": f"Định dạng start_time/end_time không hợp lệ: {ve}"}), 400

        # Validate times only if they were updated
        if time_updated and end_dt < start_dt:
            return jsonify({"message": "Thời gian kết thúc không thể trước thời gian bắt đầu"}), 400

        event.start_time = start_dt
        event.end_time = end_dt

        db.commit()
        db.refresh(event)
        print(f"[API] Event updated successfully: ID {event.event_id}")

        updated_event_data = {
            "event_id": event.event_id,
            "id": event.event_id,
            "title": event.title,
            "start": event.start_time.isoformat(),
            "end": event.end_time.isoformat(),
            "description": event.description,
            "color": event.color,
            "type": event.color
        }
        return jsonify(updated_event_data), 200

    except ValueError:
         return jsonify({"message": "User ID không hợp lệ"}), 400
    except Exception as e:
        if db: db.rollback()
        print(f"Lỗi cập nhật sự kiện lịch {event_id}:")
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi cập nhật sự kiện: {str(e)}"}), 500
    finally:
        if db: db.close()

# DELETE Event (IMPLEMENTED)
@app.route('/api/calendar/events/<int:event_id>', methods=['DELETE'])
def delete_calendar_event(event_id):
    user_id = request.args.get('userId') # Get userId from query param
    if not user_id: return jsonify({"message": "Thiếu user ID"}), 400

    db: Session = None
    try:
        user_id_int = int(user_id)
        db = next(get_db())

        event = db.query(CalendarEvent).filter(
            CalendarEvent.event_id == event_id,
            CalendarEvent.user_id == user_id_int # Ensure user owns the event
        ).first()

        if not event:
            return jsonify({"message": "Không tìm thấy sự kiện hoặc bạn không có quyền xóa"}), 404

        db.delete(event)
        db.commit()
        print(f"[API] Event deleted successfully: ID {event_id}")

        return jsonify({"message": f"Đã xóa sự kiện {event_id}"}), 200

    except ValueError:
         return jsonify({"message": "User ID không hợp lệ"}), 400
    except Exception as e:
        if db: db.rollback()
        print(f"Lỗi xóa sự kiện lịch {event_id}:")
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi xóa sự kiện: {str(e)}"}), 500
    finally:
        if db: db.close()            

@socketio.on('connect')
def handle_connect():
    """Xử lý khi có client mới kết nối."""
    print(f"🔌 Client connected: {request.sid}")


# THAY THẾ HÀM CŨ BẰNG HÀM NÀY (Hàm này có thể bạn chưa có, hãy thêm nó vào)
@socketio.on('leave_room')
def handle_leave_room(data):
    """Xử lý khi user chủ động rời phòng (nhưng chưa disconnect)."""
    user_sid = request.sid
    room_id = data.get('room_id')
    
    if room_id in study_rooms and user_sid in study_rooms[room_id]['users']:
        # Pop user_info_dict, rồi lấy username
        user_info = study_rooms[room_id]['users'].pop(user_sid)
        username_left = user_info.get('username', 'Anonymous') # <-- Sửa ở đây
        leave_room(room_id) 
        
        print(f"👋 User {username_left} (sid: {user_sid}) CLEANLY left room {room_id}")
        
        emit('user_left', {'sid': user_sid, 'username': username_left}, room=room_id, skip_sid=user_sid)
        # Cập nhật danh sách user
        current_usernames = [info['username'] for info in study_rooms[room_id]['users'].values()]
        emit('room_users', current_usernames, room=room_id_to_leave)
    else:
        print(f"⚠️ Warning: 'leave_room' received for non-existent room/user {room_id} / {user_sid}")



# (Trong app.py)
# DÁN HÀM MỚI NÀY VÀO (khoảng dòng 665, ngay trên handle_join_room)

@socketio.on('create_room')
def handle_create_room(data):
    """Xử lý yêu cầu tạo phòng mới."""
    user_sid = request.sid
    # Lấy thêm thông tin user
    username = data.get('username', 'Anonymous')
    user_id = data.get('user_id') 
    avatar_url = data.get('avatar_url') # <-- LẤY AVATAR
    
    room_id = data.get('room_id') 
    secret = data.get('secret') 

    if not room_id:
        emit('error', {'message': 'Thiếu Room ID'})
        return
            
    if room_id in study_rooms:
        emit('error', {'message': f'Phòng {room_id} đã tồn tại!'})
        return
    
    default_timer_state = {
        'mode': 'focus', 'duration': 25 * 60, 'timeLeft': 25 * 60, 'isRunning': False, 'cycle': 1
    }

    # Sửa cách lưu 'users':
    study_rooms[room_id] = {
        'users': { 
            # Lưu đầy đủ thông tin user
            user_sid: {'username': username, 'user_id': user_id, 'avatar_url': avatar_url} 
        },
        'secret': secret,
        'timer_state': default_timer_state
    }
    join_room(room_id) 
    print(f"✅ Room created: {room_id} by {username} (sid: {user_sid}).")
        
    # Gửi lại danh sách user (rỗng, vì mới tạo)
    emit('room_joined', { 
        'room_id': room_id, 
        'users': {}, # <-- Mới tạo nên chưa có ai khác
        'is_private': bool(secret),
        'timer_state': default_timer_state
    })


# THAY THẾ HÀM CŨ BẰNG HÀM NÀY
@socketio.on('join_room')
def handle_join_room(data):
    """Xử lý yêu cầu tham gia phòng."""
    user_sid = request.sid
    # Lấy thêm thông tin user
    username = data.get('username', 'Anonymous')
    user_id = data.get('user_id') 
    avatar_url = data.get('avatar_url') # <-- LẤY AVATAR
    
    room_id = data.get('room_id')
    secret_attempt = data.get('secret')

    if not room_id or not username:
         emit('error', {'message': 'Thiếu Room ID hoặc Username'})
         return

    if room_id not in study_rooms:
        emit('error', {'message': f'Phòng {room_id} không tồn tại!'})
        return
        
    room_data = study_rooms[room_id]

    if room_data['secret'] and room_data['secret'] != secret_attempt:
        emit('error', {'message': 'Sai mã bí mật!'})
        return
        
    # Lấy danh sách user hiện tại (trước khi tham gia)
    current_users_dict = {
        s_id: {
            'username': u_info['username'],
            'avatar_url': u_info.get('avatar_url') # Lấy avatar của họ
        }
        for s_id, u_info in room_data['users'].items()
    }

    # Thêm user mới vào phòng
    room_data['users'][user_sid] = {'username': username, 'user_id': user_id, 'avatar_url': avatar_url}
    join_room(room_id)
    print(f"👍 User {username} (sid: {user_sid}) joined room {room_id}")

    # 1. Gửi thông tin phòng và danh sách user CŨ cho người vừa join
    emit('room_joined', { 
        'room_id': room_id, 
        'users': current_users_dict, # <-- Gửi dict user đã có trong phòng
        'is_private': bool(room_data['secret']),
        'timer_state': room_data['timer_state']
    })
    
    # 2. Thông báo cho những người KHÁC (chỉ gửi info người mới)
    emit('user_joined', {
        'sid': user_sid, 
        'user_info': {'username': username, 'avatar_url': avatar_url} # <-- Gửi đầy đủ info
        }, room=room_id, skip_sid=user_sid)

# (Các handler cho signaling WebRTC, chat, Pomodoro sẽ thêm sau)
@socketio.on('ready')
def handle_ready(data):
    """
    Client thông báo sẵn sàng bắt đầu WebRTC handshake.
    Server thông báo cho những người khác trong phòng.
    """
    user_sid = request.sid
    room_id = data.get('room_id')
    username = study_rooms.get(room_id, {}).get('users', {}).get(user_sid, 'Unknown')
    
    if room_id in study_rooms:
        print(f"🚦 User {username} (sid: {user_sid}) is ready in room {room_id}")
        # Thông báo cho TẤT CẢ những người khác (trừ chính người gửi)
        emit('user_ready', {'sid': user_sid, 'username': username}, room=room_id, skip_sid=user_sid)
    else:
        print(f"⚠️ Warning: 'ready' received for non-existent room {room_id}")


@socketio.on('signal')
def handle_signal(data):
    """
    Chuyển tiếp tin nhắn tín hiệu WebRTC (SDP or ICE) đến người nhận cụ thể.
    """
    user_sid = request.sid
    room_id = data.get('room_id')
    target_sid = data.get('target_sid') # SID của người cần nhận tín hiệu
    signal_data = data.get('signal') # Dữ liệu SDP (offer/answer) hoặc ICE candidate
    
    if not target_sid or not signal_data or not room_id:
        print("⚠️ Invalid signal message received")
        return
        
    # Gửi tín hiệu trực tiếp đến target_sid (chỉ người đó nhận được)
    # Chúng ta cũng gửi kèm sid của người gửi để người nhận biết trả lời ai
    print(f"📡 Relaying signal from {user_sid} to {target_sid} in room {room_id}")
    emit('signal', {'sender_sid': user_sid, 'signal': signal_data}, room=target_sid)
      

# THAY THẾ TOÀN BỘ HÀM run_room_timer CŨ BẰNG HÀM NÀY
def run_room_timer(room_id):
    """Hàm chạy nền để đếm ngược timer cho một phòng."""
    print(f"⏰ Starting timer loop for room {room_id}")
    
    # Ghi lại thời điểm bắt đầu (chỉ khi bắt đầu phiên focus)
    session_start_time = None
    if study_rooms.get(room_id) and study_rooms[room_id]['timer_state']['mode'] == 'focus':
        session_start_time = datetime.now()

    while True:
        room_data = study_rooms.get(room_id)
        if not room_data or not room_data['timer_state']['isRunning']:
            print(f"🛑 Stopping timer loop for room {room_id} (paused or room deleted)")
            if room_id in room_timer_tasks:
                 try:
                      del room_timer_tasks[room_id]
                 except KeyError:
                      pass 
            break 

        timer_state = room_data['timer_state']

        if timer_state['timeLeft'] > 0:
            timer_state['timeLeft'] -= 1
            socketio.emit('timer_update', timer_state, room=room_id)
            socketio.sleep(1) 
        else:
            # --- HẾT GIỜ ---
            print(f"🎉 Timer finished for room {room_id}. Mode was: {timer_state['mode']}")
            
            # --- LƯU LỊCH SỬ NẾU LÀ PHIÊN FOCUS VỪA KẾT THÚC ---
            if timer_state['mode'] == 'focus':
                start_time_to_save = session_start_time or (datetime.now() - timedelta(seconds=timer_state['duration']))
                end_time = datetime.now()
                duration_minutes = timer_state['duration'] // 60
                
                db_session: Session = next(get_db())
                try:
                    # Lấy user_id từ room_data
                    user_ids_to_save = [
                        u_info['user_id'] for u_info in room_data['users'].values() 
                        if u_info.get('user_id') # Chỉ lấy những ai có user_id
                    ]
                    
                    if not user_ids_to_save:
                         print(f"💾 No user_ids found to save Pomodoro history for room {room_id}.")
                    else:
                        for user_id_in_room in user_ids_to_save:
                            new_session = PomodoroSession(
                                user_id=user_id_in_room, 
                                start_time=start_time_to_save, 
                                end_time=end_time,
                                duration_minutes=duration_minutes,
                                type='focus'
                            )
                            db_session.add(new_session)
                        
                        db_session.commit()
                        print(f"💾 Pomodoro history saved for room {room_id} for users: {user_ids_to_save}")

                except Exception as e:
                    db_session.rollback()
                    print(f"❌ Error saving Pomodoro session for room {room_id}: {e}")
                finally:
                    db_session.close()
            # --- KẾT THÚC LƯU LỊCH SỬ ---

            # Logic chuyển mode (giữ nguyên)
            if timer_state['mode'] == 'focus':
                timer_state['mode'] = 'break'
                timer_state['cycle'] = (timer_state['cycle'] % 4) + 1 
                new_duration = (5 * 60) if timer_state['cycle'] != 1 else (15*60) 
            else: 
                timer_state['mode'] = 'focus'
                new_duration = 25 * 60
                
            timer_state['duration'] = new_duration
            timer_state['timeLeft'] = new_duration
            timer_state['isRunning'] = False 
            
            socketio.emit('timer_update', timer_state, room=room_id) 
            
            if room_id in room_timer_tasks:
                del room_timer_tasks[room_id] 
            break 
            
    print(f"🏁 Timer loop finished or stopped for room {room_id}")
    


@socketio.on('start_timer')
def handle_start_timer(data):
    """Client yêu cầu bắt đầu/tiếp tục timer."""
    user_sid = request.sid
    room_id = data.get('room_id')

    if room_id in study_rooms and user_sid in study_rooms[room_id]['users']:
        timer_state = study_rooms[room_id]['timer_state']
        if not timer_state['isRunning'] and timer_state['timeLeft'] > 0:
            timer_state['isRunning'] = True
            print(f"▶️ Timer started/resumed for room {room_id}")

            if room_id in room_timer_tasks:
                try:
                    room_timer_tasks[room_id].kill()
                except:
                    pass

            room_timer_tasks[room_id] = socketio.start_background_task(run_room_timer, room_id)
            emit('timer_update', timer_state, room=room_id)
    else:
        emit('error', {'message': 'Không thể bắt đầu timer: Phòng không tồn tại hoặc bạn chưa vào phòng.'})


@socketio.on('pause_timer')
def handle_pause_timer(data):
    """Client yêu cầu tạm dừng timer."""
    user_sid = request.sid
    room_id = data.get('room_id')

    if room_id in study_rooms and user_sid in study_rooms[room_id]['users']:
        timer_state = study_rooms[room_id]['timer_state']
        if timer_state['isRunning']:
            timer_state['isRunning'] = False
            print(f"⏸️ Timer paused for room {room_id}")

            if room_id in room_timer_tasks:
                del room_timer_tasks[room_id]

            emit('timer_update', timer_state, room=room_id)
    else:
        emit('error', {'message': 'Không thể dừng timer: Phòng không tồn tại hoặc bạn chưa vào phòng.'})

# (Trong app.py)
# THAY THẾ TOÀN BỘ HÀM NÀY:
def _save_manual_stop_session(room_id: str, timer_state: dict):
    """Hàm helper để lưu session khi bị dừng/reset thủ công."""
    
    # SỬA LỖI LOGIC: Chỉ kiểm tra 'focus', không cần biết 'isRunning'
    if timer_state['mode'] != 'focus':
        print(f"💾 Not a focus session. Not saving.")
        return 

    print(f"💾 Saving manually stopped focus session for room {room_id}...")
    db_session: Session = next(get_db())
    try:
        room_data = study_rooms.get(room_id)
        if not room_data: return

        # Tính toán thời gian đã chạy
        duration_total = timer_state['duration']
        time_left = timer_state['timeLeft']
        time_elapsed_seconds = duration_total - time_left
        
        # Chỉ lưu nếu đã chạy ít nhất 1 phút
        if time_elapsed_seconds < 60:
            print(f"💾 Session for room {room_id} was less than 60s. Not saving.")
            db_session.close() # Nhớ đóng session
            return

        duration_minutes_intended = duration_total // 60
        end_time = datetime.now()
        start_time_approx = end_time - timedelta(seconds=time_elapsed_seconds)

        user_ids_to_save = [
            u_info['user_id'] for u_info in room_data['users'].values() 
            if u_info.get('user_id')
        ]
        
        if not user_ids_to_save: 
            print(f"💾 No user_ids found in room {room_id} to save.")
            db_session.close() # Nhớ đóng session
            return

        for user_id_in_room in user_ids_to_save:
            new_session = PomodoroSession(
                user_id=user_id_in_room, 
                start_time=start_time_approx, 
                end_time=end_time,
                duration_minutes=duration_minutes_intended, # Vẫn lưu thời lượng dự định
                type='focus'
            )
            db_session.add(new_session)
        
        db_session.commit()
        print(f"💾 Manually stopped session saved for users: {user_ids_to_save}")
    except Exception as e:
        db_session.rollback()
        print(f"❌ Error saving manually stopped session: {e}")
    finally:
        db_session.close() # Luôn đóng session
        
        
# (Trong app.py)
# THAY THẾ TOÀN BỘ HÀM NÀY:
@socketio.on('reset_timer')
def handle_reset_timer(data):
    """Client yêu cầu reset timer về trạng thái focus ban đầu."""
    user_sid = request.sid
    room_id = data.get('room_id')

    if room_id in study_rooms and user_sid in study_rooms[room_id]['users']:
        timer_state = study_rooms[room_id]['timer_state']
        
        # --- LƯU SESSION CŨ (Bất kể đang chạy hay pause) ---
        _save_manual_stop_session(room_id, timer_state)
        # --- KẾT THÚC LƯU ---
        
        timer_state['isRunning'] = False
        timer_state['mode'] = 'focus'
        timer_state['duration'] = 25 * 60
        timer_state['timeLeft'] = 25 * 60
        timer_state['cycle'] = 1

        print(f"🔄 Timer reset for room {room_id}")

        if room_id in room_timer_tasks:
            try:
                del room_timer_tasks[room_id] # Chỉ cần del, không cần kill
            except:
                pass

        emit('timer_update', timer_state, room=room_id)
    else:
        emit('error', {'message': 'Không thể reset timer: Phòng không tồn tại hoặc bạn chưa vào phòng.'})
@socketio.on('send_message')
def handle_send_message(data):
    """Nhận tin nhắn chat từ client và broadcast cho phòng."""
    user_sid = request.sid
    room_id = data.get('room_id')
    message_text = data.get('message')

    if not room_id or not message_text or room_id not in study_rooms:
        print(f"⚠️ Invalid chat message data from {user_sid}")
        return

    # Lấy user info dict của người gửi
    user_info = study_rooms[room_id]['users'].get(user_sid, {})
    sender_username = user_info.get('username', 'Ẩn danh')
    sender_avatar_url = user_info.get('avatar_url') # <-- LẤY AVATAR

    print(f"💬 Message in room {room_id} from {sender_username}: {message_text}")

    # Gửi tin nhắn đến TẤT CẢ mọi người trong phòng (bao gồm cả người gửi)
    emit('new_message', {
        'username': sender_username, 
        'message': message_text,
        'sid': user_sid, 
        'avatar_url': sender_avatar_url # <-- GỬI KÈM AVATAR
        }, 
        room=room_id)
    
@app.route('/api/pomodoro/session', methods=['POST'])
def save_pomodoro_session():
    data = request.get_json()
    user_id = data.get('userId')
    start_time_iso = data.get('startTime') # Expect ISO string from frontend
    end_time_iso = data.get('endTime')     # Expect ISO string from frontend
    duration_minutes = data.get('duration')
    session_type = data.get('type', 'focus') # Default to 'focus' if not provided

    if not all([user_id, start_time_iso, end_time_iso, duration_minutes]):
        return jsonify({"message": "Thiếu thông tin session (userId, startTime, endTime, duration)"}), 400

    db: Session = None
    try:
        # Convert ISO strings back to datetime objects
        # Handle potential timezone info (Python datetime expects specific formats or naive)
        # Using fromisoformat handles many common ISO formats
        start_time_dt = datetime.fromisoformat(start_time_iso.replace('Z', '+00:00')) # Handle 'Z' for UTC
        end_time_dt = datetime.fromisoformat(end_time_iso.replace('Z', '+00:00'))

        db = next(get_db())
        new_session = PomodoroSession(
            user_id=user_id,
            start_time=start_time_dt,
            end_time=end_time_dt,
            duration_minutes=duration_minutes,
            type=session_type
            # task_id = data.get('taskId') # Add this later if linking tasks
        )
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        
        print(f"💾 Pomodoro session saved for user {user_id}. ID: {new_session.session_id}")
        # Return the saved session ID or just a success message
        return jsonify({"message": "Lưu session thành công!", "sessionId": new_session.session_id}), 201 

    except ValueError as ve:
         print(f"Lỗi parse ISO date string: {ve}")
         return jsonify({"message": f"Định dạng startTime/endTime không hợp lệ: {ve}"}), 400
    except Exception as e:
        if db: db.rollback()
        print(f"Lỗi lưu Pomodoro session: {e}")
        return jsonify({"message": f"Lỗi máy chủ khi lưu session: {str(e)}"}), 500
    finally:
        if db:
            db.close()    

def get_user_id_from_token():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None, "Missing or invalid Authorization header"

    token = auth_header.split(' ')[1]
    secret_key = app.config['SECRET_KEY']
    print(f"🔑 SECRET_KEY đang dùng để giải mã: '{secret_key}'")
    if not secret_key:
        return None, "Server SECRET_KEY not configured"

    try:
        payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        return payload.get('user_id'), None # Trả về user_id và không có lỗi
    except jwt.ExpiredSignatureError:
        return None, "Token has expired"
    except jwt.InvalidTokenError:
        return None, "Invalid token"
    except Exception as e:
        print(f"Token decode error: {e}")
        return None, f"Token decode error: {str(e)}"
    
    
# ✅ API: Lấy danh sách Workspaces của người dùng
@app.route('/api/workspaces', methods=['GET'])
def get_workspaces():
    print("--- GET /api/workspaces ĐƯỢC GỌI ---")
    
    # 1. Xác thực người dùng qua token
    user_id, token_error = get_user_id_from_token()
    if token_error:
        print(f"Lỗi xác thực token: {token_error}")
        return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401
    if not user_id:
         return jsonify({"message": "Không thể xác định người dùng từ token"}), 401

    print(f"Đang lấy workspaces cho user_id: {user_id}")
    db: Session = None
    try:
        db = next(get_db())

        # 2. Truy vấn workspaces user là owner HOẶC member
        # Sử dụng join để lấy cả workspaces user là thành viên
        user_workspaces = db.query(Workspace).join(
            WorkspaceMember, Workspace.workspace_id == WorkspaceMember.workspace_id
        ).filter(
            (Workspace.owner_id == user_id) | (WorkspaceMember.user_id == user_id)
        ).distinct(Workspace.workspace_id).order_by(
            # 🔥 THÊM Workspace.workspace_id VÀO ĐẦU ORDER BY
            Workspace.workspace_id,
            desc(Workspace.starred), 
            desc(Workspace.updated_at)
        ).all()
        # distinct() để tránh lặp workspace nếu user vừa là owner vừa là member
        # order_by() để ưu tiên hiển thị starred và workspace mới nhất lên đầu

        # 3. Format dữ liệu trả về cho frontend
        workspaces_list = []
        for ws in user_workspaces:
             # Tìm vai trò của user trong workspace này
             member_entry = db.query(WorkspaceMember).filter(
                  WorkspaceMember.workspace_id == ws.workspace_id,
                  WorkspaceMember.user_id == user_id
             ).first()
             user_role = member_entry.role if member_entry else 'unknown' # Lấy role, fallback
             
             # (Tạm thời) Đếm số lượng task, note, member (có thể tối ưu sau)
             task_count = db.query(Task).filter(Task.workspace_id == ws.workspace_id).count()
             note_count = db.query(Note).filter(Note.workspace_id == ws.workspace_id).count()
             member_count = db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == ws.workspace_id).count()

             workspaces_list.append({
                "id": ws.workspace_id,
                "name": ws.name,
                "description": ws.description,
                "type": ws.type,
                "color": ws.color,
                "icon": ws.icon,
                "starred": ws.starred,
                # Thông tin frontend cần (dựa theo Workspaces.jsx)
                "tasksCount": task_count,
                "notesCount": note_count,
                "members": member_count,
                "role": user_role, # Vai trò của user hiện tại trong workspace này
                "lastUpdated": ws.updated_at.strftime("%d/%m/%Y") # Format ngày
            })

        print(f"Tìm thấy {len(workspaces_list)} workspaces cho user {user_id}")
        return jsonify(workspaces_list), 200

    except Exception as e:
        if db: db.rollback()
        print(f"Lỗi lấy workspaces:")
        traceback.print_exc() # In chi tiết lỗi ra terminal backend
        return jsonify({"message": f"Lỗi server khi lấy workspaces: {str(e)}"}), 500
    finally:
        if db: db.close()    

# ✅ API: Tạo Workspace mới (POST /api/workspaces)
@app.route('/api/workspaces', methods=['POST'])
def create_workspace():
    print("--- POST /api/workspaces ĐƯỢC GỌI ---")

    # 1. Xác thực người dùng (BẮT BUỘC)
    user_id, token_error = get_user_id_from_token()
    if token_error:
        print(f"Lỗi xác thực token: {token_error}")
        return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    data = request.get_json()
    name = data.get('name')
    description = data.get('description')
    ws_type = data.get('type', 'private')
    color = data.get('color', '#667eea')
    icon = data.get('icon', '💼')

    if not name:
        return jsonify({"message": "Thiếu tên Workspace"}), 400

    db: Session = None
    try:
        db = next(get_db())

        # 2. Tạo Workspace mới
        new_workspace = Workspace(
            owner_id=user_id,
            name=name,
            description=description,
            type=ws_type,
            color=color,
            icon=icon
        )
        db.add(new_workspace)
        db.flush() # Lấy workspace_id trước khi commit

        # 3. Thêm người tạo làm thành viên (Owner)
        member_owner = WorkspaceMember(
            workspace_id=new_workspace.workspace_id,
            user_id=user_id,
            role='owner'
        )
        db.add(member_owner)
        
        # 4. TẠO BOARD MẶC ĐỊNH CHO WORKSPACE (RẤT QUAN TRỌNG)
        default_board = Board(
            workspace_id=new_workspace.workspace_id,
            name='Kanban Board'
        )
        db.add(default_board)
        db.flush() # Lấy board_id
        
        # 5. TẠO 3 LIST MẶC ĐỊNH CHO BOARD
        lists_data = [
            {'board_id': default_board.board_id, 'title': 'To Do', 'position': 1},
            {'board_id': default_board.board_id, 'title': 'In Progress', 'position': 2},
            {'board_id': default_board.board_id, 'title': 'Done', 'position': 3}
        ]
        db.add_all([BoardList(**list_data) for list_data in lists_data])


        db.commit()
        db.refresh(new_workspace)

        # 6. Trả về Workspace đã tạo
        return jsonify({
            "id": new_workspace.workspace_id,
            "name": new_workspace.name,
            "description": new_workspace.description,
            "type": new_workspace.type,
            "color": new_workspace.color,
            "icon": new_workspace.icon,
            "starred": new_workspace.starred,
            "tasksCount": 0,
            "notesCount": 0,
            "members": 1,
            "role": 'owner',
            "lastUpdated": new_workspace.updated_at.strftime("%d/%m/%Y")
        }), 201

    except Exception as e:
        if db: db.rollback()
        print(f"Lỗi tạo workspace: {e}")
        return jsonify({"message": f"Lỗi server khi tạo workspace: {str(e)}"}), 500
    finally:
        if db: db.close()


# ✅ API: Lấy chi tiết Workspace (GET /api/workspaces/<id>)
@app.route('/api/workspaces/<int:workspace_id>', methods=['GET'])
def get_workspace_detail(workspace_id):
    print(f"--- GET /api/workspaces/{workspace_id} ĐƯỢC GỌI ---")
    
    # 1. Xác thực người dùng (Lấy user_id)
    user_id, token_error = get_user_id_from_token()
    if token_error:
        return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    db: Session = None
    try:
        db = next(get_db())

        # 2. Truy vấn Workspace chính
        workspace = db.query(Workspace).filter(Workspace.workspace_id == workspace_id).first()
        if not workspace:
            return jsonify({"message": "Workspace không tồn tại"}), 404
        
        # 3. Kiểm tra user có phải là thành viên/owner không
        is_member = db.query(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id
        ).first()
        
        if not is_member and workspace.type == 'private':
            return jsonify({"message": "Bạn không có quyền truy cập workspace này"}), 403
            
        # 4. Lấy Board (Giả sử chỉ có một board chính)
        board = db.query(Board).filter(Board.workspace_id == workspace_id).first()
        if not board:
            return jsonify({"message": "Không tìm thấy board chính cho workspace này"}), 404
            
        # 5. Lấy Lists và Cards
        lists_db = db.query(BoardList).filter(BoardList.board_id == board.board_id).order_by(BoardList.position).all()
        
        lists_data = []
        for lst in lists_db:
            # Truy vấn cards cho từng list
            cards_db = db.query(BoardCard).filter(BoardCard.list_id == lst.list_id).order_by(BoardCard.position).all()
            
            cards_data = []
            for card in cards_db:
                 cards_data.append({
                    "id": card.card_id,
                    "title": card.title,
                    "description": card.description,
                    "priority": card.priority,
                    "assignee": card.assignee_id,
                    "listId": lst.list_id
                 })
            
            lists_data.append({
                "id": lst.list_id,
                "title": lst.title,
                "cards": cards_data
            })
            
        # 6. Lấy danh sách thành viên (mock)
        member_list = [{
            "id": m.user_id,
            "name": db.query(User.username).filter(User.user_id == m.user_id).scalar(),
            "email": db.query(User.email).filter(User.user_id == m.user_id).scalar(),
            "role": m.role,
            "joinedDate": m.joined_at.strftime("%d/%m/%Y"),
            "avatar": "👤" # Placeholder
        } for m in db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == workspace_id).all()]
        
        # 7. Trả về toàn bộ dữ liệu chi tiết
        return jsonify({
            "workspace": {
                "id": workspace.workspace_id,
                "name": workspace.name,
                "description": workspace.description,
                "type": workspace.type,
                "color": workspace.color,
                "icon": workspace.icon,
                "starred": workspace.starred
            },
            "lists": lists_data,
            "members": member_list
        }), 200

    except Exception as e:
        if db: db.rollback()
        print(f"Lỗi lấy chi tiết workspace {workspace_id}:")
        traceback.print_exc()
        return jsonify({"message": f"Không thể tải workspace. Vui lòng thử lại. Lỗi server: {str(e)}"}), 500
    finally:
        if db: db.close()

# ✅ API: Mời thành viên mới vào Workspace
@app.route('/api/workspaces/<int:workspace_id>/invite', methods=['POST'])
def invite_member(workspace_id):
    print(f"--- POST /api/workspaces/{workspace_id}/invite ĐƯỢC GỌI ---")
    
    # 1. Xác thực người dùng (Lấy user_id)
    inviter_id, token_error = get_user_id_from_token()
    if token_error:
        return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    data = request.get_json()
    email_to_invite = data.get('email')
    target_role = data.get('role', 'member')

    if not email_to_invite:
        return jsonify({"error": "Thiếu email để mời"}), 400

    db: Session = None
    try:
        db = next(get_db())

        # 2. Kiểm tra quyền (chỉ owner/admin mới được mời - giả sử)
        inviter_member_entry = db.query(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == inviter_id
        ).first()
        
        if not inviter_member_entry or inviter_member_entry.role not in ['owner', 'admin']:
            return jsonify({"error": "Bạn không có quyền mời thành viên vào Workspace này"}), 403

        # 3. Tìm user được mời trong hệ thống
        user_to_invite = db.query(User).filter(User.email == email_to_invite).first()
        if not user_to_invite:
            # Gửi email mời đăng ký (tùy chọn)
            return jsonify({"error": "Người dùng với email này không tồn tại trong hệ thống"}), 404
            
        # 4. Kiểm tra xem user đã là thành viên chưa
        is_already_member = db.query(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_to_invite.user_id
        ).first()

        if is_already_member:
            return jsonify({"error": f"Người dùng {user_to_invite.username} đã là thành viên"}), 400

        # 5. Thêm thành viên vào bảng WorkspaceMember
        new_member_entry = WorkspaceMember(
            workspace_id=workspace_id,
            user_id=user_to_invite.user_id,
            role=target_role
        )
        db.add(new_member_entry)
        db.commit()

        # 6. Trả về thông tin thành viên vừa thêm (giống format frontend mong muốn)
        return jsonify({
            "message": f"Đã mời {user_to_invite.username} thành công!",
            "member": {
                "id": user_to_invite.user_id,
                "name": user_to_invite.username,
                "email": user_to_invite.email,
                "role": target_role,
                "joinedDate": new_member_entry.joined_at.strftime("%d/%m/%Y"),
                "avatar": user_to_invite.avatar_url or "👤"
            }
        }), 201

    except Exception as e:
        if db: db.rollback()
        print(f"Lỗi mời thành viên: {e}")
        traceback.print_exc()
        return jsonify({"error": f"Lỗi server khi mời thành viên: {str(e)}"}), 500
    finally:
        if db: db.close()
        
        
# ✅ API: Thêm Card mới vào List
@app.route('/api/workspaces/<int:workspace_id>/lists/<int:list_id>/cards', methods=['POST'])
def add_card(workspace_id, list_id):
    print(f"--- POST /api/workspaces/{workspace_id}/lists/{list_id}/cards ĐƯỢC GỌI ---")
    
    # 1. Xác thực người dùng
    user_id, token_error = get_user_id_from_token()
    if token_error:
        return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    data = request.get_json()
    title = data.get('title')
    priority = data.get('priority', 'medium')
    description = data.get('description', None)

    if not title:
        return jsonify({"error": "Thiếu tiêu đề card"}), 400

    db: Session = None
    try:
        db = next(get_db())

        # 2. Kiểm tra List tồn tại
        board_list = db.query(BoardList).filter(BoardList.list_id == list_id).first()
        if not board_list:
            return jsonify({"error": "List không tồn tại"}), 404
            
        # 3. Tính toán vị trí mới (position = số lượng cards hiện có)
        current_card_count = db.query(BoardCard).filter(BoardCard.list_id == list_id).count()
        
        # 4. Tạo Card mới
        new_card = BoardCard(
            list_id=list_id,
            title=title,
            description=description,
            priority=priority,
            # Assignee_id có thể được thêm vào sau nếu cần
            position=current_card_count # Đặt vị trí ở cuối
        )
        db.add(new_card)
        db.commit()
        db.refresh(new_card)

        # 5. Trả về Card vừa tạo
        return jsonify({
            "id": new_card.card_id,
            "title": new_card.title,
            "description": new_card.description,
            "priority": new_card.priority,
            "listId": new_card.list_id,
            "assignee": new_card.assignee_id or None,
            "position": new_card.position
        }), 201

    except Exception as e:
        if db: db.rollback()
        print(f"Lỗi thêm card vào list {list_id}: {e}")
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi thêm card: {str(e)}"}), 500
    finally:
        if db: db.close()        

# ✅ API: Thêm List mới vào Board mặc định của Workspace
@app.route('/api/workspaces/<int:workspace_id>/lists', methods=['POST'])
def add_list(workspace_id):
    print(f"--- POST /api/workspaces/{workspace_id}/lists ĐƯỢC GỌI ---")

    # 1. Xác thực người dùng
    user_id, token_error = get_user_id_from_token()
    if token_error:
        return jsonify({"message": f"Lỗi xác thực: {token_error}"}), 401

    data = request.get_json()
    title = data.get('title')

    if not title:
        return jsonify({"error": "Thiếu tiêu đề List"}), 400

    db: Session = None
    try:
        db = next(get_db())

        # 2. Kiểm tra quyền và tìm Board mặc định
        workspace = db.query(Workspace).filter(Workspace.workspace_id == workspace_id).first()
        board = db.query(Board).filter(Board.workspace_id == workspace_id).first()
        
        # Kiểm tra nhanh quyền (giả sử chỉ owner/admin)
        member_entry = db.query(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id
        ).first()

        if not workspace or not board:
            return jsonify({"error": "Workspace hoặc Board không tồn tại"}), 404
            
        if not member_entry or member_entry.role not in ['owner', 'admin']:
            return jsonify({"error": "Bạn không có quyền tạo List trong Workspace này"}), 403


        # 3. Tính toán position mới (cuối cùng)
        max_position = db.query(func.max(BoardList.position))\
                         .filter(BoardList.board_id == board.board_id).scalar()
        new_position = (max_position or 0) + 1
        
        # 4. Tạo List mới
        new_list = BoardList(
            board_id=board.board_id,
            title=title,
            position=new_position
        )
        db.add(new_list)
        db.commit()
        db.refresh(new_list)

        # 5. Trả về List vừa tạo (BoardList không có cards, cards được lấy riêng)
        return jsonify({
            "id": new_list.list_id,
            "title": new_list.title,
            "cards": [] # Trả về mảng rỗng cho list mới tạo
        }), 201

    except Exception as e:
        if db: db.rollback()
        print(f"Lỗi tạo list: {e}")
        traceback.print_exc()
        return jsonify({"message": f"Lỗi server khi tạo list: {str(e)}"}), 500
    finally:
        if db: db.close()

if __name__ == '__main__':
    print("🚀 Starting Flask-SocketIO server with eventlet...")
    socketio.run(app, host='::', port=5000, debug=True)
