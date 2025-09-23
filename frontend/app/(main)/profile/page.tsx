// app/(main)/profile/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Edit3, Shield, Eye, EyeOff, Heart, MessageCircle, MapPin, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface UserProfile {
  id: string;
  name: string;
  age: string;
  bio: string;
  interests: string;
  images: string[];
  isAnonymous: boolean;
  category: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    // Get user data from localStorage
    const users = JSON.parse(localStorage.getItem('campusVibesUsers') || '[]');
    const currentUser = users[users.length - 1]; // Get the most recent user
    if (currentUser) {
      setUser(currentUser);
      setIsAnonymous(currentUser.isAnonymous || false);
    }
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="h-8 w-8 text-white" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">No profile data found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="text-center">
        <div className="relative inline-block mb-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 p-1">
            <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
              {user.images && user.images.length > 0 ? (
                <img 
                  src={user.images[0]} 
                  alt="Profile" 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-pink-500">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
          {user.isAnonymous && (
            <div className="absolute bottom-0 right-0 bg-purple-500 rounded-full p-1">
              <Shield className="h-4 w-4 text-white" />
            </div>
          )}
        </div>
        
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          {user.name}, {user.age}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">{user.category}</p>
        
        <div className="flex justify-center space-x-4 mt-3">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <MapPin className="h-4 w-4 mr-1" />
            Campus
          </div>
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="h-4 w-4 mr-1" />
            Joined recently
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700">
          <Edit3 className="h-4 w-4 mr-2" />
          Edit Profile
        </Button>
        <Button variant="outline" className="border-gray-300 dark:border-gray-600">
          <MessageCircle className="h-4 w-4 mr-2" />
          Message
        </Button>
      </div>

      {/* Anonymous Mode Toggle */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                {isAnonymous ? (
                  <EyeOff className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                ) : (
                  <Eye className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white">
                  {isAnonymous ? 'Anonymous Mode' : 'Public Mode'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isAnonymous ? 'Your profile is hidden' : 'Your profile is visible to others'}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Bio Section */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-2">About Me</h3>
          <p className="text-gray-600 dark:text-gray-400">{user.bio}</p>
        </CardContent>
      </Card>

      {/* Interests */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Interests</h3>
          <div className="flex flex-wrap gap-2">
            {user.interests.split(',').map((interest, index) => (
              <span 
                key={index}
                className="px-3 py-1 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 text-pink-600 dark:text-pink-400 rounded-full text-sm"
              >
                {interest.trim()}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Photos */}
      {user.images && user.images.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Photos</h3>
            <div className="grid grid-cols-3 gap-2">
              {user.images.map((image, index) => (
                <div key={index} className="aspect-square rounded-lg overflow-hidden">
                  <img 
                    src={image} 
                    alt={`Photo ${index + 1}`} 
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}