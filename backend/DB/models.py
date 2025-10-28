from sqlalchemy import Column, Integer, BigInteger, String, Text, Boolean, DateTime, ForeignKey, TIMESTAMP, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from DB.database import Base

class User(Base):
    __tablename__ = 'users'

    user_id = Column(BigInteger, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255))
    username = Column(String(100), unique=True, nullable=False)
    full_name = Column(String(255))
    avatar_url = Column(Text)
    auth_provider = Column(String(50), nullable=False, default='email')
    auth_provider_id = Column(String(255))
    role = Column(String(50), nullable=False, default='user')
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # Relationships
    settings = relationship('UserSetting', back_populates='user', uselist=False, cascade='all, delete-orphan')
    tags = relationship('Tag', back_populates='user', cascade='all, delete-orphan')
    workspaces = relationship('Workspace', back_populates='owner')
    tasks = relationship('Task', back_populates='creator')
    notes = relationship('Note', back_populates='creator')
    notifications = relationship('Notification', back_populates='user', cascade='all, delete-orphan')
    pomodoro_sessions = relationship('PomodoroSession', back_populates='user', cascade='all, delete-orphan')
    # Add relationship for calendar events (optional but good practice)
    calendar_events = relationship('CalendarEvent', back_populates='user', cascade='all, delete-orphan')


class UserSetting(Base):
    __tablename__ = 'usersettings'

    user_id = Column(BigInteger, ForeignKey('users.user_id', ondelete='CASCADE'), primary_key=True)
    notification_prefs = Column(JSON)
    audio_prefs = Column(JSON)

    user = relationship('User', back_populates='settings')

class Tag(Base):
    __tablename__ = 'tags'

    tag_id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    name = Column(String(100), nullable=False)
    color_hex = Column(String(7))

    user = relationship('User', back_populates='tags')


    
