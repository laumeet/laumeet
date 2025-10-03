// app/(main)/explore/page.tsx
'use client';

import { useState, useRef, useCallback } from 'react';
import { 
  Heart, X,Filter, MapPin, Calendar, Users, 
  Loader2, AlertCircle, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useExploreProfiles } from '@/hooks/use-explore-profiles';
import { toast } from 'sonner';
import TinderCard from 'react-tinder-card';

export default function ExplorePage() {
  const { 
    profiles = [], 
    loading, 
    error, 
    totalProfiles = 0, 
    refetch, 
    swipeProfile 
  } = useExploreProfiles();
  
  const [currentIndex, setCurrentIndex] = useState(profiles.length - 1);
  const [isSwiping, setIsSwiping] = useState(false);
  const [lastDirection, setLastDirection] = useState<string | null>(null);
  
  // State for image carousel per profile
  const [currentImageIndexes, setCurrentImageIndexes] = useState<{ [key: string]: number }>({});
  const currentIndexRef = useRef(currentIndex);

  // Update current index ref
  const updateCurrentIndex = (val: number) => {
    setCurrentIndex(val);
    currentIndexRef.current = val;
  };

  // Image carousel functions
  const nextImage = (profileId: string, totalImages: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentImageIndexes(prev => ({
      ...prev,
      [profileId]: ((prev[profileId] || 0) + 1) % totalImages
    }));
  };

  const prevImage = (profileId: string, totalImages: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentImageIndexes(prev => ({
      ...prev,
      [profileId]: ((prev[profileId] || 0) - 1 + totalImages) % totalImages
    }));
  };

  const goToImage = (profileId: string, index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentImageIndexes(prev => ({
      ...prev,
      [profileId]: index
    }));
  };

  const getCurrentImageIndex = (profileId: string) => {
    return currentImageIndexes[profileId] || 0;
  };

  // Handle card swipe
  const swiped = useCallback(async (direction: string, profileId: string, index: number) => {
    setLastDirection(direction);
    updateCurrentIndex(index - 1);
    setIsSwiping(true);

    try {
      const action = direction === 'right' ? 'like' : 'pass';
      const result = await swipeProfile(profileId, action);
        
        if (result.match) {
          const matchedUser = profiles.find((profile) => profile.id === result.matched_with)
          toast(`It's a match with ${matchedUser.username}! 🎉`, {
            icon: '💖',
            duration: 8000
          });
        }
    } catch (err) {
      toast.error('An error occurred while processing your swipe');
      updateCurrentIndex(index); // Stay on current card on error
    } finally {
      setIsSwiping(false);
      refetch()
    }
  }, [swipeProfile]);

  const outOfFrame = useCallback((name: string, idx: number) => {
    console.log(`${name} (${idx}) left the screen!`, currentIndexRef.current);
  }, []);

  // Manual swipe functions
  const swipe = useCallback(async (dir: string) => {
    if (currentIndexRef.current < 0 || currentIndexRef.current >= profiles.length) return;
    
    const profile = profiles[currentIndexRef.current];
    await swiped(dir, profile.id, currentIndexRef.current);
  }, [swiped, profiles, currentIndexRef]);



  const canSwipe = currentIndex >= 0;

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-pink-500" />
          <p className="text-gray-500 dark:text-gray-400">Loading profiles...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Discover</h1>
            <p className="text-gray-500 dark:text-gray-400">Swipe to connect with amazing people</p>
          </div>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading profiles: {error}
            <div className="mt-2">
              <Button onClick={refetch} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show empty state
  if (!profiles || profiles.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Discover</h1>
            <p className="text-gray-500 dark:text-gray-400">Swipe to connect with amazing people</p>
          </div>
        </div>
        
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No profiles found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
              There are no other users to show right now. Check back later or invite friends to join!
            </p>
            <Button onClick={refetch} className="mt-4">
              Refresh
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      {/* Header with Filters */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Discover</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {totalProfiles} people nearby • Swipe to connect
          </p>
        </div>
        <Button variant="outline" className="rounded-xl border-gray-300 dark:border-gray-600">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Cards Container */}
      <div className="relative h-[600px] w-full max-w-md mx-auto">
        {profiles.map((profile, index) => {
          const currentImageIndex = getCurrentImageIndex(profile.id);
          const hasMultipleImages = profile.images && profile.images.length > 1;
          const totalImages = profile.images?.length || 0;
          const displayName = profile.name || profile.username;
          
          return (
            <TinderCard
              key={profile.id}
              className="absolute w-full h-full"
              onSwipe={(dir) => swiped(dir, profile.id, index)}
              onCardLeftScreen={() => outOfFrame(displayName, index)}
              preventSwipe={['up', 'down']}
            >
              <Card className="h-full w-full cursor-grab active:cursor-grabbing shadow-2xl border-0">
                <CardContent className="p-0 h-full relative overflow-hidden">
                  {/* Profile Image with Gradient Overlay and Carousel */}
                  <div className="h-2/3 relative">
                    {/* Image Carousel */}
                    <div className="relative w-full h-full overflow-hidden">
                      {profile.images && profile.images.length > 0 ? (
                        <>
                          {/* Current Image */}
                          <img 
                            src={profile.images[currentImageIndex] || '/api/placeholder/400/500'} 
                            alt={`${displayName} - Image ${currentImageIndex + 1}`}
                            className="w-full h-full object-cover transition-transform duration-300"
                            onError={(e) => {
                              e.currentTarget.src = '/api/placeholder/400/500';
                            }}
                          />
                          
                          {/* Image Navigation Arrows */}
                          {hasMultipleImages && (
                            <>
                              <button
                                onClick={(e) => prevImage(profile.id, totalImages, e)}
                                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full backdrop-blur-sm hover:bg-black/70 transition-colors z-20"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => nextImage(profile.id, totalImages, e)}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full backdrop-blur-sm hover:bg-black/70 transition-colors z-20"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          
                          {/* Image Dots Indicator */}
                          {hasMultipleImages && (
                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
                              {profile.images.map((_, imgIndex) => (
                                <button
                                  key={imgIndex}
                                  onClick={(e) => goToImage(profile.id, imgIndex, e)}
                                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                    imgIndex === currentImageIndex 
                                      ? 'bg-white scale-125' 
                                      : 'bg-white/50 hover:bg-white/70'
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                          
                          {/* Image Counter */}
                          {hasMultipleImages && (
                            <div className="absolute top-4 left-4 bg-black/50 text-white px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm z-20">
                              {currentImageIndex + 1} / {totalImages}
                            </div>
                          )}
                        </>
                      ) : (
                        // Fallback when no images
                        <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                          <Users className="h-16 w-16 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    {/* Advanced Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    
                    {/* Profile Badges */}
                    <div className="absolute top-4 right-4 flex flex-col space-y-2 z-20">
                      <div className="flex space-x-2">
                        <span className="bg-green-500/90 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                          {profile.compatibility}% Match
                        </span>
                      </div>
                    </div>

                    {/* Profile Info */}
                    <div className="absolute bottom-6 left-6 right-6 z-10">
                      <div className="flex items-end justify-between">
                        <div>
                          <h2 className="text-2xl font-bold text-white mb-1">
                            {displayName}
                            {profile.age > 0 && `, ${profile.age}`}
                          </h2>
                          <p className="text-gray-200 text-sm capitalize">{profile.category}</p>
                          
                          {/* Additional Info */}
                          <div className="flex items-center space-x-4 mt-2">
                            {profile.distance > 0 && (
                              <div className="flex items-center text-gray-200 text-sm">
                                <MapPin className="h-3 w-3 mr-1" />
                                {profile.distance}km away
                              </div>
                            )}
                            {profile.department && (
                              <div className="flex items-center text-gray-200 text-sm">
                                <Calendar className="h-3 w-3 mr-1" />
                                {profile.department}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Compatibility Circle */}
                        <div className="relative">
                          <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <span className="text-white font-bold text-sm">{profile.compatibility}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bio and Interests Section */}
                  <div className="p-6 h-1/3 overflow-y-auto">
                    <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">
                      {profile.bio}
                    </p>
                    
                    {/* Interests */}
                    {profile.interests && profile.interests.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {profile.interests.slice(0, 6).map((interest, i) => (
                          <span 
                            key={i}
                            className="px-3 py-1 bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 text-pink-700 dark:text-pink-300 rounded-full text-xs font-medium border border-pink-200 dark:border-pink-800"
                          >
                            {interest}
                          </span>
                        ))}
                        {profile.interests.length > 6 && (
                          <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs">
                            +{profile.interests.length - 6} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TinderCard>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-8">
        <Button 
          variant="outline" 
          size="lg"
          disabled={!canSwipe || isSwiping}
          className="w-16 h-16 rounded-full border-red-300 dark:border-red-700 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          onClick={() => swipe('left')}
        >
          {isSwiping ? (
            <Loader2 className="h-6 w-6 animate-spin text-red-500" />
          ) : (
            <X className="h-8 w-8 text-red-500" />
          )}
        </Button>
        
        <Button 
          size="lg"
          disabled={!canSwipe || isSwiping}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-teal-500 shadow-lg hover:shadow-xl hover:from-green-600 hover:to-teal-600 transition-all duration-200 hover:scale-105"
          onClick={() => swipe('right')}
        >
          {isSwiping ? (
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          ) : (
            <Heart className="h-8 w-8 text-white" />
          )}
        </Button>
      </div>
    </div>
  );
}