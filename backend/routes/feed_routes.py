from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import desc
import os
import time
from werkzeug.utils import secure_filename

from models.user import Post, Comment, Like, User
from models.core import db
from config import Config  # <-- You already have supabase there


feed_bp = Blueprint('feed', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB


def allowed_file(filename):
    return '.' in filename and \
        filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def get_current_user():
    """Get current user using public_id from JWT"""
    current_user_identity = get_jwt_identity()
    return User.query.filter_by(public_id=current_user_identity).first()


@feed_bp.route('/posts', methods=['GET'])
@jwt_required()
def get_posts():
    """Get all posts sorted by creation date (newest first)"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        per_page = min(per_page, 50)

        # Query posts with pagination
        posts_query = Post.query.order_by(desc(Post.created_at))
        paginated_posts = posts_query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        posts_data = []
        for post in paginated_posts.items:
            post_data = post.to_dict(current_user_id=user.id)
            posts_data.append(post_data)

        return jsonify({
            "success": True,
            "message": "Posts retrieved successfully",
            "data": {
                "posts": posts_data,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": paginated_posts.total,
                    "pages": paginated_posts.pages,
                    "has_next": paginated_posts.has_next,
                    "has_prev": paginated_posts.has_prev
                }
            }
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Failed to retrieve posts: {str(e)}",
            "data": None
        }), 500


@feed_bp.route('/posts/<string:post_id>', methods=['GET'])
@jwt_required()
def get_post(post_id):
    """Get a single post by ID"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        post = Post.query.filter_by(public_id=post_id).first()

        if not post:
            return jsonify({
                "success": False,
                "message": "Post not found",
                "data": None
            }), 404

        return jsonify({
            "success": True,
            "message": "Post retrieved successfully",
            "data": post.to_dict(current_user_id=user.id)
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Failed to retrieve post: {str(e)}",
            "data": None
        }), 500


@feed_bp.route('/posts', methods=['POST'])
@jwt_required()
def create_post():
    """Create a new post"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "message": "No data provided",
                "data": None
            }), 400

        # Validate required fields
        if not data.get('text') and not data.get('image'):
            return jsonify({
                "success": False,
                "message": "Post must contain either text or image",
                "data": None
            }), 400

        # Create new post
        new_post = Post(
            user_id=user.id,
            text=data.get('text', '').strip(),
            image=data.get('image'),
            category=data.get('category'),
            location=data.get('location')
        )

        db.session.add(new_post)
        db.session.commit()

        # Emit SocketIO event if available
        if hasattr(current_app, 'socketio'):
            current_app.socketio.emit('new_post', {
                'post': new_post.to_dict(current_user_id=user.id)
            })

        return jsonify({
            "success": True,
            "message": "Post created successfully",
            "data": new_post.to_dict(current_user_id=user.id)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Failed to create post: {str(e)}",
            "data": None
        }), 500


@feed_bp.route('/posts/<string:post_id>', methods=['DELETE'])
@jwt_required()
def delete_post(post_id):
    """Delete a post (only owner can delete)"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        post = Post.query.filter_by(public_id=post_id).first()

        if not post:
            return jsonify({
                "success": False,
                "message": "Post not found",
                "data": None
            }), 404

        # Check if current user is the post owner
        if post.user_id != user.id:
            return jsonify({
                "success": False,
                "message": "You can only delete your own posts",
                "data": None
            }), 403

        db.session.delete(post)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Post deleted successfully",
            "data": None
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Failed to delete post: {str(e)}",
            "data": None
        }), 500


