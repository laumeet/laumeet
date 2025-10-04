/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(main)/profile/page.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Edit3, Shield, Eye, Heart, MessageCircle,
  MapPin, Calendar, Book, Cross, Droplets, GraduationCap,
  Save, X, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw
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

// Lightbox Component
function LightboxModal({ 
  images, 
  currentIndex, 
  onClose, 
  onNext, 
  onPrev 
}: {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });

  const currentImage = images[currentIndex];

  // Reset zoom and rotation when image changes
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          onPrev();
          break;
        case 'ArrowRight':
          onNext();
          break;
        case '+':
        case '=':
          setZoom(prev => Math.min(prev + 0.25, 3));
          break;
        case '-':
          setZoom(prev => Math.max(prev - 0.25, 0.5));
          break;
        case 'r':
          setRotation(prev => (prev + 90) % 360);
          break;
        case '0':
          setZoom(1);
          setRotation(0);
          setPosition({ x: 0, y: 0 });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev]);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      setZoom(prev => {
        const newZoom = prev - e.deltaY * 0.01;
        return Math.max(0.5, Math.min(3, newZoom));
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setStartPosition({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - startPosition.x,
        y: e.clientY - startPosition.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetTransform = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Modal Content */}
      <div 
        className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full backdrop-blur-sm transition-all duration-200 hover:scale-110"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={onPrev}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-4 rounded-full backdrop-blur-sm transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={onNext}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-4 rounded-full backdrop-blur-sm transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={currentIndex === images.length - 1}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        {/* Image Counter */}
        <div className="absolute top-4 left-4 z-10 bg-black/50 text-white px-3 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
          {currentIndex + 1} / {images.length}
        </div>

        {/* Controls */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 flex items-center gap-2 bg-black/50 text-white px-4 py-2 rounded-full backdrop-blur-sm">
          <button
            onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            disabled={zoom <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          
          <span className="text-xs mx-2 min-w-[45px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          
          <button
            onClick={() => setZoom(prev => Math.min(3, prev + 0.25))}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            disabled={zoom >= 3}
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => setRotation(prev => (prev + 90) % 360)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors ml-2"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          
          <button
            onClick={resetTransform}
            className="p-2 hover:bg-white/20 rounded-full transition-colors ml-2 text-xs"
          >
            Reset
          </button>
        </div>

        {/* Image Container */}
        <div 
          className="relative w-full h-full flex items-center justify-center overflow-hidden"
          onWheel={handleWheel}
        >
          <img
            src={currentImage}
            alt={`Photo ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain transition-transform duration-200"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg) translate(${position.x}px, ${position.y}px)`,
              cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            draggable={false}
          />
        </div>

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-10 flex gap-2 max-w-full overflow-x-auto px-4 py-2">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => {
                  // This would need to be handled by parent component
                  // For now, we'll just navigate using the existing functions
                  if (index > currentIndex) {
                    for (let i = currentIndex; i < index; i++) onNext();
                  } else if (index < currentIndex) {
                    for (let i = currentIndex; i > index; i--) onPrev();
                  }
                }}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                  index === currentIndex 
                    ? 'border-pink-500 ring-2 ring-pink-500/50 scale-110' 
                    : 'border-white/30 hover:border-white/50'
                }`}
              >
                <img
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Background Click to Close */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
}

export default function ProfilePage() {
  const { profile, loading, error, refetch } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

  // Lightbox functions
  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextImage = () => {
    if (profile?.pictures) {
      setCurrentImageIndex(prev => 
        prev === profile.pictures.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (profile?.pictures) {
      setCurrentImageIndex(prev => 
        prev === 0 ? profile.pictures.length - 1 : prev - 1
      );
    }
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
      {/* Lightbox Modal */}
      {lightboxOpen && profile.pictures && (
        <LightboxModal
          images={profile.pictures}
          currentIndex={currentImageIndex}
          onClose={closeLightbox}
          onNext={nextImage}
          onPrev={prevImage}
        />
      )}

      {/* Profile Header */}
      <div className="text-center">
        <div className="relative inline-block mb-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 p-1 cursor-pointer hover:scale-105 transition-transform duration-200">
            <div 
              className="w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden"
              onClick={() => profile.pictures && profile.pictures.length > 0 && openLightbox(0)}
            >
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
                    <div 
                      key={index} 
                      className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer group relative"
                      onClick={() => openLightbox(index)}
                    >
                      <img
                        src={image}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                        <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-300" />
                      </div>
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