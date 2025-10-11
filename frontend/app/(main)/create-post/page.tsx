/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(main)/create-post/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { feedApi } from '@/lib/axio';

export default function CreatePostPage() {
  const [text, setText] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');

  const router = useRouter();

  const handleImageUpload = async (file: File) => {
    try {
      setUploading(true);

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload JPEG, PNG, GIF, or WebP images.');
      }

      // Validate file size (16MB max)
      if (file.size > 16 * 1024 * 1024) {
        throw new Error('File size too large. Maximum size is 16MB.');
      }

      const formData = new FormData();
      formData.append('image', file);

      console.log('🔧 Starting image upload...', {
        name: file.name,
        type: file.type,
        size: file.size
      });

      // Use the CORRECT upload endpoint
      const response = await feedApi.uploadImage(formData);
      const data = response.data;

      console.log('🔧 Upload response:', data);

      if (data.success) {
        setImageUrl(data.data.url);
        toast.success('Image uploaded successfully!');
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Upload failed', {
        description: error.response?.data?.message || error.message || 'Failed to upload image'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setImageUrl(''); // Clear previous image URL
      handleImageUpload(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!text.trim()) {
      toast.error('Missing content', {
        description: 'Please write something for your post'
      });
      return;
    }

    try {
      setCreating(true);

      const postData = {
        text: text.trim(),
        category: category.trim() || 'general',
        location: location.trim() || undefined,
        image: imageUrl || undefined,
      };

      console.log('🔧 Creating post with data:', postData);
      console.log('🔧 Sending POST request to /api/feed/posts');

      const response = await feedApi.createPost(postData);
      const data = response.data;

      console.log('🔧 Post creation response:', data);

      if (data.success) {
        console.log('✅ Post created successfully, redirecting to feed...');
        toast.success('Post created!', {
          description: 'Your post has been shared with the campus community'
        });

        // Clear form
        setText('');
        setCategory('');
        setLocation('');
        setImage(null);
        setImageUrl('');

        // Redirect to feed
        router.push('/feed');
      } else {
        throw new Error(data.message || 'Post creation failed');
      }
    } catch (error: any) {
      console.error('❌ Error creating post:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      toast.error('Failed to create post', {
        description: error.response?.data?.message || error.message || 'Please try again later'
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 pb-32">
      <div className="space-y-4 pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Post</h1>
          <p className="text-gray-500 dark:text-gray-400">Share something with the campus community</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Post</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="text">What&apos;s on your mind?</Label>
              <Textarea
                id="text"
                placeholder="Share your thoughts, updates, or questions..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[120px] resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  placeholder="e.g., Academic, Social, Sports..."
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location (optional)</Label>
                <Input
                  id="location"
                  placeholder="e.g., Library, Cafeteria..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">Add Image (optional)</Label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                <input
                  type="file"
                  id="image"
                  accept="image/jpeg, image/jpg, image/png, image/gif, image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={uploading}
                />
                <label htmlFor="image" className={`cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
                  <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {uploading ? 'Uploading...' : 'Click to upload an image'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    PNG, JPG, GIF, WebP up to 16MB
                  </p>
                </label>
              </div>

              {imageUrl && (
                <div className="mt-4">
                  <p className="text-sm text-green-600 dark:text-green-400 mb-2">
                    ✓ Image uploaded successfully
                  </p>
                  <img
                    src={imageUrl}
                    alt="Upload preview"
                    className="max-h-48 rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={creating || uploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                disabled={creating || uploading || !text.trim()}
              >
                {creating ? 'Posting...' : 'Create Post'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}