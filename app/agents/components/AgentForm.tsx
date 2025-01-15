'use client';

import { useState } from 'react';
import { Agent, AgentFile, CreateAgentDTO, UpdateAgentDTO, FileType } from '../types/agent-types';
import { FileUpload } from './FileUpload';

interface AgentFormProps {
  agent?: Agent;
  onSubmit: (data: CreateAgentDTO | UpdateAgentDTO) => Promise<void>;
  onCancel: () => void;
}

const fileTypes: FileType[] = ['text', 'image', 'video', 'audio'];

const MAX_FILES_PER_TYPE = {
  text: 10,
  image: 5,
  video: 2,
  audio: 5
};

export function AgentForm({ agent, onSubmit, onCancel }: AgentFormProps) {
  const [name, setName] = useState(agent?.name || '');
  const [description, setDescription] = useState(agent?.description || '');
  const [files, setFiles] = useState<Record<FileType, AgentFile[]>>({
    text: [],
    image: [],
    video: [],
    audio: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileErrors, setFileErrors] = useState<Record<FileType, string | null>>({
    text: null,
    image: null,
    video: null,
    audio: null
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate at least one file is uploaded
    const totalFiles = Object.values(files).flat().length;
    if (totalFiles === 0) {
      setError('Please upload at least one file');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData: CreateAgentDTO | UpdateAgentDTO = {
        name,
        description,
        files: Object.values(files).flat().map(f => f.file)
      };

      if (agent?.id) {
        (formData as UpdateAgentDTO).id = agent.id;
      }

      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save agent');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFilesSelected = (type: FileType, newFiles: AgentFile[]) => {
    setFiles(prev => {
      const updatedFiles = [...prev[type], ...newFiles];
      
      // Check file limit
      if (updatedFiles.length > MAX_FILES_PER_TYPE[type]) {
        setFileErrors(prev => ({
          ...prev,
          [type]: `Maximum ${MAX_FILES_PER_TYPE[type]} ${type} files allowed`
        }));
        return prev;
      }

      setFileErrors(prev => ({
        ...prev,
        [type]: null
      }));

      return {
        ...prev,
        [type]: updatedFiles
      };
    });
  };

  const handleFileRemove = (type: FileType, index: number) => {
    setFiles(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
    
    setFileErrors(prev => ({
      ...prev,
      [type]: null
    }));
  };

  const handleFileReorder = (type: FileType, dragIndex: number, hoverIndex: number) => {
    setFiles(prev => {
      const updatedFiles = [...prev[type]];
      const draggedFile = updatedFiles[dragIndex];
      updatedFiles.splice(dragIndex, 1);
      updatedFiles.splice(hoverIndex, 0, draggedFile);
      return {
        ...prev,
        [type]: updatedFiles
      };
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 rounded-lg p-4">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-300">
          Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-300">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-6">
        <div className="text-sm font-medium text-gray-300">Training Files</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fileTypes.map(type => (
            <div key={type} className="space-y-2">
              <FileUpload
                type={type}
                onFilesSelected={(newFiles) => handleFilesSelected(type, newFiles)}
                onFileRemove={(index) => handleFileRemove(type, index)}
                onReorder={(dragIndex, hoverIndex) => handleFileReorder(type, dragIndex, hoverIndex)}
                existingFiles={files[type]}
              />
              {fileErrors[type] && (
                <div className="text-red-500 text-sm">{fileErrors[type]}</div>
              )}
              <div className="text-xs text-gray-500">
                {files[type].length} / {MAX_FILES_PER_TYPE[type]} files
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md disabled:opacity-50"
          disabled={isSubmitting || Object.values(fileErrors).some(error => error !== null)}
        >
          {isSubmitting ? 'Saving...' : agent ? 'Update Agent' : 'Create Agent'}
        </button>
      </div>
    </form>
  );
} 