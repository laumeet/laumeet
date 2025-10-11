/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(main)/feed/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, Heart, Share, MoreHorizontal, MapPin, Calendar, Image as ImageIcon, Plus, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { feedApi } from '@/lib/axio';
import { toast } from 'sonner';
import { CommentModal } from '@/components/comment-modal';

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

interface ApiResponse {
  success: boolean;
  message: string;
  data: {
    posts: Post[];
    pagination: {
      page: number;
      per_page: number;
      total: number;
      pages: number;
      has_next: boolean;
      has_prev: boolean;
    };
  };
}

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likingPostId, setLikingPostId] = useState<string | null>(null);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      console.log('🔧 Loading posts from feed...');

      const response = await feedApi.getPosts(1, 20);
      const data: ApiResponse = response.data;

      console.log('🔧 Posts loaded:', data);

      if (data.success) {
        setPosts(data.data.posts);
        console.log(`✅ Loaded ${data.data.posts.length} posts`);
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      console.error('❌ Error loading posts:', error);

      if (error.response?.status !== 401) {
        toast.error('Error loading posts', {
          description: error.response?.data?.message || error.message || 'Please try again later'
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
  };

  const handleLike = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent post navigation
    try {
      setLikingPostId(postId);
      console.log(`🔧 Liking post: ${postId}`);

      const response = await feedApi.likePost(postId);
      const data = response.data;

      console.log('🔧 Like response:', data);

      if (data.success) {
        // Update the specific post in the state
        setPosts(prevPosts =>
          prevPosts.map(post => {
            if (post.id === postId) {
              return {
                ...post,
                likes_count: data.data.post.likes_count,
                has_liked: data.data.action === 'liked'
              };
            }
            return post;
          })
        );

        toast.success(data.data.action === 'liked' ? 'Post liked! ❤️' : 'Post unliked');
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      console.error('❌ Error liking post:', error);

      if (error.response?.status !== 401) {
        toast.error('Failed to like post', {
          description: error.response?.data?.message || error.message || 'Please try again'
        });
      }
    } finally {
      setLikingPostId(null);
    }
  };

  const handleComment = (post: Post, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent post navigation
    setSelectedPost(post);
    setCommentModalOpen(true);
  };

  const handleShare = async (post: Post, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent post navigation
    try {
      const postUrl = `${window.location.origin}/post/${post.id}`;
      const shareText = `Check out this post from ${post.user.name || post.user.username}: ${post.text.substring(0, 100)}...`;

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
      console.error('Error sharing:', error);
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error('Failed to share post');
      }
    }
  };

  const handlePostClick = (postId: string) => {
    router.push(`/post/${postId}`);
  };

  const handleCommentAdded = () => {
    loadPosts(); // Refresh to update comment counts
  };

  const formatTime = (timestamp: string) => {
    try {
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
    } catch (error) {
      return 'Recently';
    }
  };

  const getUserAvatar = (post: Post) => {
    return post.user.pictures && post.user.pictures.length > 0
      ? post.user.pictures[0]
      : '/api/placeholder/40/40';
  };

  const getUserDisplayName = (post: Post) => {
    return post.user.name || post.user.username;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 pt-6 pb-32">
      <div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Campus Feed</h1>
          <p className="text-gray-500 dark:text-gray-400">See what&apos;s happening around campus</p>
        </div>
        <div className="flex items-center mt-4 align-left space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
            onClick={() => router.push('/create-post')}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Post
          </Button>
        </div>
      </div>

      {posts.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No posts yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Be the first to share something with the campus community!
            </p>
            <Button
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
              onClick={() => router.push('/create-post')}
            >
              Create First Post
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card
              key={post.id}
              className="overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer"
              onClick={() => handlePostClick(post.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={getUserAvatar(post)} alt={getUserDisplayName(post)} />
                      <AvatarFallback>
                        {getUserDisplayName(post).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {getUserDisplayName(post)}
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
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{post.text}</p>

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

                <div
                  className="flex items-center justify-between pt-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                    {/* Like Button */}
                    <button
                      onClick={(e) => handleLike(post.id, e)}
                      disabled={likingPostId === post.id}
                      className={`flex items-center space-x-1 transition-all duration-200 ${
                        post.has_liked
                          ? 'text-pink-500 transform scale-110'
                          : 'hover:text-pink-500 hover:scale-105'
                      } ${likingPostId === post.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Heart className={`h-5 w-5 ${post.has_liked ? 'fill-current' : ''}`} />
                      <span className="font-medium">{post.likes_count}</span>
                    </button>

                    {/* Comment Button */}
                    <button
                      onClick={(e) => handleComment(post, e)}
                      className="flex items-center space-x-1 hover:text-blue-500 hover:scale-105 transition-all duration-200"
                    >
                      <MessageCircle className="h-5 w-5" />
                      <span className="font-medium">{post.comments_count}</span>
                    </button>

                    {/* Share Button */}
                    <button
                      onClick={(e) => handleShare(post, e)}
                      className="flex items-center space-x-1 hover:text-green-500 hover:scale-105 transition-all duration-200"
                    >
                      <Share className="h-5 w-5" />
                      <span className="font-medium">Share</span>
                    </button>
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Comment Modal */}
      {selectedPost && (
        <CommentModal
          post={selectedPost}
          open={commentModalOpen}
          onOpenChange={setCommentModalOpen}
          onCommentAdded={handleCommentAdded}
        />
      )}
    </div>
  );
}