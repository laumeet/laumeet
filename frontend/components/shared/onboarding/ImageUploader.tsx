/* eslint-disable @typescript-eslint/no-explicit-any */
// components/shared/onboarding/ImageUploader.tsx
'use client';

import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { X, Upload, Loader2, CheckCircle, AlertCircle, Download } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';

interface ProcessingImage {
  file: File;
  previewUrl: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  uploadedUrl?: string;
}

interface ImageUploaderProps {
  onImageUpload: (urls: string[]) => void;
  onRemoveImage: (index: number) => void;
  isAnonymous?: boolean | null;
  category?: string;
  maxImages?: number;
}

const ImageUploader = forwardRef<HTMLInputElement, ImageUploaderProps>(
  ({
    onImageUpload,
    onRemoveImage,
    isAnonymous = false,
    category = '',
    maxImages = 5
  }, ref) => {
    const [processingImages, setProcessingImages] = useState<ProcessingImage[]>([]);
    const [isProcessingImages, setIsProcessingImages] = useState(false);
    
    const internalRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => internalRef.current as HTMLInputElement);

    const handleImageUpload = async (event: any) => {
      try {
        setIsProcessingImages(true);
        const file = event.target.files[0];
        if (!file) return;

        if (processingImages.length >= maxImages) {
          toast.error(`You can only upload up to ${maxImages} photos. You already have ${processingImages.length}.`);
          return;
        }

        // Add new file to processing queue
        const newProcessingImage: ProcessingImage = {
          file,
          previewUrl: URL.createObjectURL(file),
          status: 'pending'
        };

        setProcessingImages(prev => [...prev, newProcessingImage]);
        const index = processingImages.length;

        // Update status to uploading
        setProcessingImages(prev =>
          prev.map((img, idx) =>
            idx === index ? { ...img, status: 'uploading' } : img
          )
        );

        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `${category ? category + '/' : ''}${fileName}`;

        const { error } = await supabase.storage
          .from('upload') // your Supabase bucket name
          .upload(filePath, file);

        if (error) throw error;

        const { data: publicData } = supabase.storage
          .from('upload')
          .getPublicUrl(filePath);

        // Update status to completed with uploaded URL
        setProcessingImages(prev =>
          prev.map((img, idx) =>
            idx === index ? { ...img, status: 'completed', uploadedUrl: publicData.publicUrl } : img
          )
        );

        // Notify parent component about the uploaded image URL
        const uploadedUrls = processingImages
          .filter(img => img.uploadedUrl)
          .map(img => img.uploadedUrl as string)
          .concat(publicData.publicUrl);
        
        onImageUpload(uploadedUrls);

      } catch (error: any) {
        console.error('Error uploading image:', error);
        
        // Update status to error
        setProcessingImages(prev =>
          prev.map((img, idx) =>
            idx === processingImages.length ? { ...img, status: 'error' } : img
          )
        );
        toast.error("Failed to upload image. Please try again.");
      } finally {
        setIsProcessingImages(false);
      }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0 && !isProcessingImages) {
        await handleImageUpload(e);
        e.target.value = ''; // Reset input
      }
    };

    const removeImage = async (index: number) => {
      const imageToRemove = processingImages[index];
      
      // Clean up preview URL
      if (imageToRemove?.previewUrl) {
        URL.revokeObjectURL(imageToRemove.previewUrl);
      }

      // Remove from Supabase storage if uploaded
      if (imageToRemove?.uploadedUrl) {
        try {
          const fileName = imageToRemove.uploadedUrl.split('/').pop();
          if (fileName) {
            await supabase.storage
              .from('upload')
              .remove([`${category ? category + '/' : ''}${fileName}`]);
          }
        } catch (error) {
          console.error('Error removing image from storage:', error);
        }
      }
      
      setProcessingImages(prev => prev.filter((_, i) => i !== index));
      
      // Update parent with remaining URLs
      const remainingUrls = processingImages
        .filter((_, i) => i !== index)
        .map(img => img.uploadedUrl)
        .filter(Boolean) as string[];
      
      onImageUpload(remainingUrls);
      onRemoveImage(index);
    };

    const triggerFileInput = () => {
      if (internalRef.current && !isProcessingImages && processingImages.length < maxImages) {
        internalRef.current.click();
      }
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (isProcessingImages || processingImages.length >= maxImages) {
        return;
      }

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        // Create a synthetic event for the drop
        const syntheticEvent = {
          target: {
            files: e.dataTransfer.files
          }
        };
        handleImageUpload(syntheticEvent);
      }
    };

    // Clean up URLs on unmount
    useEffect(() => {
      return () => {
        processingImages.forEach(img => {
          if (img.previewUrl) {
            URL.revokeObjectURL(img.previewUrl);
          }
        });
      };
    }, [processingImages]);

    const getStatusIcon = (status: ProcessingImage['status']) => {
      switch (status) {
        case 'uploading':
          return <Loader2 className="h-3 w-3 animate-spin text-yellow-600" />;
        case 'completed':
          return <CheckCircle className="h-3 w-3 text-green-600" />;
        case 'error':
          return <AlertCircle className="h-3 w-3 text-red-600" />;
        case 'pending':
          return <Download className="h-3 w-3 text-blue-600" />;
        default:
          return null;
      }
    };

    const getImageDisplayUrl = (img: ProcessingImage): string => {
      return img.previewUrl;
    };

    const getStatusColor = (status: ProcessingImage['status']): string => {
      switch (status) {
        case 'uploading': return 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
        case 'completed': return 'border-green-400 bg-green-50 dark:bg-green-900/20';
        case 'error': return 'border-red-400 bg-red-50 dark:bg-red-900/20';
        case 'pending': return 'border-blue-400 bg-blue-50 dark:bg-blue-900/20';
        default: return 'border-gray-200 dark:border-gray-700';
      }
    };

    const getStatusText = (status: ProcessingImage['status']): string => {
      switch (status) {
        case 'pending': return 'Pending';
        case 'uploading': return 'Uploading...';
        case 'completed': return 'Uploaded';
        case 'error': return 'Error';
        default: return '';
      }
    };

    const canUploadMore = processingImages.length < maxImages && !isProcessingImages;

    return (
      <div className="space-y-4">
        <input
          type="file"
          ref={internalRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
          disabled={isProcessingImages || processingImages.length >= maxImages}
        />

        {/* Upload Card */}
        {canUploadMore && (
          <Card
            className={`border-2 border-dashed transition-colors cursor-pointer ${
              isProcessingImages
                ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 cursor-not-allowed'
                : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:border-pink-400 dark:hover:border-pink-600'
            }`}
            onClick={triggerFileInput}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <CardContent className="flex flex-col items-center justify-center p-6 text-center">
              {isProcessingImages ? (
                <>
                  <Loader2 className="h-10 w-10 text-gray-400 mb-3 animate-spin" />
                  <h3 className="font-medium text-gray-500 dark:text-gray-400">Uploading Images...</h3>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Please wait while we upload your images
                  </p>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-gray-400 mb-3" />
                  <h3 className="font-medium text-gray-700 dark:text-gray-300">Upload Photo</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    PNG, JPG, GIF up to 10MB • Upload one at a time
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Uploaded Images */}
        {processingImages.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {processingImages.map((img, index) => (
              <div key={index} className={`relative group overflow-hidden rounded-lg border-2 ${getStatusColor(img.status)}`}>
                <div className="aspect-square rounded-lg overflow-hidden">
                  <Image
                    src={getImageDisplayUrl(img)}
                    alt={`Upload ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
                
                {/* Status Badge */}
                <div className="absolute top-1 left-1 flex items-center gap-1 bg-white/90 dark:bg-gray-800/90 px-2 py-1 rounded-full text-xs">
                  {getStatusIcon(img.status)}
                  <span className="font-medium">{getStatusText(img.status)}</span>
                </div>

                {/* Remove Button */}
                {img.status !== 'uploading' && (
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upload limit message */}
        {processingImages.length >= maxImages && (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-2">
            Maximum of {maxImages} photos reached
          </div>
        )}

        {/* Privacy Note */}
        {isAnonymous && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-amber-700 dark:text-amber-300 text-xs">
              <strong>Privacy Note:</strong> Your images are securely stored and will only be visible based on your privacy settings.
            </p>
          </div>
        )}
      </div>
    );
  }
);

ImageUploader.displayName = 'ImageUploader';

export default ImageUploader;