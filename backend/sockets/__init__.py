import os

# Allow selecting async worker mode via env var ASYNC_WORKER
_ASYNC_WORKER = os.environ.get("ASYNC_WORKER", "eventlet").lower()

# Monkey patching - MUST be done before any imports
if _ASYNC_WORKER == "eventlet":
    try:
        import eventlet
        eventlet.monkey_patch()
        print("🔧 eventlet monkey patched")
    except Exception as e:
        print(f"🔧 eventlet monkey patch failed: {e}")
        _ASYNC_WORKER = "threading"
elif _ASYNC_WORKER == "gevent":
    try:
        from gevent import monkey
        monkey.patch_all()
        print("🔧 gevent monkey patched")
    except Exception as e:
        print(f"🔧 gevent monkey patch failed: {e}")
        _ASYNC_WORKER = "threading"

from flask_socketio import SocketIO

# ✅ Get CORS origins from environment or use defaults
cors_origins = os.environ.get("CORS_ORIGINS", "").split(",") or [
    "https://laumeet.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

# Filter out empty strings and clean up
cors_origins = [origin.strip() for origin in cors_origins if origin.strip()]

# ✅ Create SINGLE shared Socket.IO instance here
socketio = SocketIO(
    cors_allowed_origins=cors_origins,  # ✅ Correct parameter name
    async_mode=_ASYNC_WORKER if _ASYNC_WORKER in ("eventlet", "gevent", "threading") else "threading",
    manage_session=False,
    cors_credentials=True,  # ✅ Allow credentials for cross-origin
    logger=True,            # ✅ Enable logging
    engineio_logger=True,   # ✅ Enable Engine.IO logging
    ping_timeout=60,        # ✅ Increase timeout for better stability
    ping_interval=25        # ✅ Reduce ping interval for faster detection
)

print(f"🔧 Socket.IO initialized with async_mode: {_ASYNC_WORKER}")
print(f"🔧 CORS Origins: {cors_origins}")

# ✅ Import event handlers to register them (this runs the @socketio.on decorators)
from . import chat_events

# Store online users (shared instance)
online_users = {}

def register_socket_events():
    """Ensure all socket events are registered."""
    print("✅ Socket.IO events registration complete")
    print(f"📊 Online users storage initialized: {len(online_users)} users")

__all__ = ['socketio', 'online_users', 'register_socket_events']