'use client';

import { Fragment, useState, useCallback, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Agent, FileType, CreateAgentDTO, CreationProgress, TagSuggestion } from '../types/agent-types';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { FileUpload } from './FileUpload';
import { generateTagsFromDescription } from '../services/tag-service';

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent?: Agent;
  onSubmit: (data: CreateAgentDTO) => Promise<void>;
  isCreatingFromTemplate?: boolean;
  preloadedFiles?: File[];
}

function FileContentPreview({ file }: { file: File }) {
  const [content, setContent] = useState<string>('Loading...');

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setContent(e.target?.result as string || 'Failed to load content');
    };
    reader.onerror = () => {
      setContent('Failed to load content');
    };
    reader.readAsText(file);
  }, [file]);

  return <>{content}</>;
}

const fileTypes: FileType[] = ['text', 'image', 'video', 'audio'];

export function AgentModal({ 
  isOpen, 
  onClose, 
  agent, 
  onSubmit,
  isCreatingFromTemplate,
  preloadedFiles = []
}: AgentModalProps) {
  const [name, setName] = useState(agent?.name || '');
  const [description, setDescription] = useState(agent?.description || '');
  const [selectedFiles, setSelectedFiles] = useState<Record<FileType, File[]>>({
    text: [],
    image: [],
    video: [],
    audio: []
  });
  const [selectedFileType, setSelectedFileType] = useState<FileType | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tags, setTags] = useState<string[]>(agent?.tags || []);
  const [suggestedTags, setSuggestedTags] = useState<TagSuggestion[]>([]);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [progress, setProgress] = useState<CreationProgress | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      console.log('Modal closed, resetting state');
      setName(agent?.name || '');
      setDescription(agent?.description || '');
      setSelectedFiles({
        text: [],
        image: [],
        video: [],
        audio: []
      });
      setSelectedFileType(null);
      setSelectedFile(null);
      setTags(agent?.tags || []);
      setSuggestedTags([]);
      setProgress(null);
      setIsSubmitting(false);
    } else {
      console.log('Modal opened', {
        isEditing: !!agent,
        hasPreloadedFiles: preloadedFiles && preloadedFiles.length > 0,
        preloadedFiles: preloadedFiles?.map(f => ({ name: f.name, type: f.type, size: f.size }))
      });

      // Initialize files when modal opens
      const initialFiles: Record<FileType, File[]> = {
        text: [],
        image: [],
        video: [],
        audio: []
      };

      // First, add any preloaded files (these come from the chat)
      if (preloadedFiles && preloadedFiles.length > 0) {
        console.log('Processing preloaded files from chat...');
        preloadedFiles.forEach(async file => {
          console.log('Processing preloaded file:', { name: file.name, type: file.type, size: file.size });
          if (file.type === 'text/plain') {
            // Read the file content
            const content = await file.text();
            const blob = new Blob([content], { type: 'text/plain' });
            const fileWithContent = new File([blob], file.name, {
              type: 'text/plain',
              lastModified: new Date().getTime()
            });
            initialFiles.text.push(fileWithContent);
          }
        });
      }

      // Then, if we're editing, add any existing training files
      if (agent?.trainingFiles) {
        console.log('Processing existing training files:', agent.trainingFiles);
        agent.trainingFiles.forEach(async file => {
          console.log('Processing training file:', file);
          // For text files, we need to create a proper blob with content
          if (file.type === 'text') {
            try {
              // Fetch the file content from the URL
              const response = await fetch(file.url);
              const content = await response.text();
              
              const blob = new Blob([content], { type: 'text/plain' });
              const fileObj = new File([blob], file.name, {
                type: 'text/plain',
                lastModified: new Date().getTime()
              });
              initialFiles.text.push(fileObj);
            } catch (error) {
              console.error('Failed to fetch file content:', error);
              // Create an empty file as fallback
              const blob = new Blob([''], { type: 'text/plain' });
              const fileObj = new File([blob], file.name, {
                type: 'text/plain',
                lastModified: new Date().getTime()
              });
              initialFiles.text.push(fileObj);
            }
          } else {
            // For other types, create with empty content for now
            const blob = new Blob([''], { type: `${file.type}/${file.type}` });
            const fileObj = new File([blob], file.name, {
              type: `${file.type}/${file.type}`,
              lastModified: new Date().getTime()
            });
            const fileType = file.type as FileType;
            if (fileType in initialFiles) {
              initialFiles[fileType].push(fileObj);
            }
          }
        });
      }

      console.log('Setting initial files:', {
        textFiles: initialFiles.text.map(f => ({ name: f.name, type: f.type, size: f.size })),
        imageFiles: initialFiles.image.length,
        videoFiles: initialFiles.video.length,
        audioFiles: initialFiles.audio.length
      });
      setSelectedFiles(initialFiles);
    }
  }, [isOpen, agent, preloadedFiles]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (description.trim().length > 20) {
        setIsGeneratingTags(true);
        try {
          const suggestions = await generateTagsFromDescription(description);
          setSuggestedTags(suggestions);
        } catch (error) {
          console.error('Failed to generate tags:', error);
        } finally {
          setIsGeneratingTags(false);
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [description]);

  const handleAddTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      console.log('Submitting form with files:', selectedFiles);
      const allFiles = Object.values(selectedFiles).flat();
      console.log('All files to submit:', allFiles.map(f => ({ name: f.name, type: f.type, size: f.size })));
      
      await onSubmit({
        name,
        description,
        files: allFiles,
        tags,
        onProgress: (progress) => {
          setProgress(progress);
          if (progress.error) {
            setIsSubmitting(false);
          }
          if (progress.step === 'complete') {
            setIsSubmitting(false);
            onClose();
          }
        }
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      setIsSubmitting(false);
    }
  };

  const handleFilesSelected = (type: FileType, files: File[]) => {
    setSelectedFiles(prev => ({
      ...prev,
      [type]: [...prev[type], ...files]
    }));
  };

  const handleFileRemove = (type: FileType, index: number) => {
    setSelectedFiles(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const handleFileSelect = (type: FileType, file: File) => {
    setSelectedFileType(type);
    setSelectedFile(file);
  };

  const handleClearForm = () => {
    setName('');
    setDescription('');
    setSelectedFiles({
      text: [],
      image: [],
      video: [],
      audio: []
    });
    setSelectedFileType(null);
    setSelectedFile(null);
    setTags([]);
    setSuggestedTags([]);
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform rounded-lg bg-gray-800 text-left shadow-xl transition-all sm:my-8 w-full max-w-7xl h-[80vh]">
                <div className="h-full flex divide-x divide-gray-700">
                  {/* Metadata Column */}
                  <div className="w-1/3 h-full flex flex-col">
                    <div className="flex-1 overflow-y-auto p-6">
                      <Dialog.Title as="h3" className="text-xl font-semibold leading-6 text-white mb-6 flex items-center gap-2">
                        {isCreatingFromTemplate && <SparklesIcon className="h-6 w-6 text-indigo-400" />}
                        {isCreatingFromTemplate ? 'Create from Template' : agent ? 'Edit Agent' : 'Create Agent'}
                      </Dialog.Title>

                      <div className="space-y-6">
                        {/* Name Field */}
                        <div className="bg-gray-900 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                              Name
                            </label>
                            <span className="text-xs text-gray-500">Required</span>
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              id="name"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="block w-full rounded-md border-0 bg-gray-800 py-2 pl-3 pr-10 text-white placeholder-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                              placeholder="e.g. Customer Support Agent"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                              <span className="text-gray-400 text-xs">{name.length}/50</span>
                            </div>
                          </div>
                          <p className="mt-1.5 text-xs text-gray-500">
                            Choose a descriptive name for your agent
                          </p>
                        </div>

                        {/* Description Field */}
                        <div className="bg-gray-900 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <label htmlFor="description" className="block text-sm font-medium text-gray-300">
                              Description
                            </label>
                            <span className="text-xs text-gray-500">Optional</span>
                          </div>
                          <div className="relative">
                            <textarea
                              id="description"
                              value={description}
                              onChange={(e) => setDescription(e.target.value)}
                              rows={4}
                              className="block w-full rounded-md border-0 bg-gray-800 py-2 pl-3 pr-10 text-white placeholder-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                              placeholder="e.g. This agent helps customers with common support questions..."
                            />
                            <div className="absolute top-2 right-0 flex items-center pr-3">
                              <span className="text-gray-400 text-xs">{description.length}/500</span>
                            </div>
                          </div>
                          <p className="mt-1.5 text-xs text-gray-500">
                            Describe what this agent does and how it should be used
                          </p>
                        </div>

                        {/* Tags Section */}
                        <div className="bg-gray-900 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-300">
                              Tags
                            </label>
                            {isGeneratingTags && (
                              <span className="text-xs text-gray-500 flex items-center gap-2">
                                <div className="w-3 h-3 border-t-2 border-gray-500 rounded-full animate-spin" />
                                Generating suggestions...
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mb-3">
                            {tags.map(tag => (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-400"
                              >
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTag(tag)}
                                  className="text-indigo-400 hover:text-indigo-300"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>

                          {suggestedTags.length > 0 && (
                            <div>
                              <div className="text-xs text-gray-500 mb-2">Suggested tags:</div>
                              <div className="flex flex-wrap gap-2">
                                {suggestedTags
                                  .filter(suggestion => !tags.includes(suggestion.tag))
                                  .map(suggestion => (
                                    <button
                                      key={suggestion.tag}
                                      type="button"
                                      onClick={() => handleAddTag(suggestion.tag)}
                                      className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-gray-800 text-gray-400 hover:bg-gray-700"
                                    >
                                      + {suggestion.tag}
                                    </button>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* File Upload Grid Column */}
                  <div className="w-1/3 h-full flex flex-col">
                    <div className="p-6">
                      <h4 className="text-lg font-medium text-white mb-6">Training Files</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {fileTypes.map(type => (
                          <div key={type} className="col-span-1">
                            <FileUpload
                              type={type}
                              existingFiles={selectedFiles[type].map(file => ({ file, type, progress: 0 }))}
                              onFilesSelected={(files) => handleFilesSelected(type, files.map(f => f.file))}
                              onFileRemove={(index) => handleFileRemove(type, index)}
                              onReorder={() => {}}
                              onFileSelect={(file) => handleFileSelect(type, file.file)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Preview Column */}
                  <div className="w-1/3 h-full flex flex-col bg-gray-800/50 overflow-hidden">
                    <div className="p-6 h-full flex flex-col overflow-hidden">
                      <h4 className="text-lg font-medium text-white mb-6">Preview</h4>
                      {selectedFile ? (
                        <div className="rounded-lg border border-gray-700 p-4 flex-1 flex flex-col min-h-0">
                          <div className="flex items-center gap-4 mb-4 text-sm flex-shrink-0">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">File:</span>
                              <span className="text-white">{selectedFile.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">Type:</span>
                              <span className="text-white">{selectedFileType}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">Size:</span>
                              <span className="text-white">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                            </div>
                          </div>

                          <div className="flex-1 overflow-hidden rounded-lg bg-gray-900 min-h-0">
                            {selectedFile.type.startsWith('text/') ? (
                              <div className="h-full overflow-y-auto p-4">
                                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                                  {selectedFile instanceof File && (
                                    <FileContentPreview file={selectedFile} />
                                  )}
                                </pre>
                              </div>
                            ) : selectedFile.type.startsWith('image/') ? (
                              <div className="h-full overflow-auto p-2">
                                <img
                                  src={URL.createObjectURL(selectedFile)}
                                  alt={selectedFile.name}
                                  className="max-w-full object-contain"
                                />
                              </div>
                            ) : selectedFile.type.startsWith('video/') ? (
                              <div className="h-full overflow-auto p-2">
                                <video
                                  src={URL.createObjectURL(selectedFile)}
                                  controls
                                  className="max-w-full"
                                >
                                  Your browser does not support the video tag.
                                </video>
                              </div>
                            ) : selectedFile.type.startsWith('audio/') ? (
                              <div className="h-full flex items-center justify-center p-4">
                                <audio
                                  src={URL.createObjectURL(selectedFile)}
                                  controls
                                  className="w-full"
                                >
                                  Your browser does not support the audio tag.
                                </audio>
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center p-4 text-gray-400">
                                Preview not available for this file type
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-400">
                          Select a file to preview
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 bg-gray-800/50 px-6 py-4">
                  {/* Add status messages */}
                  {progress && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        {progress.error ? (
                          <div className="text-red-500 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Error: {progress.error}
                          </div>
                        ) : (
                          <>
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-gray-300">
                              {progress.step === 'database' && (
                                <>
                                  {progress.subStep === 'Creating agent in database...' ? 'Creating agent...' : 'Setting up agent profile...'}
                                </>
                              )}
                              {progress.step === 'files' && (
                                <div className="flex flex-col gap-1">
                                  <span>{progress.subStep}</span>
                                  {progress.currentFile && progress.totalFiles && (
                                    <span className="text-xs text-gray-400">
                                      File {progress.currentFile} of {progress.totalFiles}
                                    </span>
                                  )}
                                  {progress.currentChunk && progress.totalChunks && (
                                    <span className="text-xs text-gray-400">
                                      Processing chunk {progress.currentChunk} of {progress.totalChunks}
                                    </span>
                                  )}
                                </div>
                              )}
                              {progress.step === 'tags' && 'Adding tags...'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md bg-gray-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600"
                      onClick={onClose}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span className="ml-2">{agent ? 'Updating...' : 'Creating...'}</span>
                        </>
                      ) : (
                        agent ? 'Update Agent' : 'Create Agent'
                      )}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 