class Workspace(Base):
    __tablename__ = 'workspaces'
    
    workspace_id = Column(BigInteger, primary_key=True, autoincrement=True)
    owner_id = Column(BigInteger, ForeignKey('users.user_id'), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    type = Column(String(50), nullable=False, default='private')  # private, public
    color = Column(String(7), default='#667eea')
    icon = Column(String(10), default='💻')
    starred = Column(Boolean, nullable=False, default=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    
    owner = relationship('User', back_populates='workspaces')
    members = relationship('WorkspaceMember', back_populates='workspace', cascade='all, delete-orphan')
    boards = relationship('Board', back_populates='workspace', cascade='all, delete-orphan')
    tasks = relationship('Task', back_populates='workspace')
    notes = relationship('Note', back_populates='workspace')

class WorkspaceMember(Base):
    __tablename__ = 'workspace_members'
    
    member_id = Column(BigInteger, primary_key=True, autoincrement=True)
    workspace_id = Column(BigInteger, ForeignKey('workspaces.workspace_id', ondelete='CASCADE'), nullable=False)
    user_id = Column(BigInteger, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    role = Column(String(50), nullable=False, default='member')  # owner, admin, member
    joined_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    
    workspace = relationship('Workspace', back_populates='members')
    user = relationship('User')

class Board(Base):
    __tablename__ = 'boards'
    
    board_id = Column(BigInteger, primary_key=True, autoincrement=True)
    workspace_id = Column(BigInteger, ForeignKey('workspaces.workspace_id', ondelete='CASCADE'), nullable=False)
    name = Column(String(255), nullable=False, default='Main Board')
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    
    workspace = relationship('Workspace', back_populates='boards')
    lists = relationship('BoardList', back_populates='board', cascade='all, delete-orphan')

class BoardList(Base):
    __tablename__ = 'board_lists'
    
    list_id = Column(BigInteger, primary_key=True, autoincrement=True)
    board_id = Column(BigInteger, ForeignKey('boards.board_id', ondelete='CASCADE'), nullable=False)
    title = Column(String(255), nullable=False)
    position = Column(Integer, nullable=False, default=0)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    
    board = relationship('Board', back_populates='lists')
    cards = relationship('BoardCard', back_populates='list', cascade='all, delete-orphan')

class BoardCard(Base):
    __tablename__ = 'board_cards'
    
    card_id = Column(BigInteger, primary_key=True, autoincrement=True)
    list_id = Column(BigInteger, ForeignKey('board_lists.list_id', ondelete='CASCADE'), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    assignee_id = Column(BigInteger, ForeignKey('users.user_id', ondelete='SET NULL'))
    priority = Column(String(50), default='medium')  # low, medium, high
    position = Column(Integer, nullable=False, default=0)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    
    list = relationship('BoardList', back_populates='cards')
    assignee = relationship('User')

class Task(Base):
    __tablename__ = 'tasks'

    task_id = Column(BigInteger, primary_key=True, autoincrement=True)
    creator_id = Column(BigInteger, ForeignKey('users.user_id'), nullable=False)
    workspace_id = Column(BigInteger, ForeignKey('workspaces.workspace_id', ondelete='CASCADE'))
    title = Column(String(255), nullable=False)
    description = Column(Text)
    deadline = Column(TIMESTAMP(timezone=True))
    priority = Column(String(50), default='medium')
    status = Column(String(50), nullable=False, default='todo')
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    creator = relationship('User', back_populates='tasks')
    workspace = relationship('Workspace', back_populates='tasks')

class Note(Base):
    __tablename__ = 'notes'

    note_id = Column(BigInteger, primary_key=True, autoincrement=True)
    creator_id = Column(BigInteger, ForeignKey('users.user_id'), nullable=False)
    workspace_id = Column(BigInteger, ForeignKey('workspaces.workspace_id', ondelete='CASCADE'))
    title = Column(String(255))
    content = Column(Text) # Corrected type
    type = Column(String(50), nullable=False, default='note')
    reminder_at = Column(TIMESTAMP(timezone=True))
    pinned = Column(Boolean, nullable=False, default=False)
    color_hex = Column(String(10), default='#e0f2fe')
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    creator = relationship('User', back_populates='notes')
    workspace = relationship('Workspace', back_populates='notes')

class Notification(Base):
    __tablename__ = 'notifications'

    notification_id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    type = Column(String(100), nullable=False)
    content = Column(Text, nullable=False)
    reference_id = Column(BigInteger)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    user = relationship('User', back_populates='notifications')

class PomodoroSession(Base):
    __tablename__ = 'pomodorosessions'

    session_id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    start_time = Column(TIMESTAMP(timezone=True), nullable=False)
    end_time = Column(TIMESTAMP(timezone=True), nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    type = Column(String(50), nullable=False)
    task_id = Column(BigInteger, ForeignKey('tasks.task_id', ondelete='SET NULL'))

    user = relationship('User', back_populates='pomodoro_sessions')


# --- CALENDAR EVENT MODEL (UPDATED) ---
class CalendarEvent(Base):
    __tablename__ = 'calendarevents'

    event_id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    start_time = Column(TIMESTAMP(timezone=True), nullable=False)
    end_time = Column(TIMESTAMP(timezone=True), nullable=False)
    # --- (MỚI) Thêm cột color ---
    color = Column(String(50), default='default') # Stores 'green', 'blue', 'default' etc.
    # --- KẾT THÚC ---
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationship back to User (optional)
    user = relationship('User', back_populates='calendar_events')


# --- SCRIPT TO CREATE/UPDATE TABLES ---
if __name__ == "__main__":
    from DB.database import engine
    print("--- Database Schema Sync ---")
    print("Applying changes defined in models.py to the database...")
    Base.metadata.drop_all(bind=engine) # Uncomment cautiously if you need a fresh start (DELETES ALL DATA)
    # print("Existing tables dropped (if uncommented).")
    Base.metadata.create_all(bind=engine) # Creates tables if they don't exist, doesn't drop existing ones
    print("✅ Database schema synchronized successfully!")
    print("   Run this script again if you modify models.py.")