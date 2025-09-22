// components/shared/onboarding/ImageUploader.tsx
'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

interface ImageUploaderProps {
  onImageUpload: (files: FileList) => void;
  uploadedImages: string[];
  onRemoveImage: (index: number) => void;
}

const ImageUploader = forwardRef<HTMLInputElement, ImageUploaderProps>(
  ({ onImageUpload, uploadedImages, onRemoveImage }, ref) => {
    const internalRef = useRef<HTMLInputElement>(null);
    
    useImperativeHandle(ref, () => internalRef.current as HTMLInputElement);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onImageUpload(e.target.files);
        e.target.value = '';
      }
    };
    
    const triggerFileInput = () => {
      if (internalRef.current) {
        internalRef.current.click();
      }
    };
    
    return (
      <div className="space-y-4">
        <input
          type="file"
          ref={internalRef}
          onChange={handleFileChange}
          accept="image/*"
          multiple
          className="hidden"
        />
        
        {/* Upload Card */}
        <Card 
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-pink-400 dark:hover:border-pink-600 transition-colors cursor-pointer bg-gray-50 dark:bg-gray-800/50"
          onClick={triggerFileInput}
        >
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <Upload className="h-10 w-10 text-gray-400 mb-3" />
            <h3 className="font-medium text-gray-700 dark:text-gray-300">Upload Photos</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              PNG, JPG, GIF up to 10MB
            </p>
          </CardContent>
        </Card>
        
        {/* Uploaded Images */}
        {uploadedImages.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {uploadedImages.map((url, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <Image
                    src={url}
                    alt={`Upload ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveImage(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Empty State */}
        {uploadedImages.length === 0 && (
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