@feed_bp.route('/posts/<string:post_id>/like', methods=['POST'])
@jwt_required()
def like_post(post_id):
    """Like or unlike a post"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        post = Post.query.filter_by(public_id=post_id).first()

        if not post:
            return jsonify({
                "success": False,
                "message": "Post not found",
                "data": None
            }), 404

        # Check if user already liked the post
        existing_like = Like.query.filter_by(
            user_id=user.id,
            post_id=post.id
        ).first()

        if existing_like:
            # Unlike the post
            db.session.delete(existing_like)
            action = "unliked"
        else:
            # Like the post
            new_like = Like(user_id=user.id, post_id=post.id)
            db.session.add(new_like)
            action = "liked"

        db.session.commit()

        # Get updated post data
        updated_post = post.to_dict(current_user_id=user.id)

        return jsonify({
            "success": True,
            "message": f"Post {action} successfully",
            "data": {
                "post": updated_post,
                "action": action
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Failed to like post: {str(e)}",
            "data": None
        }), 500


@feed_bp.route('/posts/<string:post_id>/comments', methods=['GET'])
@jwt_required()
def get_comments(post_id):
    """Get all comments for a post"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        post = Post.query.filter_by(public_id=post_id).first()

        if not post:
            return jsonify({
                "success": False,
                "message": "Post not found",
                "data": None
            }), 404

        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        per_page = min(per_page, 100)  # Limit to 100 comments per page

        # Query comments with pagination
        comments_query = Comment.query.filter_by(post_id=post.id).order_by(desc(Comment.created_at))
        paginated_comments = comments_query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        comments_data = [comment.to_dict() for comment in paginated_comments.items]

        return jsonify({
            "success": True,
            "message": "Comments retrieved successfully",
            "data": {
                "comments": comments_data,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": paginated_comments.total,
                    "pages": paginated_comments.pages,
                    "has_next": paginated_comments.has_next,
                    "has_prev": paginated_comments.has_prev
                }
            }
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Failed to retrieve comments: {str(e)}",
            "data": None
        }), 500


@feed_bp.route('/posts/<string:post_id>/comments', methods=['POST'])
@jwt_required()
def create_comment(post_id):
    """Add a comment to a post"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        post = Post.query.filter_by(public_id=post_id).first()

        if not post:
            return jsonify({
                "success": False,
                "message": "Post not found",
                "data": None
            }), 404

        data = request.get_json()

        if not data or not data.get('text'):
            return jsonify({
                "success": False,
                "message": "Comment text is required",
                "data": None
            }), 400

        # Create new comment
        new_comment = Comment(
            user_id=user.id,
            post_id=post.id,
            text=data.get('text').strip()
        )

        db.session.add(new_comment)
        db.session.commit()

        # Emit SocketIO event if available
        if hasattr(current_app, 'socketio'):
            current_app.socketio.emit('new_comment', {
                'post_id': post.public_id,
                'comment': new_comment.to_dict()
            })

        return jsonify({
            "success": True,
            "message": "Comment added successfully",
            "data": new_comment.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Failed to add comment: {str(e)}",
            "data": None
        }), 500


@feed_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_image():
    """Upload an image to Supabase Storage and return its public URL"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        if 'image' not in request.files:
            return jsonify({"success": False, "message": "No image file provided"}), 400

        file = request.files['image']

        if file.filename == '':
            return jsonify({"success": False, "message": "No file selected"}), 400

        if not allowed_file(file.filename):
            return jsonify({
                "success": False,
                "message": f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}",
            }), 400

        # ✅ This line should be right here
        supabase = current_app.config['supabase']

        filename = secure_filename(file.filename)
        filename = f"{user.id}_{int(time.time())}_{filename}"
        file_bytes = file.read()

        # ✅ Upload to Supabase Storage
        response = supabase.storage.from_("upload").upload(filename, file_bytes)

        if hasattr(response, "status_code") and response.status_code != 200:
            return jsonify({
                "success": False,
                "message": f"Upload failed: {response.json()}",
            }), 400

        # ✅ Build permanent public URL
        image_url = f"{Config.SUPABASE_URL}/storage/v1/object/public/upload/{filename}"

        return jsonify({
            "success": True,
            "message": "Image uploaded successfully",
            "data": {"filename": filename, "url": image_url}
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Failed to upload image: {repr(e)}"
        }), 500



# Debug endpoints (optional - remove in production)
@feed_bp.route('/debug/posts', methods=['GET'])
@jwt_required()
def debug_posts():
    """Debug endpoint to see all posts in database"""
    try:
        user = get_current_user()
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        # Get all posts without pagination
        all_posts = Post.query.order_by(desc(Post.created_at)).all()

        posts_data = []
        for post in all_posts:
            post_data = {
                "id": post.public_id,
                "text": post.text,
                "user_id": post.user_id,
                "current_user_id": user.id,
                "created_at": post.created_at.isoformat() + "Z" if post.created_at else None,
                "has_user": post.user is not None,
                "user_username": post.user.username if post.user else "No user"
            }
            posts_data.append(post_data)

        return jsonify({
            "success": True,
            "message": f"Found {len(posts_data)} posts in database",
            "data": {
                "posts": posts_data,
                "total_in_db": len(all_posts)
            }
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Debug error: {str(e)}",
            "data": None
        }), 500