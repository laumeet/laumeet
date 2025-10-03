/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(main)/profile/page.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Edit3, Shield, Eye, Heart, MessageCircle,
  MapPin, Calendar, Book, Cross, Droplets, GraduationCap,
  Save, X, Loader2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/axio';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/get-profile';

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
  const { profile, loading, error, refetch } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields - initialize with profile data
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState('');
  const [gender, setGender] = useState('');
  const [interestedIn, setInterestedIn] = useState('');
  const [level, setLevel] = useState('');

  // Initialize form fields when profile data is available
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setDepartment(profile.department || '');
      setCategory(profile.category || '');
      setGender(profile.gender || '');
      setInterestedIn(profile.interestedIn || '');
      setLevel(profile.level || '');
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const updateData = {
        username,
        bio,
        department,
        category,
        interestedIn,
        level
      };
      const res = await api.put('/page/update-profile', updateData);
      if (res.data.success) {
        await refetch(); // Refresh the profile data
        setIsEditing(false);
        toast.success("Profile updated successfully");
      }
    } catch (err: any) {
      console.error("Failed to update profile:", err);
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form fields to current profile data
    if (profile) {
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setDepartment(profile.department || '');
      setCategory(profile.category || '');
      setGender(profile.gender || '');
      setInterestedIn(profile.interestedIn || '');
      setLevel(profile.level || '');
    }
    setIsEditing(false);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-pink-500" />
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error loading profile: {error}</p>
          <Button onClick={refetch} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Show no profile state
  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">No profile found</p>
          <Button onClick={refetch} variant="outline">
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  const joinDate = profile.timestamp
    ? new Date(profile.timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      })
    : 'Recently';

  const categories = [
    "Serious Relationship",
    "Friend With Benefits",
    "Hook Up",
    "Sex Chat",
    "Fuck Mate",
    "Friend to Vibe With"
  ];

  const genders = ["male", "female", "other"];
  const levels = ["100 Level", "200 Level", "300 Level", "400 Level", "500 Level", "Postgraduate"];
  const interests = ["male", "female", "both"];

  return (
    <div className="space-y-6 pb-28">
      {/* Profile Header */}
      <div className="text-center">
        <div className="relative inline-block mb-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 p-1">
            <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
              {profile.pictures && profile.pictures.length > 0 ? (
                <img
                  src={profile.pictures[0]}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-pink-500">
                  {profile.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              )}
            </div>
          </div>
          {profile.isAnonymous && (
            <div className="absolute bottom-0 right-0 bg-purple-500 rounded-full p-1">
              <Shield className="h-4 w-4 text-white" />
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="max-w-md mx-auto space-y-3">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="text-center text-lg font-bold"
            />
            <p className="text-gray-600 dark:text-gray-400">{profile.age} years old</p>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-800 capitalize dark:text-white">
              {profile.name || profile.username}, {profile.age}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 capitalize">
              @{profile.username} • {profile.age} years old
            </p>
            <p className="text-gray-600 dark:text-gray-400 capitalize">{profile.category}</p>
          </>
        )}

        <div className="flex justify-center space-x-4 mt-3">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <MapPin className="h-4 w-4 mr-1" />
            {profile.department || 'Campus'}
          </div>
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="h-4 w-4 mr-1" />
            Joined {joinDate}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {isEditing ? (
          <>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={() => setIsEditing(true)}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
            <Button variant="outline" className="border-gray-300 dark:border-gray-600">
              <MessageCircle className="h-4 w-4 mr-2" />
              Message
            </Button>
          </>
        )}
      </div>

      {/* Personal Information Grid */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gender */}
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              {isEditing ? (
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {genders.map((gen) => (
                      <SelectItem key={gen} disabled value={gen} className="capitalize">
                        {gen}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-full bg-pink-100 dark:bg-pink-900/30">
                    <Heart className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                  </div>
                  <p className="font-medium capitalize">{profile.gender}</p>
                </div>
              )}
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              {isEditing ? (
                <Input
                  id="department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Your department"
                />
              ) : profile.department ? (
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Book className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="font-medium">{profile.department}</p>
                </div>
              ) : (
                <p className="text-gray-500">Not set</p>
              )}
            </div>

            {/* Level */}
            <div className="space-y-2">
              <Label htmlFor="level">Academic Level</Label>
              {isEditing ? (
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {levels.map((lvl) => (
                      <SelectItem key={lvl} value={lvl}>
                        {lvl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : profile.level ? (
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                    <GraduationCap className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="font-medium">{profile.level}</p>
                </div>
              ) : (
                <p className="text-gray-500">Not set</p>
              )}
            </div>

            {/* Interested In */}
            <div className="space-y-2">
              <Label htmlFor="interestedIn">Interested In</Label>
              {isEditing ? (
                <Select value={interestedIn} onValueChange={setInterestedIn}>
                  <SelectTrigger>
                    <SelectValue placeholder="Who are you interested in?" />
                  </SelectTrigger>
                  <SelectContent>
                    {interests.map((int) => (
                      <SelectItem key={int} value={int}>
                        {int}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : profile.interestedIn ? (
                <p className="text-gray-600 dark:text-gray-400 capitalize">{profile.interestedIn}</p>
              ) : (
                <p className="text-gray-500">Not set</p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Looking For</Label>
              {isEditing ? (
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="What are you looking for?" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-gray-600 dark:text-gray-400 capitalize">{profile.category}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bio Section */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-2">About Me</h3>
          {isEditing ? (
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others about yourself..."
              rows={4}
              maxLength={500}
            />
          ) : profile.bio ? (
            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">{profile.bio}</p>
          ) : (
            <p className="text-gray-500 italic">No bio yet</p>
          )}
          {isEditing && (
            <p className="text-xs text-gray-500 mt-1">{bio.length}/500 characters</p>
          )}
        </CardContent>
      </Card>

      {/* Display-only fields */}
      {!isEditing && (
        <>
          {profile.genotype && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                    <Droplets className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Genotype</p>
                    <p className="font-medium">{profile.genotype}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {profile.religious && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <Cross className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Religion</p>
                    <p className="font-medium">{profile.religious}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {profile.pictures && profile.pictures.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-3">
                  Photos ({profile.pictures.length})
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {profile.pictures.map((image, index) => (
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
        </>
      )}
    </div>
  );
}