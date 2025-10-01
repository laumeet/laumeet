// app/(main)/feed/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, Heart, Share, MoreHorizontal, MapPin, Calendar, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userDepartment: string;
  content: string;
  image?: string;
  category: string;
  location?: string;
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
  liked?: boolean;
}

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = () => {
    try {
      const savedPosts = JSON.parse(localStorage.getItem('campus-vibes-posts') || '[]');
      
      // Add some sample posts if no posts exist
      if (savedPosts.length === 0) {
        const samplePosts: Post[] = [
          {
            id: '1',
            userId: '1',
            userName: 'Alex Johnson',
            userAvatar: '/api/placeholder/40/40',
            userDepartment: 'Computer Science',
            content: 'Just finished my final project! So excited to present it tomorrow. 🎓 #FinalYear #CSMajor',
            image: '/api/placeholder/500/300',
            category: 'Academic',
            location: 'Library',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            likes: 24,
            comments: 8,
            shares: 3
          },
          {
            id: '2',
            userId: '2',
            userName: 'Taylor Smith',
            userAvatar: '/api/placeholder/40/40',
            userDepartment: 'Music',
            content: 'Looking for band members! We need a drummer and bassist for our campus band. Hit me up if you\'re interested! 🎸',
            category: 'Music',
            location: 'Music Department',
            timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            likes: 42,
            comments: 15,
            shares: 7
          }
        ];
        setPosts(samplePosts);
        localStorage.setItem('campus-vibes-posts', JSON.stringify(samplePosts));
      } else {
        setPosts(savedPosts);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = (postId: string) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        const wasLiked = post.liked;
        return {
          ...post,
          likes: wasLiked ? post.likes - 1 : post.likes + 1,
          liked: !wasLiked
        };
      }
      return post;
    }));

    // Update localStorage
    const updatedPosts = posts.map(post => {
      if (post.id === postId) {
        const wasLiked = post.liked;
        return {
          ...post,
          likes: wasLiked ? post.likes - 1 : post.likes + 1,
          liked: !wasLiked
        };
      }
      return post;
    });
    localStorage.setItem('campus-vibes-posts', JSON.stringify(updatedPosts));
  };

  const formatTime = (timestamp: string) => {
    const now = new Date();
    const postTime = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - postTime.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return `${Math.floor(diffInHours / 24)}d ago`;
    }
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
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Campus Feed</h1>
          <p className="text-gray-500 dark:text-gray-400">See what&apos;s happening around campus</p>
        </div>
        <Button 
          className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
          onClick={() => window.location.href = '/create-post'}
        >
          New Post
        </Button>
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
              onClick={() => window.location.href = '/create-post'}
            >
              Create First Post
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={post.userAvatar} />
                      <AvatarFallback>{post.userName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {post.userName}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {post.userDepartment}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>{formatTime(post.timestamp)}</span>
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
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{post.content}</p>
                
                {post.image && (
                  <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <img 
                      src={post.image} 
                      alt="Post image"
                      className="w-full h-auto object-cover max-h-96"
                    />
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                    <button 
                      onClick={() => handleLike(post.id)}
                      className={`flex items-center space-x-1 transition-colors ${
                        post.liked 
                          ? 'text-pink-500' 
                          : 'hover:text-pink-500'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${post.liked ? 'fill-current' : ''}`} />
                      <span>{post.likes}</span>
                    </button>
                    <button className="flex items-center space-x-1 hover:text-blue-500 transition-colors">
                      <MessageCircle className="h-4 w-4" />
                      <span>{post.comments}</span>
                    </button>
                    <button className="flex items-center space-x-1 hover:text-green-500 transition-colors">
                      <Share className="h-4 w-4" />
                      <span>{post.shares}</span>
                    </button>
                  </div>
                  
                  <Badge 
                    variant="outline" 
                    className="capitalize bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800"
                  >
                    {post.category}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}