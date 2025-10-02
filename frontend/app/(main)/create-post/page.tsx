// app/(main)/create-post/page.tsx
'use client';

import { useState, useRef } from 'react';
import { ArrowLeft, Image, MapPin, Calendar, Users, Smile, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userDepartment: string;
  content: string;
  image?: string;
  category: string;
  location?: string;
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
}

export default function CreatePostPage() {
  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [category, setCategory] = useState('General');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const categories = [
    'General', 'Academic', 'Social', 'Sports', 'Music', 'Art', 
    'Technology', 'Business', 'Study Group', 'Event', 'Question'
  ];

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size should be less than 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('Please write something to post');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user info (in a real app, this would come from auth context)
      const currentUser = {
        id: 'current-user',
        name: 'You',
        avatar: '/api/placeholder/40/40',
        department: 'Student'
      };

      const newPost: Post = {
        id: Date.now().toString(),
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        userDepartment: currentUser.department,
        content: content.trim(),
        image: selectedImage || undefined,
        category,
        location: location || undefined,
        timestamp: new Date().toISOString(),
        likes: 0,
        comments: 0,
        shares: 0
      };

      // Save to localStorage
      const existingPosts = JSON.parse(localStorage.getItem('campus-vibes-posts') || '[]');
      const updatedPosts = [newPost, ...existingPosts];
      localStorage.setItem('campus-vibes-posts', JSON.stringify(updatedPosts));

      toast.success('Post created successfully!');
      
      // Reset form
      setContent('');
      setSelectedImage(null);
      setCategory('General');
      setLocation('');
      
      // Redirect to feed
      setTimeout(() => {
        router.push('/feed');
      }, 1000);

    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Create Post</h1>
          
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Post
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Create Post Form */}
      <div className="p-4 space-y-6">
        {/* User Info */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-white font-semibold">
            Y
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">You</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Student</p>
          </div>
        </div>

        {/* Content Textarea */}
        <Textarea
          placeholder="What's on your mind? Share something with the campus community..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[120px] resize-none border-0 text-lg bg-transparent focus:ring-0 p-0 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        />

        {/* Selected Image Preview */}
        {selectedImage && (
          <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <img
              src={selectedImage}
              alt="Post preview"
              className="w-full h-64 object-cover"
            />
            <button
              onClick={removeImage}
              className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition-colors"
            >
              <span className="sr-only">Remove image</span>
              ×
            </button>
          </div>
        )}

        {/* Post Options */}
        <Card className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
          <CardContent className="p-4 space-y-4">
            {/* Add Image */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-full bg-blue-50 dark:bg-blue-900/20">
                  <Image className="h-4 w-4 text-blue-500" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Add Photo</span>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Browse
              </Button>
            </div>

            {/* Category */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-full bg-green-50 dark:bg-green-900/20">
                  <Users className="h-4 w-4 text-green-500" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</span>
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-full bg-orange-50 dark:bg-orange-900/20">
                  <MapPin className="h-4 w-4 text-orange-500" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Location</span>
              </div>
              <input
                type="text"
                placeholder="Add location..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 w-32"
              />
            </div>
          </CardContent>
        </Card>

        {/* Category Tags */}
        <div className="flex flex-wrap gap-2">
          {categories.slice(0, 6).map((cat) => (
            <Badge
              key={cat}
              variant={category === cat ? "default" : "outline"}
              className={`cursor-pointer transition-all ${
                category === cat 
                  ? 'bg-pink-500 text-white' 
                  : 'hover:bg-pink-50 dark:hover:bg-pink-900/20'
              }`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>

        {/* Character Count */}
        <div className="text-right">
          <span className={`text-sm ${
            content.length > 500 ? 'text-red-500' : 'text-gray-500'
          }`}>
            {content.length}/500
          </span>
        </div>
      </div>
    </div>
  );
}