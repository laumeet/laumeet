# sockets/__init__.py
import os

# Allow selecting async worker mode via env var ASYNC_WORKER
_ASYNC_WORKER = os.environ.get("ASYNC_WORKER", "threading").lower()

# Monkey patching - MUST be done before any imports
if _ASYNC_WORKER == "eventlet":
    try:
        import eventlet
        eventlet.monkey_patch()
        print("🔧 eventlet monkey patched")
    except Exception as e:
        print(f"🔧 eventlet monkey patch failed: {e}")
elif _ASYNC_WORKER == "gevent":
    try:
        from gevent import monkey
        monkey.patch_all()
        print("🔧 gevent monkey patched")
    except Exception as e:
        print(f"🔧 gevent monkey patch failed: {e}")

from flask_socketio import SocketIO

# ✅ Create SINGLE shared Socket.IO instance here
socketio = SocketIO(
    cors_allowed_origins=[
        "https://laumeet.vercel.app",
        "https://www.laumeet.vercel.app", 
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    async_mode=_ASYNC_WORKER if _ASYNC_WORKER in ("eventlet", "gevent", "threading") else "threading",
    manage_session=False,
    cors_credentials=True,  # ✅ Allow credentials for cross-origin
    logger=True,            # ✅ Enable logging
    engineio_logger=True    # ✅ Enable Engine.IO logging
)

print(f"🔧 Socket.IO initialized with async_mode: {_ASYNC_WORKER}")

# ✅ Import event handlers to register them (this runs the @socketio.on decorators)
from . import chat_events

# Store online users (shared instance)
online_users = {}

def register_socket_events():
    """Ensure all socket events are registered."""
    print("✅ Socket.IO events registration complete")
    print(f"📊 Online users storage initialized: {len(online_users)} users")

__all__ = ['socketio', 'online_users', 'register_socket_events']