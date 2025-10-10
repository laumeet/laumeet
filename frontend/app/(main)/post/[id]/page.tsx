// app/(main)/post/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MessageCircle, Heart, Share, MapPin, Calendar, ArrowLeft, User } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
    department?: string;
  };
}

interface Post {
  id: string;
  text: string;
  image?: string;
  category: string;
  location?: string;
  created_at: string;
  user: {
    id: string;
    username: string;
    name: string;
    pictures: string[];
    department?: string;
  };
  comments_count: number;
  likes_count: number;
  has_liked: boolean;
}

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    if (postId) {
      loadPostAndComments();
    }
  }, [postId]);

  const loadPostAndComments = async () => {
    try {
      setLoading(true);

      // Load post details
      const postResponse = await feedApi.getPost(postId);
      const postData = postResponse.data;

      if (postData.success) {
        setPost(postData.data);

        // Load comments for this post
        const commentsResponse = await feedApi.getComments(postId);
        const commentsData = commentsResponse.data;

        if (commentsData.success) {
          setComments(commentsData.data.comments || []);
        }
      } else {
        throw new Error(postData.message);
      }
    } catch (error: any) {
      console.error('Error loading post:', error);
      toast.error('Error loading post', {
        description: error.response?.data?.message || error.message || 'Post not found'
      });
      router.push('/feed');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!post) return;

    try {
      setLiking(true);
      const response = await feedApi.likePost(post.id);
      const data = response.data;

      if (data.success) {
        setPost(prev => prev ? {
          ...prev,
          likes_count: data.data.post.likes_count,
          has_liked: data.data.action === 'liked'
        } : null);

        toast.success(data.data.action === 'liked' ? 'Post liked! ❤️' : 'Post unliked');
      }
    } catch (error: any) {
      console.error('Error liking post:', error);
      toast.error('Failed to like post');
    } finally {
      setLiking(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !post) return;

    try {
      setSubmittingComment(true);
      const response = await feedApi.createComment(post.id, newComment.trim());
      const data = response.data;

      if (data.success) {
        setNewComment('');
        // Add new comment to the list
        setComments(prev => [data.data, ...prev]);
        // Update post comment count
        setPost(prev => prev ? {
          ...prev,
          comments_count: prev.comments_count + 1
        } : null);

        toast.success('Comment added!');
      }
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleShare = async () => {
    if (!post) return;

    try {
      const postUrl = `${window.location.origin}/post/${post.id}`;
      const shareText = `Check out this post from ${post.user.name || post.user.username}`;

      if (navigator.share) {
        await navigator.share({
          title: 'Campus Feed Post',
          text: shareText,
          url: postUrl,
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(postUrl);
        toast.success('Link copied to clipboard! 📋');
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = postUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('Link copied to clipboard! 📋');
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error('Failed to share post');
      }
    }
  };

  const formatTime = (timestamp: string) => {
    const now = new Date();
    const postTime = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - postTime.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - postTime.getTime()) / (1000 * 60));
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return `${Math.floor(diffInHours / 24)}d ago`;
    }
  };

  const getUserAvatar = (user: any) => {
    return user.pictures && user.pictures.length > 0
      ? user.pictures[0]
      : '/api/placeholder/40/40';
  };

  const getUserDisplayName = (user: any) => {
    return user.name || user.username;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading post...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">Post not found</p>
          <Button onClick={() => router.push('/feed')} className="mt-4">
            Back to Feed
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/feed')}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Feed</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Post</h1>
          <p className="text-gray-500 dark:text-gray-400">Viewing a single post</p>
        </div>
      </div>

      {/* Post Card */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src={getUserAvatar(post.user)} alt={getUserDisplayName(post.user)} />
                <AvatarFallback>
                  {getUserDisplayName(post.user).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {getUserDisplayName(post.user)}
                  </h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    @{post.user.username}
                  </span>
                  {post.user.department && (
                    <Badge variant="secondary" className="text-xs">
                      {post.user.department}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                  <Calendar className="h-3 w-3" />
                  <span>{formatTime(post.created_at)}</span>
                  {post.location && (
                    <>
                      <span>•</span>
                      <div className="flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {post.location}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line text-lg">
            {post.text}
          </p>

          {post.image && (
            <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <img
                src={post.image}
                alt="Post image"
                className="w-full h-auto object-cover max-h-96"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Engagement Stats */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <Heart className="h-4 w-4" />
                <span className="font-medium">{post.likes_count} likes</span>
              </div>
              <div className="flex items-center space-x-1">
                <MessageCircle className="h-4 w-4" />
                <span className="font-medium">{post.comments_count} comments</span>
              </div>
            </div>

            {post.category && (
              <Badge
                variant="outline"
                className="capitalize bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800"
              >
                {post.category}
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={liking}
              className={`flex items-center space-x-2 ${
                post.has_liked ? 'text-pink-500' : 'text-gray-500'
              }`}
            >
              <Heart className={`h-5 w-5 ${post.has_liked ? 'fill-current' : ''}`} />
              <span>{post.has_liked ? 'Liked' : 'Like'}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="flex items-center space-x-2 text-gray-500"
            >
              <MessageCircle className="h-5 w-5" />
              <span>Comment</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="flex items-center space-x-2 text-gray-500"
            >
              <Share className="h-5 w-5" />
              <span>Share</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Comment Section */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmitComment} className="space-y-4">
            <Textarea
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[100px] resize-none"
              disabled={submittingComment}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!newComment.trim() || submittingComment}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
              >
                {submittingComment ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Comments List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Comments ({comments.length})
        </h3>

        {comments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No comments yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Be the first to comment on this post
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <Card key={comment.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={getUserAvatar(comment.user)} alt={getUserDisplayName(comment.user)} />
                      <AvatarFallback>
                        {getUserDisplayName(comment.user).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
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
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line break-words">
                        {comment.text}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}