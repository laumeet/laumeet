import os

# Allow selecting async worker mode via env var ASYNC_WORKER
_ASYNC_WORKER = os.environ.get("ASYNC_WORKER", "eventlet").lower()

# Monkey patching - MUST be done before any other imports
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

# ✅ Load allowed origins
cors_origins_env = os.environ.get("CORS_ORIGINS", "")
cors_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
if not cors_origins:
    cors_origins = [
        "https://laumeet.vercel.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

# ✅ Create a single shared Socket.IO instance
socketio = SocketIO(
    cors_allowed_origins=cors_origins,
    async_mode=_ASYNC_WORKER if _ASYNC_WORKER in ("eventlet", "gevent", "threading") else "threading",
    manage_session=False,
    cors_credentials=True,
    logger=True,
    engineio_logger=True,
    ping_timeout=60,
    ping_interval=25,
)

print(f"🔧 Socket.IO initialized with async_mode: {_ASYNC_WORKER}")
print(f"🔧 CORS Origins: {cors_origins}")

# ✅ Shared global data (safe to import anywhere)
online_users = {}

def register_socket_events():
    """Called by app.py after the app and DB are ready."""
    from sockets import chat_events  # Import here (lazy import)
    print("✅ Socket.IO events registration complete")
    print(f"📊 Online users storage initialized: {len(online_users)} users")

__all__ = ["socketio", "online_users", "register_socket_events"]
