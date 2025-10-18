/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(main)/explore/page.tsx
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Heart, X, Users, 
  Loader2, AlertCircle, ChevronLeft, ChevronRight,
  Book, GraduationCap, Droplets, Cross, Eye, MessageCircle, BadgeCheck,
  Maximize2, Info
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useExploreProfiles } from '@/hooks/use-explore-profiles';
import { toast } from 'sonner';
import TinderCard from 'react-tinder-card';
import { useRouter } from 'next/navigation';
import api from '@/lib/axio';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
} from '@/components/ui/dialog';

// Enhanced Verified Badge Component
function VerifiedBadge({ size = "sm", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4", 
    lg: "h-5 w-5"
  };

  const containerClasses = {
    sm: "p-1",
    md: "p-1.5",
    lg: "p-2"
  };

  return (
    <div className={`inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm ${containerClasses[size]} ${className}`}>
      <BadgeCheck className={`${sizeClasses[size]} text-white`} />
    </div>
  );
}

// Profile Card Component
function ProfileCard({ 
  profile, 
  currentImageIndex, 
  isShowingDetails, 
  isProcessing,
  onSwipe,
  onImageNavigate,
  onToggleDetails,
  onOpenImageModal,
  hasActiveSubscription 
}: {
  profile: any;
  currentImageIndex: number;
  isShowingDetails: boolean;
  isProcessing: boolean;
  onSwipe: (dir: string) => void;
  onImageNavigate: (action: 'prev' | 'next' | 'go', index?: number) => void;
  onToggleDetails: () => void;
  onOpenImageModal: (imageUrl: string) => void;
  hasActiveSubscription: boolean;
}) {
  const displayName = profile.name || profile.username;
  const hasMultipleImages = profile.pictures && profile.pictures.length > 1;
  const totalImages = profile.pictures?.length || 0;
  const isVerified = hasActiveSubscription;

  return (
    <TinderCard
      key={profile.id}
      className="absolute w-full h-full"
      onSwipe={onSwipe}
      onCardLeftScreen={() => {}}
      preventSwipe={['up', 'down']}
    >
      <Card className="h-full w-full cursor-grab active:cursor-grabbing shadow-2xl border-0 overflow-hidden">
        <CardContent className="p-0 h-full relative">
          {/* Processing Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center">
              <div className="text-center text-white">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm">Creating your match...</p>
              </div>
            </div>
          )}

          {/* Profile Image with Gradient Overlay and Carousel */}
          <div className={`relative transition-all duration-500 ${
            isShowingDetails ? 'h-1/2' : 'h-2/3'
          }`}>
            {/* Image Carousel */}
            <div className="relative w-full h-full overflow-hidden">
              {profile.pictures && profile.pictures.length > 0 ? (
                <>
                  {/* Current Image */}
                  <img 
                    src={profile.pictures[currentImageIndex] || '/api/placeholder/400/500'} 
                    alt={`${displayName} - Image ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 cursor-zoom-in"
                    onClick={() => onOpenImageModal(profile.pictures[currentImageIndex])}
                    onError={(e) => {
                      e.currentTarget.src = '/api/placeholder/400/500';
                    }}
                  />

                  {/* Verified Badge on Image */}
                  {isVerified && (
                    <div className="absolute top-4 right-12 z-20">
                      <VerifiedBadge size="sm" />
                    </div>
                  )}

                  {/* Fullscreen Button */}
                  <button
                    onClick={() => onOpenImageModal(profile.pictures[currentImageIndex])}
                    className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full backdrop-blur-sm hover:bg-black/70 transition-all duration-200 hover:scale-110 z-20"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>

                  {/* Image Navigation Arrows */}
                  {hasMultipleImages && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onImageNavigate('prev');
                        }}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full backdrop-blur-sm hover:bg-black/70 transition-all duration-200 hover:scale-110 z-20"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onImageNavigate('next');
                        }}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full backdrop-blur-sm hover:bg-black/70 transition-all duration-200 hover:scale-110 z-20"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </>
                  )}

                  {/* Image Dots Indicator */}
                  {hasMultipleImages && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
                      {profile.pictures.map((_: any, imgIndex: number) => (
                        <button
                          key={imgIndex}
                          onClick={(e) => {
                            e.stopPropagation();
                            onImageNavigate('go', imgIndex);
                          }}
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
                <div className="w-full flex-col h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <MessageCircle className="h-12 w-12 text-gray-400" />
                  <p>No Pictures</p>
                  {/* Verified Badge on empty image state */}
                  {isVerified && (
                    <div className="absolute top-4 right-4 z-20">
                      <VerifiedBadge size="sm" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Advanced Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

            {/* Details Toggle Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleDetails();
              }}
              className="absolute top-4 right-20 bg-black/50 text-white p-2 rounded-full backdrop-blur-sm hover:bg-black/70 transition-all duration-200 hover:scale-110 z-20"
            >
              <Eye className="h-4 w-4" />
            </button>

            {/* Profile Info */}
            <div className="absolute bottom-4 left-4 right-4 z-10">
              <div className="flex items-end justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-2xl font-bold capitalize text-white drop-shadow-lg">
                      {displayName}
                      {profile.age > 0 && `, ${profile.age}`}
                    </h2>
                    {isVerified && <VerifiedBadge size="sm" />}
                  </div>
                  <p className="text-gray-200 text-sm capitalize drop-shadow-md">
                    {profile.category}
                  </p>

                  {/* Quick Info */}
                  <div className="flex items-center space-x-3 mt-2">
                    {profile.department && (
                      <div className="flex items-center text-gray-200 text-sm drop-shadow-md">
                        <Book className="h-3 w-3 mr-1" />
                        <span>{profile.department}</span>
                      </div>
                    )}
                    {profile.level && (
                      <div className="flex items-center text-gray-200 text-sm drop-shadow-md">
                        <GraduationCap className="h-3 w-3 mr-1" />
                        <span>{profile.level}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className={`transition-all duration-500 overflow-y-auto ${
            isShowingDetails ? 'h-1/2' : 'h-1/3'
          }`}>
            {isShowingDetails ? (
              // Detailed View
              <div className="p-4 space-y-4">
                {/* Bio */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-800 dark:text-white">About</h3>
                    {isVerified && <VerifiedBadge size="sm" />}
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    {profile.bio || 'No bio available'}
                  </p>
                </div>

                {/* Personal Details Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Gender */}
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-full bg-pink-100 dark:bg-pink-900/30">
                      <Heart className="h-3 w-3 text-pink-600 dark:text-pink-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Gender</p>
                      <p className="text-sm font-medium text-gray-800 dark:text-white capitalize">
                        {profile.gender || 'Not specified'}
                      </p>
                    </div>
                  </div>

                  {/* Interested In */}
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                      <Eye className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Interested In</p>
                      <p className="text-sm font-medium text-gray-800 dark:text-white capitalize">
                        {profile.interestedIn || 'Not specified'}
                      </p>
                    </div>
                  </div>

                  {/* Genotype */}
                  {profile.genotype && (
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                        <Droplets className="h-3 w-3 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Genotype</p>
                        <p className="text-sm font-medium text-gray-800 dark:text-white">
                          {profile.genotype}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Religion */}
                  {profile.religious && (
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                        <Cross className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Religion</p>
                        <p className="text-sm font-medium text-gray-800 dark:text-white">
                          {profile.religious}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Interests */}
                {profile.interests && profile.interests.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-800 dark:text-white">Interests</h3>
                      {isVerified && <VerifiedBadge size="sm" />}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {profile.interests.slice(0, 8).map((interest: string, i: number) => (
                        <span 
                          key={i}
                          className="px-2 py-1 bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 text-pink-700 dark:text-pink-300 rounded-full text-xs font-medium border border-pink-200 dark:border-pink-800"
                        >
                          {interest}
                        </span>
                      ))}
                      {profile.interests.length > 8 && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs">
                          +{profile.interests.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Compact View
              <div className="p-4">
                {/* Bio Preview */}
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4 line-clamp-3">
                  {profile.bio || 'No bio available'}
                </p>

                {/* Interests Preview */}
                {profile.interests && profile.interests.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.slice(0, 4).map((interest: string, i: number) => (
                      <span 
                        key={i}
                        className="px-2 py-1 bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 text-pink-700 dark:text-pink-300 rounded-full text-xs font-medium border border-pink-200 dark:border-pink-800"
                      >
                        {interest}
                      </span>
                    ))}
                    {profile.interests.length > 4 && (
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs">
                        +{profile.interests.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TinderCard>
  );
}

// Swipe Instructions Component
function SwipeInstructions() {
  const [showInstructions, setShowInstructions] = useState(true);

  if (!showInstructions) return null;

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4">
      <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-lg">
        <div className="flex items-start justify-between w-full">
          <div className="flex items-start space-x-3 flex-1">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
                <strong className="block mb-1">How to swipe:</strong>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <X className="h-4 w-4 text-red-500" />
                    <span>Swipe left to pass</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Heart className="h-4 w-4 text-green-500" />
                    <span>Swipe right to like</span>
                  </div>
                </div>
              </AlertDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInstructions(false)}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 ml-2 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Alert>
    </div>
  );
}

export default function ExplorePage() {
  const router = useRouter();
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
  const [processingMatch, setProcessingMatch] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ url: string; profileName: string } | null>(null);

  // State for image carousel per profile
  const [currentImageIndexes, setCurrentImageIndexes] = useState<{ [key: string]: number }>({});
  const [showDetails, setShowDetails] = useState<{ [key: string]: boolean }>({});
  const currentIndexRef = useRef(currentIndex);
  const [copied, setCopied] = useState(false);
  const [userSubscriptions, setUserSubscriptions] = useState<{ [key: string]: any }>({});

  // Use subscription hook for the current profile
  const currentProfile = profiles[currentIndex];
  const { subscription: currentSubscription } = useUserSubscription(currentProfile?.id || "");

  // Update subscriptions when current profile changes
  useEffect(() => {
    if (currentProfile?.id && currentSubscription) {
      setUserSubscriptions(prev => ({
        ...prev,
        [currentProfile.id]: currentSubscription
      }));
    }
  }, [currentProfile?.id, currentSubscription]);

  // Function to check if a user has active subscription
  const hasActiveSubscription = (userId: string) => {
    const subscription = userSubscriptions[userId];
    return subscription?.has_subscription && 
           subscription.subscription?.is_active && 
           subscription.subscription?.status === 'active';
  };

  const handleCopy = () => {
    navigator.clipboard.writeText("https://laumeet.vercel.app");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Update current index ref
  const updateCurrentIndex = (val: number) => {
    setCurrentIndex(val);
    currentIndexRef.current = val;
  };

  // Image carousel functions for a specific profile
  const handleImageNavigate = (profileId: string, action: 'prev' | 'next' | 'go', index?: number) => {
    const currentIndex = currentImageIndexes[profileId] || 0;
    const totalImages = profiles.find(p => p.id === profileId)?.pictures?.length || 0;
    
    if (totalImages === 0) return;

    let newIndex = currentIndex;
    
    switch (action) {
      case 'prev':
        newIndex = (currentIndex - 1 + totalImages) % totalImages;
        break;
      case 'next':
        newIndex = (currentIndex + 1) % totalImages;
        break;
      case 'go':
        newIndex = index ?? currentIndex;
        break;
    }

    setCurrentImageIndexes(prev => ({
      ...prev,
      [profileId]: newIndex
    }));
  };

  const handleToggleDetails = (profileId: string) => {
    setShowDetails(prev => ({
      ...prev,
      [profileId]: !prev[profileId]
    }));
  };

  const openImageModal = (profileId: string, imageUrl: string) => {
    const profile = profiles.find(p => p.id === profileId);
    const displayName = profile?.name || profile?.username || 'User';
    setSelectedImage({ url: imageUrl, profileName: displayName });
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  const getCurrentImageIndex = (profileId: string) => {
    return currentImageIndexes[profileId] || 0;
  };

  // Function to create conversation and send initial message
  const createConversationWithMessage = async (matchedUserId: any) => {
    try {
      const conversationResponse = await api.post('/chat/conversations/create', {
        target_user_id: matchedUserId
      });

      if (conversationResponse.data.success) {
        const conversationId = conversationResponse.data.conversation_id;
        
        const messageResponse = await api.post(`/chat/messages/send?conversationId=${conversationId}`, {
          content: "Conversation has been unlocked! 🎉"
        });

        if (messageResponse.data.success) {
          return { success: true, conversationId };
        }
      }
      
      return { success: false, error: 'Failed to create conversation' };
    } catch (err: any) {
      console.error('Error creating conversation:', err);
      return { 
        success: false, 
        error: err.response?.data?.message || 'Failed to create conversation' 
      };
    }
  };

  // Handle card swipe
  const swiped = useCallback(async (direction: string, profileId: string, index: number) => {
    updateCurrentIndex(index - 1);
    setIsSwiping(true);

    try {
      const action = direction === 'right' ? 'like' : 'pass';
      const result = await swipeProfile(profileId, action);

      if (result.match) {
        const matchedUser = profiles.find((profile) => profile.id === result.matched_with);
        setProcessingMatch(profileId);
        
        const conversationResult = await createConversationWithMessage(result.matched_with);
        
        if (conversationResult.success) {
          toast.success(`It's a match with ${matchedUser?.username}! 🎉`, {
            duration: 5000,
            action: {
              label: 'Chat',
              onClick: () => router.push('/chat')
            }
          });
        } else {
          toast.error('Match created! Failed to start conversation automatically.');
        }
        
        setProcessingMatch(null);
      }
    } catch (err) {
      toast.error('An error occurred while processing your swipe');
      updateCurrentIndex(index);
    } finally {
      setIsSwiping(false);
      refetch();
    }
  }, [swipeProfile, profiles, refetch, router]);

  // Manual swipe functions
  const swipe = useCallback(async (dir: string) => {
    if (currentIndexRef.current < 0 || currentIndexRef.current >= profiles.length) return;

    const profile = profiles[currentIndexRef.current];
    await swiped(dir, profile.id, currentIndexRef.current);
  }, [swiped, profiles]);

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
      <div className="space-y-6 px-4">
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
            <button
              onClick={handleCopy}
              className="text-blue-500 hover:underline"
            >
              {copied ? "Copied!" : "Copy laumeet.vercel.app"}
            </button>
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
    <>
      <SwipeInstructions />
      
      <div className="space-y-6 px-4 pb-28">
        {/* Header with Filters */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Discover</h1>
            <p className="text-gray-500 dark:text-gray-400">
              {totalProfiles} people nearby • Swipe to connect
            </p>
          </div>
        </div>

        {/* Cards Container */}
        <div className="relative h-[600px] w-full max-w-md mx-auto">
          {profiles.map((profile, index) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              currentImageIndex={getCurrentImageIndex(profile.id)}
              isShowingDetails={!!showDetails[profile.id]}
              isProcessing={processingMatch === profile.id}
              onSwipe={(dir) => swiped(dir, profile.id, index)}
              onImageNavigate={(action, index) => handleImageNavigate(profile.id, action, index)}
              onToggleDetails={() => handleToggleDetails(profile.id)}
              onOpenImageModal={(imageUrl) => openImageModal(profile.id, imageUrl)}
              hasActiveSubscription={hasActiveSubscription(profile.id)}
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-8">
          <Button 
            variant="outline" 
            size="lg"
            disabled={!canSwipe || isSwiping}
            className="w-16 h-16 rounded-full border-red-300 dark:border-red-700 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
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
            className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 shadow-lg hover:shadow-xl hover:from-pink-600 hover:to-purple-700 transition-all duration-200 hover:scale-105 active:scale-95"
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

      {/* Image Modal */}
      <Dialog open={!!selectedImage} onOpenChange={closeImageModal}>
        <DialogContent className="max-w-4xl w-full p-0 bg-transparent border-0">
          <DialogHeader className="sr-only">
            <DialogDescription>Full screen image view</DialogDescription>
          </DialogHeader>
          <div className="relative w-full h-[80vh] flex items-center justify-center">
            {selectedImage && (
              <>
                <img 
                  src={selectedImage.url} 
                  alt={`${selectedImage.profileName} - Full view`}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
                <Button
                  onClick={closeImageModal}
                  variant="secondary"
                  size="sm"
                  className="absolute top-4 right-4 bg-black/50 text-white hover:bg-black/70"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}