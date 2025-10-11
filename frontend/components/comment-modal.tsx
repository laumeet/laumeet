/* eslint-disable @typescript-eslint/no-explicit-any */
// components/comment-modal.tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, MoreHorizontal } from 'lucide-react';
import { feedApi } from '@/lib/axio';
import { toast } from 'sonner';

interface Comment {
  id: string;
  text: string;
  created_at: string;
  user: {
    id: string;
    username: string;
    name: string;
    pictures: string[];
  };
}

interface Post {
  id: string;
  text: string;
  image?: string;
  created_at: string;
  user: {
    id: string;
    username: string;
    name: string;
    pictures: string[];
  };
  comments_count: number;
  likes_count: number;
  has_liked: boolean;
}

interface CommentModalProps {
  post: Post;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCommentAdded: () => void;
}

export function CommentModal({ post, open, onOpenChange, onCommentAdded }: CommentModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      loadComments();
    }
  }, [open, post.id]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const response = await feedApi.getComments(post.id);
      const data = response.data;

      if (data.success) {
        setComments(data.data.comments || []);
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      console.error('Error loading comments:', error);
      toast.error('Failed to load comments', {
        description: error.response?.data?.message || error.message || 'Please try again'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) {
      toast.error('Please write a comment');
      return;
    }

    try {
      setSubmitting(true);
      const response = await feedApi.createComment(post.id, newComment.trim());
      const data = response.data;

      if (data.success) {
        setNewComment('');
        // Add new comment to the beginning of the list
        setComments(prev => [data.data, ...prev]);
        onCommentAdded();
        onOpenChange(false);

        toast.success('Comment added successfully!', {
          action: {
            label: 'View Post',
            onClick: () => {
              onOpenChange(false); // Close modal
              // Redirect to individual post page
              window.location.href = `/post/${post.id}`;
            }
          }
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment', {
        description: error.response?.data?.message || error.message || 'Please try again'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      const now = new Date();
      const commentTime = new Date(timestamp);
      const diffInHours = Math.floor((now.getTime() - commentTime.getTime()) / (1000 * 60 * 60));

      if (diffInHours < 1) {
        const diffInMinutes = Math.floor((now.getTime() - commentTime.getTime()) / (1000 * 60));
        return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
      } else if (diffInHours < 24) {
        return `${diffInHours}h ago`;
      } else {
        return `${Math.floor(diffInHours / 24)}d ago`;
      }
    } catch (error) {
      return 'Recently';
    }
  };

  const getUserAvatar = (user: any) => {
    return user.pictures && user.pictures.length > 0
      ? user.pictures[0]
      : '/api/placeholder/32/32';
  };

  const getUserDisplayName = (user: any) => {
    return user.name || user.username || 'User';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-left">Comments</DialogTitle>
        </DialogHeader>

        {/* Post Content */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
          <div className="flex items-start space-x-3">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={getUserAvatar(post.user)} alt={getUserDisplayName(post.user)} />
              <AvatarFallback className="text-sm">
                {getUserDisplayName(post.user).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                  {getUserDisplayName(post.user)}
                </h4>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  @{post.user.username}
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line break-words">
                {post.text}
              </p>
              {post.image && (
                <img
                  src={post.image}
                  alt="Post image"
                  className="mt-2 rounded-lg max-h-32 object-cover w-full"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-pink-500 border-t-transparent mx-auto" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 dark:text-gray-500 mb-2">💬</div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No comments yet. Be the first to comment!
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex items-start space-x-3 group">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={getUserAvatar(comment.user)} alt={getUserDisplayName(comment.user)} />
                  <AvatarFallback className="text-xs">
                    {getUserDisplayName(comment.user).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                      {getUserDisplayName(comment.user)}
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      @{comment.user.username}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {formatTime(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line break-words">
                    {comment.text}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Add Comment Form */}
        <form onSubmit={handleSubmitComment} className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex space-x-3">
            <Textarea
              placeholder="Write your comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none flex-1"
              disabled={submitting}
            />
            <Button
              type="submit"
              size="sm"
              disabled={!newComment.trim() || submitting}
              className="self-end h-10 px-3"
            >
              {submitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}