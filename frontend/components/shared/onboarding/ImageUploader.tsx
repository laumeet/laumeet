'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { X, Upload, Image as ImageIcon, Loader2, CheckCircle, AlertCircle, UserX } from 'lucide-react';
import Image from 'next/image';

interface ProcessingImage {
  file: File;
  previewUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'no-face';
  processedUrl?: string;
}

interface ImageUploaderProps {
  onImageUpload: (files: FileList) => void;
  processingImages: ProcessingImage[];
  onRemoveImage: (index: number) => void;
  isProcessingImages: boolean;
  getImageDisplayUrl: (img: ProcessingImage) => string;
  getStatusColor: (status: ProcessingImage['status']) => string;
  getStatusText: (status: ProcessingImage['status']) => string;
}

const ImageUploader = forwardRef<HTMLInputElement, ImageUploaderProps>(
  ({
    onImageUpload,
    processingImages,
    onRemoveImage,
    isProcessingImages,
    getImageDisplayUrl,
    getStatusColor,
    getStatusText
  }, ref) => {
    const internalRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => internalRef.current as HTMLInputElement);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0 && !isProcessingImages) {
        onImageUpload(e.target.files);
        e.target.value = ''; // Reset input
      }
    };

    const triggerFileInput = () => {
      if (internalRef.current && !isProcessingImages && processingImages.length < 5) {
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
      
      if (isProcessingImages || processingImages.length >= 5) {
        return;
      }

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        onImageUpload(files);
      }
    };

    const getStatusIcon = (status: ProcessingImage['status']) => {
      switch (status) {
        case 'processing':
          return <Loader2 className="h-3 w-3 animate-spin text-yellow-600" />;
        case 'completed':
          return <CheckCircle className="h-3 w-3 text-green-600" />;
        case 'error':
          return <AlertCircle className="h-3 w-3 text-red-600" />;
        case 'no-face':
          return <UserX className="h-3 w-3 text-orange-600" />;
        default:
          return null;
      }
    };

    const canUploadMore = processingImages.length < 5 && !isProcessingImages;

    return (
      <div className="space-y-4">
        <input
          type="file"
          ref={internalRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
          disabled={isProcessingImages || processingImages.length >= 5}
        />

        {/* Upload Card - Only show if we can upload more */}
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
                  <h3 className="font-medium text-gray-500 dark:text-gray-400">Processing Images...</h3>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Please wait while we process your images
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
              <div key={index} className={`relative group rounded-lg border-2 ${getStatusColor(img.status)}`}>
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

                {/* Remove Button - Show for all statuses except processing */}
                {img.status !== 'processing' && (
                  <button
                    type="button"
                    onClick={() => onRemoveImage(index)}
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
        {processingImages.length >= 5 && (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-2">
            Maximum of 5 photos reached
          </div>
        )}

        {/* Processing state message */}
        {isProcessingImages && processingImages.length < 5 && (
          <div className="text-center text-sm text-blue-600 dark:text-blue-400 py-2">
            Processing current image... Please wait before uploading another
          </div>
        )}

        {/* Empty State - Only show if no images and not at limit */}
        {processingImages.length === 0 && !isProcessingImages && (
          <div className="flex items-center justify-center text-gray-400 dark:text-gray-500 py-4">
            <ImageIcon className="h-5 w-5 mr-2" />
            <span className="text-sm">No images uploaded yet</span>
          </div>
        )}
      </div>
    );
  }
);

ImageUploader.displayName = 'ImageUploader';

export default ImageUploader;