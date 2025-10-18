/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(main)/explore/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
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

// Swipe Overlay Component
function SwipeOverlay({ direction }: { direction: 'left' | 'right' | null }) {
  if (!direction) return null;

  return (
    <div className={`absolute inset-0 rounded-2xl flex items-center justify-center z-50 ${
      direction === 'right' 
        ? 'bg-green-500/20 border-2 border-green-400' 
        : 'bg-red-500/20 border-2 border-red-400'
    }`}>
      <div className={`p-4 rounded-full ${
        direction === 'right' ? 'bg-green-500' : 'bg-red-500'
      }`}>
        {direction === 'right' ? (
          <Heart className="h-12 w-12 text-white fill-white" />
        ) : (
          <X className="h-12 w-12 text-white" />
        )}
      </div>
    </div>
  );
}

// Profile Card Component
function ProfileCard({ 
  profile, 
  currentImageIndex, 
  isProcessing,
  onImageNavigate,
  onOpenDetailSheet,
  onOpenImageModal,
  hasActiveSubscription,
  swipeDirection
}: {
  profile: any;
  currentImageIndex: number;
  isShowingDetails: boolean;
  isProcessing: boolean;
  onImageNavigate: (action: 'prev' | 'next' | 'go', index?: number) => void;
  onOpenDetailSheet: () => void;
  onOpenImageModal: (imageUrl: string) => void;
  hasActiveSubscription: boolean;
  swipeDirection: 'left' | 'right' | null;
}) {
  const displayName = profile.name || profile.username;
  const hasMultipleImages = profile.pictures && profile.pictures.length > 1;
  const totalImages = profile.pictures?.length || 0;
  const isVerified = hasActiveSubscription;

  return (
    <Card className="h-full w-full cursor-grab active:cursor-grabbing shadow-2xl border-0 overflow-hidden rounded-2xl">
      <CardContent className="p-0 h-full relative">
        {/* Swipe Overlay */}
        <SwipeOverlay direction={swipeDirection} />

        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 z-40 flex items-center justify-center rounded-2xl">
            <div className="text-center text-white">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-sm">Creating your match...</p>
            </div>
          </div>
        )}

        {/* Profile Image with Gradient Overlay and Carousel */}
        <div className="relative h-2/3">
          <div className="relative w-full h-full overflow-hidden">
            {profile.pictures && profile.pictures.length > 0 ? (
              <>
                {/* Current Image */}
                <img 
                  src={profile.pictures[currentImageIndex] || '/api/placeholder/400/500'} 
                  alt={`${displayName} - Image ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300"
                  onClick={onOpenDetailSheet}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenImageModal(profile.pictures[currentImageIndex]);
                  }}
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
              <div className="w-full flex-col h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded-t-2xl">
                <MessageCircle className="h-12 w-12 text-gray-400" />
                <p className="text-gray-500 mt-2">No Pictures</p>
                {isVerified && (
                  <div className="absolute top-4 right-4 z-20">
                    <VerifiedBadge size="sm" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent rounded-t-2xl" />

          {/* Profile Info Overlay */}
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
              
              {/* Details Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDetailSheet();
                }}
                className="bg-black/50 text-white p-2 rounded-full backdrop-blur-sm hover:bg-black/70 transition-all duration-200 hover:scale-110 z-20"
              >
                <Eye className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="h-1/3 p-4 overflow-y-auto">
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
      </CardContent>
    </Card>
  );
}

// Swipe Instructions Component
function SwipeInstructions() {
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const lastShowTime = localStorage.getItem('swipeInstructionsLastShow');
    const now = Date.now();
    const fourMinutes = 4 * 60 * 1000;

    if (!lastShowTime || (now - parseInt(lastShowTime)) > fourMinutes) {
      setShowInstructions(true);
      localStorage.setItem('swipeInstructionsLastShow', now.toString());
    }
  }, []);

  if (!showInstructions) return null;

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4">
      <Alert className="bg-blue-50 border-blue-200 shadow-lg rounded-2xl">
        <div className="flex items-start justify-between w-full">
          <div className="flex items-start space-x-3 flex-1">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <AlertDescription className="text-blue-800 text-sm">
                <strong className="block mb-2">How to connect:</strong>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mb-1">
                      <X className="h-5 w-5 text-red-600" />
                    </div>
                    <span className="text-xs">Swipe left to pass</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-1">
                      <Heart className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="text-xs">Swipe right to like</span>
                  </div>
                </div>
              </AlertDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInstructions(false)}
            className="text-blue-600 hover:text-blue-800 ml-2 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Alert>
    </div>
  );
}

// iOS Style Bottom Sheet Component
function IOSDetailSheet({ 
  profile, 
  isOpen, 
  onClose,
  hasActiveSubscription 
}: {
  profile: any;
  isOpen: boolean;
  onClose: () => void;
  hasActiveSubscription: boolean;
}) {
  const [sheetPosition, setSheetPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const displayName = profile.name || profile.username;
  const isVerified = hasActiveSubscription;

  // Reset sheet position when opening
  useEffect(() => {
    if (isOpen) {
      setSheetPosition(0);
    }
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;
    
    if (deltaY > 0) {
      setSheetPosition(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    if (sheetPosition > 100) {
      onClose();
    } else {
      setSheetPosition(0);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartY(e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const currentY = e.clientY;
    const deltaY = currentY - startY;
    
    if (deltaY > 0) {
      setSheetPosition(deltaY);
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    if (sheetPosition > 100) {
      onClose();
    } else {
      setSheetPosition(0);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div 
        ref={sheetRef}
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl transition-transform duration-300 ${
          isDragging ? 'transition-none' : ''
        }`}
        style={{
          transform: `translateY(${sheetPosition}px)`
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        <div className="max-h-[80vh] overflow-y-auto pb-8">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {displayName}
                    {profile.age > 0 && `, ${profile.age}`}
                  </h2>
                  {isVerified && <VerifiedBadge size="md" />}
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm capitalize">
                  {profile.category}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 space-y-6 mt-4">
            {/* Bio Section */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-3">About</h3>
              <p className="text-gray-600 dark:text-gray-300 text-base leading-relaxed">
                {profile.bio || 'No bio available'}
              </p>
            </div>

            {/* Personal Details Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Gender */}
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div className="p-2 rounded-full bg-pink-100 dark:bg-pink-900/30">
                  <Heart className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Gender</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {profile.gender || 'Not specified'}
                  </p>
                </div>
              </div>

              {/* Interested In */}
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Interested In</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {profile.interestedIn || 'Not specified'}
                  </p>
                </div>
              </div>

              {/* Genotype */}
              {profile.genotype && (
                <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                    <Droplets className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Genotype</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {profile.genotype}
                    </p>
                  </div>
                </div>
              )}

              {/* Religion */}
              {profile.religious && (
                <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <Cross className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Religion</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {profile.religious}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Education & Department */}
            {(profile.department || profile.level) && (
              <div className="grid grid-cols-2 gap-3">
                {profile.department && (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                      <Book className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Department</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {profile.department}
                      </p>
                    </div>
                  </div>
                )}
                {profile.level && (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30">
                      <GraduationCap className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Level</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {profile.level}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Interests */}
            {profile.interests && profile.interests.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-3">Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest: string, i: number) => (
                    <span 
                      key={i}
                      className="px-3 py-2 bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 text-pink-700 dark:text-pink-300 rounded-full text-sm font-medium border border-pink-200 dark:border-pink-800"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
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

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [processingMatch, setProcessingMatch] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ url: string; profileName: string } | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  // State for image carousel per profile
  const [currentImageIndexes, setCurrentImageIndexes] = useState<{ [key: string]: number }>({});
  const [userSubscriptions, setUserSubscriptions] = useState<{ [key: string]: any }>({});

  // Drag and swipe handling
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

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
    toast.success("Link copied to clipboard!");
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

  const openImageModal = (profileId: string, imageUrl: string) => {
    const profile = profiles.find(p => p.id === profileId);
    const displayName = profile?.name || profile?.username || 'User';
    setSelectedImage({ url: imageUrl, profileName: displayName });
  };

  const openDetailSheet = (profile: any) => {
    setSelectedProfile(profile);
  };

  const closeDetailSheet = () => {
    setSelectedProfile(null);
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

  // Handle swipe action
  const handleSwipe = async (direction: 'left' | 'right') => {
    if (currentIndex >= profiles.length || !profiles[currentIndex]) return;

    const profile = profiles[currentIndex];
    setIsSwiping(true);
    setSwipeDirection(direction);

    try {
      const action = direction === 'right' ? 'like' : 'pass';
      const result = await swipeProfile(profile.id, action);

      if (result.match) {
        const matchedUser = profiles.find((p) => p.id === result.matched_with);
        setProcessingMatch(profile.id);
        
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

      // Move to next card after a brief delay to show swipe animation
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setSwipeDirection(null);
        setIsSwiping(false);
      }, 300);

    } catch (err) {
      toast.error('An error occurred while processing your swipe');
      setSwipeDirection(null);
      setIsSwiping(false);
    }
  };

  // Drag handlers for swipe
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX, y: clientY });
    setDragOffset({ x: 0, y: 0 });
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;
    
    setDragOffset({ x: deltaX, y: deltaY });

    // Show swipe direction overlay
    if (Math.abs(deltaX) > 50) {
      setSwipeDirection(deltaX > 0 ? 'right' : 'left');
    } else {
      setSwipeDirection(null);
    }
  };

  const handleDragEnd = () => {
    if (!isDragging) return;

    setIsDragging(false);
    
    // Check if swipe distance is sufficient
    if (Math.abs(dragOffset.x) > 100) {
      handleSwipe(dragOffset.x > 0 ? 'right' : 'left');
    } else {
      setSwipeDirection(null);
    }
    
    setDragOffset({ x: 0, y: 0 });
  };

  // Reset drag when mouse leaves element
  const handleDragLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      setSwipeDirection(null);
      setDragOffset({ x: 0, y: 0 });
    }
  };

  const canSwipe = currentIndex < profiles.length;

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
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-4">
              There are no other users to show right now. Check back later or invite friends to join!
            </p>
            <Button onClick={handleCopy} variant="outline" className="mr-2">
              Copy Invite Link
            </Button>
            <Button onClick={refetch}>
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
        {/* Header */}
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
          {canSwipe && currentProfile && (
            <div
              className={`absolute inset-0 w-full h-full transition-transform duration-200 ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              style={{
                transform: isDragging 
                  ? `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${dragOffset.x * 0.1}deg)`
                  : 'none'
              }}
              onMouseDown={handleDragStart}
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragLeave}
              onTouchStart={handleDragStart}
              onTouchMove={handleDragMove}
              onTouchEnd={handleDragEnd}
            >
              <ProfileCard
                key={currentProfile.id}
                profile={currentProfile}
                currentImageIndex={getCurrentImageIndex(currentProfile.id)}
                isShowingDetails={false}
                isProcessing={processingMatch === currentProfile.id}
                onImageNavigate={(action, index) => handleImageNavigate(currentProfile.id, action, index)}
                onOpenDetailSheet={() => openDetailSheet(currentProfile)}
                onOpenImageModal={(imageUrl) => openImageModal(currentProfile.id, imageUrl)}
                hasActiveSubscription={hasActiveSubscription(currentProfile.id)}
                swipeDirection={swipeDirection}
              />
            </div>
          )}

          {/* No more cards message */}
          {!canSwipe && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  That&apos;s all for now!
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  You&apos;ve seen all available profiles. Check back later for more.
                </p>
                <Button onClick={refetch}>
                  Refresh
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-8">
          <Button 
            variant="outline" 
            size="lg"
            disabled={!canSwipe || isSwiping}
            className="w-16 h-16 rounded-full border-red-300 dark:border-red-700 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
            onClick={() => handleSwipe('left')}
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
            onClick={() => handleSwipe('right')}
          >
            {isSwiping ? (
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            ) : (
              <Heart className="h-8 w-8 text-white" />
            )}
          </Button>
        </div>
      </div>

      {/* iOS Style Detail Sheet */}
      {selectedProfile && (
        <IOSDetailSheet
          profile={selectedProfile}
          isOpen={!!selectedProfile}
          onClose={closeDetailSheet}
          hasActiveSubscription={hasActiveSubscription(selectedProfile.id)}
        />
      )}

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