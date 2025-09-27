// app/(main)/profile/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Edit3, Shield, Eye, EyeOff, Heart, MessageCircle, MapPin, Calendar, Book, Cross, Droplets, GraduationCap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '@/lib/axio';

interface UserProfile {
  id: string;
  username: string;
  name: string;
  age: string;
  gender: string;
  department: string;
  genotype: string;
  level: string;
  interestedIn: string;
  religious: string;
  isAnonymous: boolean;
  category: string;
  bio: string;
  pictures: string[];
  timestamp: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/profile");
        setUser(res.data.user);
        setIsAnonymous(res.data.user?.isAnonymous || false);
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      }
    };

    fetchProfile();
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="h-8 w-8 text-white" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Format join date
  const joinDate = user.timestamp ? new Date(user.timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long'
  }) : 'Recently';

  return (
    <div className="space-y-6 pb-6">
      {/* Profile Header */}
      <div className="text-center">
        <div className="relative inline-block mb-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 p-1">
            <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
              {user.pictures && user.pictures.length > 0 ? (
                <img
                  src={user.pictures[0]}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-pink-500">
                  {user.username.charAt(0).toUpperCase()}
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
          {user.name || user.username}, {user.age}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 capitalize">{user.category}</p>

        <div className="flex justify-center space-x-4 mt-3">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <MapPin className="h-4 w-4 mr-1" />
            {user.department || 'Campus'}
          </div>
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="h-4 w-4 mr-1" />
            Joined {joinDate}
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

      {/* Personal Information Grid */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Personal Information</h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Gender */}
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-full bg-pink-100 dark:bg-pink-900/30">
                <Heart className="h-4 w-4 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Gender</p>
                <p className="font-medium capitalize">{user.gender}</p>
              </div>
            </div>

            {/* Department */}
            {user.department && (
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Book className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Department</p>
                  <p className="font-medium">{user.department}</p>
                </div>
              </div>
            )}

            {/* Level */}
            {user.level && (
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                  <GraduationCap className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Level</p>
                  <p className="font-medium">{user.level}</p>
                </div>
              </div>
            )}

            {/* Genotype */}
            {user.genotype && (
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                  <Droplets className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Genotype</p>
                  <p className="font-medium">{user.genotype}</p>
                </div>
              </div>
            )}

            {/* Religious */}
            {user.religious && (
              <div className="flex items-center space-x-2 col-span-2">
                <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                  <Cross className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Religion</p>
                  <p className="font-medium">{user.religious}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Looking For */}
      {user.interestedIn && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Looking For</h3>
            <p className="text-gray-600 dark:text-gray-400 capitalize">{user.interestedIn}</p>
          </CardContent>
        </Card>
      )}

      {/* Bio Section */}
      {user.bio && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-2">About Me</h3>
            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">{user.bio}</p>
          </CardContent>
        </Card>
      )}

      {/* Photos */}
      {user.pictures && user.pictures.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-3">
              Photos ({user.pictures.length})
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {user.pictures.map((image, index) => (
                <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <img
                    src={image}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Badge */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-white">Profile Category</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                How others see your profile
              </p>
            </div>
            <span className="px-3 py-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full text-sm font-medium capitalize">
              {user.category}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}