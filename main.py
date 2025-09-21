from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Integer, String
from sqlalchemy.orm import mapped_column, Mapped
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///lausers.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)


class User(db.Model):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., "hookup", "friend"
    avatar: Mapped[str] = mapped_column(String(255), nullable=True)    # URL/path to avatar
    bio: Mapped[str] = mapped_column(String(255), nullable=True)


    def set_password(self, password: str):
        self.password = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password, password)

    def __repr__(self):
        return f"<User {self.username}>"




with app.app_context():
    db.create_all()


@app.route('/')
def home():
    return jsonify({"message": "Testing"})


@app.route("/signup", methods=["POST"])
def signup():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    category = data.get("category", "friend")  # default if not given
    avatar = data.get("avatar")
    bio = data.get("bio")

    if not username or not password:
        return jsonify({"success": False, "message": "Username and password are required"}), 400

    # Check if username already exists
    if User.query.filter_by(username=username).first():
        return jsonify({"success": False, "message": "Username already taken"}), 400

    # Create user
    new_user = User(username=username, category=category, avatar=avatar, bio=bio)
    new_user.set_password(password)

    db.session.add(new_user)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "User created successfully",
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "category": new_user.category,
            "avatar": new_user.avatar,
            "bio": new_user.bio
        }
    }), 201



@app.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"success": False, "message": "Username and password required"}), 400

    # Find user by username
    user = User.query.filter_by(username=username).first()

    if user and user.check_password(password):
        return jsonify({
            "success": True,
            "message": "Login successful",
            "user": {
                "id": user.id,
                "username": user.username,
                "category": user.category,
                "avatar": user.avatar,
                "bio" : user.bio
            }
        }), 200
    else:
        return jsonify({"success": False, "message": "Invalid username or password"}), 401



if __name__ == "__main__":
    with app.app_context():
        db.create_all()  # ensures tables are created
    app.run(debug=True)
