// app/(main)/explore/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Heart, X, Shield, Info, Filter, MapPin, Calendar, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Profile {
  id: string;
  name: string;
  age: number;
  bio: string;
  images: string[];
  category: string;
  isAnonymous: boolean;
  department?: string;
  interests?: string[];
  distance?: number;
  compatibility?: number;
}

export default function ExplorePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Mock data - replace with API call
  useEffect(() => {
    const mockProfiles: Profile[] = [
      {
        id: '1',
        name: 'Alex Johnson',
        age: 22,
        bio: 'Computer Science major passionate about AI and machine learning. Love hiking and coffee dates.',
        images: ['/api/placeholder/400/500'],
        category: 'Serious Relationship',
        isAnonymous: false,
        department: 'Computer Science',
        interests: ['AI', 'Hiking', 'Coffee', 'Tech'],
        distance: 1.2,
        compatibility: 87
      },
      {
        id: '2',
        name: 'Taylor Smith',
        age: 21,
        bio: 'Music production and art enthusiast. Always looking for new concert buddies!',
        images: ['/api/placeholder/400/500'],
        category: 'Friend to Vibe With',
        isAnonymous: true,
        department: 'Music',
        interests: ['Music', 'Art', 'Concerts', 'Photography'],
        distance: 0.8,
        compatibility: 92
      },
      {
        id: '3',
        name: 'Jordan Miller',
        age: 23,
        bio: 'Business major with a passion for fitness and nutrition. Let\'s hit the gym together!',
        images: ['/api/placeholder/400/500'],
        category: 'Friend With Benefits',
        isAnonymous: false,
        department: 'Business',
        interests: ['Fitness', 'Nutrition', 'Entrepreneurship', 'Travel'],
        distance: 2.1,
        compatibility: 78
      }
    ];
    setProfiles(mockProfiles);
  }, []);

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

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const diff = currentX - startX;
    if (diff > 100) {
      handleSwipe('right');
    } else if (diff < -100) {
      handleSwipe('left');
    }
    
    setSwipeDirection(null);
    setCurrentX(0);
    setStartX(0);
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'right') {
      console.log('Liked:', profiles[currentIndex].name);
      // API call to like profile
    } else {
      console.log('Passed on:', profiles[currentIndex].name);
    }

    // Animate card out
    setTimeout(() => {
      if (currentIndex < profiles.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // Reset or load more profiles
        setCurrentIndex(0);
      }
    }, 300);
  };

  if (profiles.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400">Loading profiles...</p>
        </div>
      </div>
    );
  }

  const currentProfile = profiles[currentIndex];
  const rotate = isDragging ? (currentX - startX) * 0.1 : 0;
  const opacity = Math.min(1, 1 - Math.abs(rotate) / 30);

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Discover</h1>
          <p className="text-gray-500 dark:text-gray-400">Swipe to connect with amazing people</p>
        </div>
        <Button variant="outline" className="rounded-xl border-gray-300 dark:border-gray-600">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Profile Stack */}
      <div className="relative h-[600px]">
        {profiles.slice(currentIndex, currentIndex + 3).map((profile, index) => (
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
                {/* Profile Image with Gradient Overlay */}
                <div className="h-2/3 relative">
                  <img 
                    src={profile.images[0]} 
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Advanced Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  
                  {/* Profile Badges */}
                  <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
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
                    <button className="bg-black/50 text-white p-2 rounded-full backdrop-blur-sm">
                      <Info className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Profile Info */}
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="flex items-end justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-1">
                          {profile.name}, {profile.age}
                        </h2>
                        <p className="text-gray-200 text-sm">{profile.category}</p>
                        
                        {/* Additional Info */}
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex items-center text-gray-200 text-sm">
                            <MapPin className="h-3 w-3 mr-1" />
                            {profile.distance}km
                          </div>
                          <div className="flex items-center text-gray-200 text-sm">
                            <Calendar className="h-3 w-3 mr-1" />
                            {profile.department}
                          </div>
                        </div>
                      </div>
                      
                      {/* Compatibility Circle */}
                      <div className="relative">
                        <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">{profile.compatibility}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bio and Interests Section */}
                <div className="p-6 h-1/3">
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">
                    {profile.bio}
                  </p>
                  
                  {/* Interests */}
                  <div className="flex flex-wrap gap-2">
                    {profile.interests?.map((interest, i) => (
                      <span 
                        key={i}
                        className="px-3 py-1 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}

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
          className="w-16 h-16 rounded-full border-red-300 dark:border-red-700 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-200"
          onClick={() => handleSwipe('left')}
        >
          <X className="h-8 w-8 text-red-500" />
        </Button>
        
        <Button 
          variant="outline" 
          size="lg"
          className="w-16 h-16 rounded-full border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Shield className="h-6 w-6 text-blue-500" />
        </Button>
        
        <Button 
          size="lg"
          className="w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-teal-500 shadow-lg hover:shadow-xl hover:from-green-600 hover:to-teal-600 transition-all duration-200"
          onClick={() => handleSwipe('right')}
        >
          <Heart className="h-8 w-8 text-white" />
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