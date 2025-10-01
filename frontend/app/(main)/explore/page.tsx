'use client';

import { useState, useRef } from 'react';
import { 
  Heart, X, Shield, Info, Filter, MapPin, Calendar, Users, 
  Loader2, AlertCircle, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useExploreProfiles } from '@/hooks/use-explore-profiles';
import { toast } from 'sonner';

interface Profile {
  id: string;
  username: string;
  name: string;
  age: number;
  bio: string;
  images: string[];
  category: string;
  isAnonymous: boolean;
  department: string;
  interests: string[];
  distance: number;
  compatibility: number;
  level: string;
  gender: string;
  interestedIn: string;
  religious: string;
  genotype: string;
}

export default function ExplorePage() {
  const { 
    profiles = [], 
    loading, 
    error, 
    totalProfiles = 0, 
    refetch, 
    swipeProfile 
  } = useExploreProfiles();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  
  // State for image carousel per profile
  const [currentImageIndexes, setCurrentImageIndexes] = useState<{ [key: string]: number }>({});
  const cardRef = useRef<HTMLDivElement>(null);

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

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setStartX(clientX);
    setCurrentX(clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setCurrentX(clientX);
    
    const diff = clientX - startX;
    if (diff > 50) {
      setSwipeDirection('right');
    } else if (diff < -50) {
      setSwipeDirection('left');
    } else {
      setSwipeDirection(null);
    }
  };

  const handleTouchEnd = async () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const diff = currentX - startX;
    if (diff > 100) {
      await handleSwipe('right');
    } else if (diff < -100) {
      await handleSwipe('left');
    }
    
    setSwipeDirection(null);
    setCurrentX(0);
    setStartX(0);
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (!profiles || profiles.length === 0 || currentIndex >= profiles.length) return;
    
    const currentProfile = profiles[currentIndex];
    setIsSwiping(true);

    try {
      const action = direction === 'right' ? 'like' : 'pass';
      const result = await swipeProfile(currentProfile.id, action);
      
      if (result.success) {
        if (direction === 'right') {
          if (result.match) {
            toast.success(`It's a match with ${currentProfile.name}! 🎉`);
          } else {
            toast.success(`Liked ${currentProfile.name}!`);
          }
        } else {
          toast.info(`Passed on ${currentProfile.name}`);
        }

        // Move to next profile
        if (currentIndex < profiles.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          // No more profiles, refetch or show message
          toast.info("You've seen all profiles! Check back later for new matches.");
          setCurrentIndex(0);
          await refetch();
        }
      } else {
        toast.error(result.message || `Failed to ${action} profile`);
      }
    } catch (err) {
      toast.error('An error occurred while processing your swipe');
    } finally {
      setIsSwiping(false);
    }
  };

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

  const currentProfile = profiles[currentIndex];
  const rotate = isDragging ? (currentX - startX) * 0.1 : 0;
  const opacity = Math.min(1, 1 - Math.abs(rotate) / 30);

  // Get next profiles for stack effect
  const visibleProfiles = profiles.slice(currentIndex, currentIndex + 3);

  return (
    <div className="space-y-6">
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

      {/* Profile Stack */}
      <div className="relative h-[600px]">
        {visibleProfiles.map((profile, index) => {
          const currentImageIndex = getCurrentImageIndex(profile.id);
          const hasMultipleImages = profile.images && profile.images.length > 1;
          const totalImages = profile.images?.length || 0;
          
          return (
            <div
              key={profile.id}
              className={`absolute inset-0 transition-all duration-300 ${
                index === 0 ? 'z-30' : index === 1 ? 'z-20 scale-95 opacity-60' : 'z-10 scale-90 opacity-30'
              }`}
              style={{
                transform: index === 0 ? `translateX(${currentX - startX}px) rotate(${rotate}deg)` : 'none',
                opacity: index === 0 ? opacity : 1
              }}
            >
              <Card 
                ref={index === 0 ? cardRef : null}
                className="h-full cursor-grab active:cursor-grabbing shadow-2xl border-0"
                onMouseDown={handleTouchStart}
                onMouseMove={handleTouchMove}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
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
                            alt={`${profile.name} - Image ${currentImageIndex + 1}`}
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
                        {profile.isAnonymous && (
                          <span className="bg-purple-500/90 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                            <Shield className="h-3 w-3 inline mr-1" />
                            Anonymous
                          </span>
                        )}
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
                            {profile.name}, {profile.age}
                          </h2>
                          <p className="text-gray-200 text-sm capitalize">{profile.category}</p>
                          
                          {/* Additional Info */}
                          <div className="flex items-center space-x-4 mt-2">
                            <div className="flex items-center text-gray-200 text-sm">
                              <MapPin className="h-3 w-3 mr-1" />
                              {profile.distance}km away
                            </div>
                            <div className="flex items-center text-gray-200 text-sm">
                              <Calendar className="h-3 w-3 mr-1" />
                              {profile.department}
                            </div>
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
            </div>
          );
        })}

        {/* Swipe Indicators */}
        {isDragging && swipeDirection && (
          <div className={`absolute inset-0 flex items-center justify-center z-40 ${
            swipeDirection === 'right' ? 'bg-green-500/20' : 'bg-red-500/20'
          } rounded-xl`}>
            <div className={`p-4 rounded-full ${
              swipeDirection === 'right' ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {swipeDirection === 'right' ? (
                <Heart className="h-8 w-8 text-white" />
              ) : (
                <X className="h-8 w-8 text-white" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-8">
        <Button 
          variant="outline" 
          size="lg"
          disabled={isSwiping}
          className="w-16 h-16 rounded-full border-red-300 dark:border-red-700 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          onClick={() => handleSwipe('left')}
        >
          {isSwiping ? (
            <Loader2 className="h-6 w-6 animate-spin text-red-500" />
          ) : (
            <X className="h-8 w-8 text-red-500" />
          )}
        </Button>
        
        <Button 
          variant="outline" 
          size="lg"
          className="w-16 h-16 rounded-full border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
        >
          <Shield className="h-6 w-6 text-blue-500" />
        </Button>
        
        <Button 
          size="lg"
          disabled={isSwiping}
          className="w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-teal-500 shadow-lg hover:shadow-xl hover:from-green-600 hover:to-teal-600 transition-all duration-200 hover:scale-105"
          onClick={() => handleSwipe('right')}
        >
          {isSwiping ? (
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          ) : (
            <Heart className="h-8 w-8 text-white" />
          )}
        </Button>
      </div>

      {/* Progress Indicator */}
      <div className="flex justify-center space-x-2">
        {profiles.map((_, index) => (
          <div 
            key={index}
            className={`h-1 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? 'bg-gradient-to-r from-green-500 to-teal-500 w-8' 
                : 'bg-gray-300 dark:bg-gray-600 w-2'
            }`}
          />
        ))}
      </div>
    </div>
  );
}