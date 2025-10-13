/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(main)/likes/page.tsx
'use client';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Heart, 
  Users, 
  Loader2, 
  RefreshCw, 
  X,
  MessageCircle,
 
  GraduationCap
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useLikedMe } from '@/hooks/useUsersWhoLikedMe';
import useExploreProfiles from '@/hooks/use-explore-profiles';

export default function LikesPage() {
  const { users, loading, error,  fetchUsersWhoLikedMe,  } = useLikedMe();
    const { swipeProfile } = useExploreProfiles();
    
          const [isSwiping, setIsSwiping] = useState(false);
  const [expandedBio, setExpandedBio] = useState<string | null>(null);
  const router = useRouter();

  const handleLikeBack = async (user: any) => {
    setIsSwiping(true)
    try{
    const result = await swipeProfile(user.id, 'like')
    if (result.success) {
      if (result.match) {
        toast.success(`It's a match with ${user.name}! 🎉`, {
          duration: 5000,
          action: {
            label: 'Chat',
            onClick: () => router.push('/chat')
          }
        });
      } else {
        toast.success(`You liked ${user.name} back!`);
      }
    } else {
      toast.error(result.message || 'Failed to like back');
    }
  }
  finally{
    setIsSwiping(false)
  }
  };

  const handlePass = async (user: any) => {
     setIsSwiping(true)
    try{
    const result = await swipeProfile(user.id, 'like')
    
    if (result.success) {
      toast.info(`You passed on ${user.name}`);
    } else {
      toast.error(result.message || 'Failed to pass');
    }
    }
  finally{
    setIsSwiping(false)
  }
  };

  const toggleBio = (userId: string) => {
    setExpandedBio(expandedBio === userId ? null : userId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-pink-500" />
          <p className="text-gray-500 dark:text-gray-400">Loading people who liked you...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 px-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">People Who Liked You</h1>
            <p className="text-gray-500 dark:text-gray-400">See who&apos;s interested in you</p>
          </div>
        </div>

        <div className="text-center p-8">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Error Loading Likes</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <Button onClick={fetchUsersWhoLikedMe}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="space-y-6 px-4 pt-9 pb-32">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">People Who Liked You</h1>
            <p className="text-gray-500 dark:text-gray-400">See who&apos;s interested in you</p>
          </div>
        </div>

        <div className="text-center p-8">
          <div className="w-20 h-20 bg-pink-100 dark:bg-pink-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="h-10 w-10 text-pink-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No likes yet</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            When someone likes your profile, they&apos;ll appear here. Keep exploring to get more likes!
          </p>
          <Button onClick={() => router.push('/explore')} className="mt-4">
            Start Exploring
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 pt-9 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">People Who Liked You</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {users.length} {users.length === 1 ? 'person' : 'people'} liked your profile
          </p>
        </div>
        <Button onClick={() => fetchUsersWhoLikedMe()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user:any) => (
          <Card key={user.id} className="overflow-hidden border-2 border-pink-200 dark:border-pink-800">
            <CardContent className="p-0">
              {/* Header with Image and Basic Info */}
              <div className="relative">
               {
                user.pictures && user.pictures.length > 0  ? <img
                  src={user.pictures[0] || '/api/placeholder/400/300'}
                  alt={user.username}
                  className="w-full h-48 object-cover"
                /> : <div className="w-full flex-col h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <MessageCircle className="h-12 w-12 text-gray-400" />
                  <p>No Pictures</p>
                </div>
               } 

                <div className="absolute top-3 left-3 bg-pink-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                  <Heart className="h-3 w-3 mr-1" fill="white" />
                  Liked You
                </div>
                <div className="absolute top-3 right-3 bg-black/50 text-white px-2 py-1 rounded-full text-xs backdrop-blur-sm">
                  {user.liked_at ? formatDate(user.liked_at) : 'Recently'}
                </div>
                
                {/* Gradient Overlay */}
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
                
                {/* Basic Info Overlay */}
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <h3 className="font-bold text-lg truncate">{user.username}</h3>
                  <div className="flex items-center space-x-2 text-sm opacity-90">
                    {user.age && <span>{user.age} years</span>}
                    {user.department && (
                      <div className="flex items-center">
                        <GraduationCap className="h-3 w-3 mr-1" />
                        <span>{user.department}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                {/* Bio */}
                {user.bio && (
                  <div>
                    <p className={`text-sm text-gray-600 dark:text-gray-300 ${
                      expandedBio === user.id ? '' : 'line-clamp-2'
                    }`}>
                      {user.bio}
                    </p>
                    {user.bio.length > 100 && (
                      <Button
                        variant="link"
                        className="p-0 h-auto text-xs text-pink-500"
                        onClick={() => toggleBio(user.id)}
                      >
                        {expandedBio === user.id ? 'Show less' : 'Read more'}
                      </Button>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-2 pt-2">
                  <Button
                    onClick={() => handlePass(user)}
                    variant="outline"
                    className="flex-1"
                    disabled={isSwiping}
                  >
                    {isSwiping ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Pass
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => handleLikeBack(user)}
                    className="flex-1 bg-pink-500 hover:bg-pink-600 text-white"
                    disabled={isSwiping}
                  >
                    {isSwiping ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Heart className="h-4 w-4 mr-2" fill="currentColor" />
                        Like Back
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State when all users are processed */}
      {users.length === 0 && !loading && (
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="h-8 w-8 text-green-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
          <p className="text-gray-500 dark:text-gray-400">
            You&apos;ve responded to everyone who liked you. Check back later for new likes!
          </p>
          <Button onClick={() => router.push('/explore')} className="mt-4">
            Explore More People
          </Button>
        </div>
      )}
    </div>
  );
}