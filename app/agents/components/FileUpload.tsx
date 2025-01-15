'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileType, AgentFile } from '../types/agent-types';
import { X, Upload, FileText, Image, Video, Music } from 'lucide-react';

interface FileUploadProps {
  type: FileType;
  existingFiles: AgentFile[];
  onFilesSelected: (files: AgentFile[]) => void;
  onFileRemove: (index: number) => void;
  onReorder: (dragIndex: number, hoverIndex: number) => void;
  onFileSelect?: (file: AgentFile) => void;
}

const typeConfig = {
  text: {
    accept: {
      'text/*': ['.txt', '.pdf', '.json', '.md', '.csv']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    icon: FileText
  },
  image: {
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    icon: Image
  },
  video: {
    accept: {
      'video/*': ['.mp4', '.webm']
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    icon: Video
  },
  audio: {
    accept: {
      'audio/*': ['.mp3', '.wav', '.ogg']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    icon: Music
  }
};

export function FileUpload({
  type,
  existingFiles,
  onFilesSelected,
  onFileRemove,
  onReorder,
  onFileSelect
}: FileUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles: AgentFile[] = acceptedFiles.map(file => ({
        file,
        type,
        progress: 0
      }));
      onFilesSelected(newFiles);
    },
    [type, onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: typeConfig[type].accept,
    maxSize: typeConfig[type].maxSize,
    multiple: true
  });

  const Icon = typeConfig[type].icon;

  return (
    <div className="flex flex-col h-full">
      <div
        {...getRootProps()}
        className={`
          flex-1 border-2 border-dashed rounded-lg p-3
          ${isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:border-gray-600'}
          transition-colors cursor-pointer min-h-[100px]
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center h-full space-y-2">
          <Icon className="h-6 w-6 text-gray-400" />
          <div className="text-center">
            <p className="text-xs text-gray-300">
              Drop files or click
            </p>
            <p className="text-xs text-gray-500">
              Max: {typeConfig[type].maxSize / (1024 * 1024)}MB
            </p>
          </div>
        </div>
      </div>

      {existingFiles.length > 0 && (
        <div className="mt-2 space-y-1 max-h-[120px] overflow-y-auto">
          {existingFiles.map((file, index) => (
            <div
              key={file.file.name}
              className="flex items-center justify-between p-1.5 bg-gray-700/50 rounded"
              onClick={() => onFileSelect?.(file)}
            >
              <div className="flex items-center space-x-2 min-w-0">
                <Icon className="h-3 w-3 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-white truncate">{file.file.name}</span>
                {file.progress > 0 && file.progress < 100 && (
                  <div className="w-8 h-1 bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFileRemove(index);
                }}
                className="p-0.5 text-gray-400 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 