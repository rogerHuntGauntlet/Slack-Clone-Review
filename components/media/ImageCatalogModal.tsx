'use client'

import React, { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { X, Upload, Loader } from 'lucide-react';
import { FileObject } from '@supabase/storage-js';

interface ImageCatalogModalProps {
  onSelect: (imageUrl: string) => void;
  onUploadNew: () => void;
  onClose: () => void;
}

const ImageCatalogModal: React.FC<ImageCatalogModalProps> = ({ onSelect, onUploadNew, onClose }) => {
  const [images, setImages] = useState<{ name: string; url: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      // List all files in the images directory
      const { data: files, error } = await supabase.storage
        .from('chat_attachments')
        .list('images/');

      if (error) {
        console.error('Error fetching images:', error);
        return;
      }

      // Get public URLs for all images
      const imageUrls = await Promise.all(
        files.map(async (file: FileObject) => {
          const { data: { publicUrl } } = supabase.storage
            .from('chat_attachments')
            .getPublicUrl(`images/${file.name}`);
          
          return {
            name: file.name,
            url: publicUrl
          };
        })
      );

      setImages(imageUrls);
    } catch (error) {
      console.error('Error in fetchImages:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Select Image</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 overflow-y-auto p-2">
              {images.map((image) => (
                <div
                  key={image.name}
                  className="relative group cursor-pointer aspect-square"
                  onClick={() => onSelect(image.url)}
                >
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-full h-full object-cover rounded-lg border dark:border-gray-700 hover:opacity-75 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity rounded-lg flex items-center justify-center">
                    <span className="text-white opacity-0 group-hover:opacity-100">Select</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t dark:border-gray-700">
              <button
                onClick={onUploadNew}
                className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
              >
                <Upload size={20} />
                Upload New Image
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ImageCatalogModal; 