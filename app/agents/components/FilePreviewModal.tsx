'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { FileType, AgentMetadata, TagSuggestion as TagSuggestionType } from '../types/agent-types';
import { X, ChevronLeft, ChevronRight, Copy, Check, Download, ZoomIn, ZoomOut, RotateCw, Music, FileText, Plus } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion, AnimatePresence } from 'framer-motion';
import { useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';

interface FilePreviewModalProps {
  file: File;
  type: FileType;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  url: string;
  previewType?: 'json' | 'markdown' | 'csv' | 'pdf' | 'text';
  files?: { file: File; url: string; previewType?: string }[];
  currentIndex?: number;
  onSelect?: (index: number) => void;
  onReorder?: (dragIndex: number, hoverIndex: number) => void;
  metadata?: AgentMetadata;
  onMetadataChange?: (metadata: AgentMetadata) => void;
  onTagSelect?: (tag: string) => void;
  suggestedTags?: TagSuggestionType[];
}

interface DraggableFileItemProps {
  file: { file: File; url: string; previewType?: string };
  index: number;
  type: FileType;
  isActive: boolean;
  onSelect: () => void;
  onReorder: (dragIndex: number, hoverIndex: number) => void;
}

function DraggableFileItem({ file, index, type, isActive, onSelect, onReorder }: DraggableFileItemProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [{ isDragging }, drag] = useDrag({
    type: 'SIDEBAR_FILE',
    item: { index },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'SIDEBAR_FILE',
    hover(item: { index: number }) {
      if (item.index !== index) {
        onReorder(item.index, index);
        item.index = index;
      }
    },
  });

  drag(drop(ref));

  return (
    <motion.button
      ref={ref}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      onClick={onSelect}
      className={`w-full p-4 text-left hover:bg-gray-800 transition-colors
        ${isActive ? 'bg-gray-800' : ''}
        ${isDragging ? 'opacity-50' : ''}`}
      style={{ cursor: 'move' }}
    >
      <div className="flex items-center space-x-3">
        {type === 'image' && (
          <img
            src={file.url}
            alt={file.file.name}
            className="h-10 w-10 object-cover rounded"
          />
        )}
        {type === 'video' && (
          <video
            src={file.url}
            className="h-10 w-10 object-cover rounded"
          />
        )}
        {(type === 'audio' || type === 'text') && (
          <div className="h-10 w-10 rounded bg-gray-700 flex items-center justify-center">
            {type === 'audio' ? (
              <Music className="h-5 w-5 text-gray-400" />
            ) : (
              <FileText className="h-5 w-5 text-gray-400" />
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white truncate">{file.file.name}</div>
          <div className="text-xs text-gray-400">
            {(file.file.size / 1024).toFixed(1)} KB
          </div>
        </div>
      </div>
    </motion.button>
  );
}

const CODE_FILE_EXTENSIONS = {
  js: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  tsx: 'tsx',
  py: 'python',
  rb: 'ruby',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  cs: 'csharp',
  go: 'go',
  rs: 'rust',
  php: 'php',
  html: 'html',
  css: 'css',
  scss: 'scss',
  sql: 'sql',
  yaml: 'yaml',
  yml: 'yaml',
  sh: 'bash',
  bash: 'bash',
  json: 'json',
  md: 'markdown',
  xml: 'xml',
  dockerfile: 'dockerfile',
};

const getLanguageFromFilename = (filename: string): string | null => {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (!extension) return null;
  return CODE_FILE_EXTENSIONS[extension as keyof typeof CODE_FILE_EXTENSIONS] || null;
};

function TagSuggestion({ tag, confidence, matchingAgents, source, onSelect }: TagSuggestionType & { onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="group relative flex items-center space-x-2 w-full p-2 rounded-lg hover:bg-gray-800 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-white truncate">{tag}</span>
          {matchingAgents !== undefined && (
            <span className="text-xs text-gray-400">({matchingAgents} agents)</span>
          )}
        </div>
        <div className="w-full bg-gray-800 h-1 rounded-full mt-1">
          <div 
            className={`h-full rounded-full ${
              source === 'llm' ? 'bg-blue-500' : 'bg-green-500'
            }`}
            style={{ width: `${confidence * 100}%` }}
          />
        </div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <Plus className="h-4 w-4 text-gray-400" />
      </div>
    </button>
  );
}

export function FilePreviewModal({ 
  file, 
  type, 
  onClose, 
  onNext, 
  onPrevious, 
  url,
  previewType = 'text',
  files = [],
  currentIndex = 0,
  onSelect,
  onReorder,
  metadata = { name: '', description: '', tags: [] },
  onMetadataChange,
  onTagSelect,
  suggestedTags = []
}: FilePreviewModalProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupByType, setGroupByType] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [localMetadata, setLocalMetadata] = useState(metadata);

  // Update local metadata when prop changes
  useEffect(() => {
    setLocalMetadata(metadata);
  }, [metadata]);

  const handleMetadataChange = (changes: Partial<AgentMetadata>) => {
    const updated = { ...localMetadata, ...changes };
    setLocalMetadata(updated);
    onMetadataChange?.(updated);
  };

  const handleTagRemove = (tagToRemove: string) => {
    handleMetadataChange({
      tags: localMetadata.tags.filter(tag => tag !== tagToRemove)
    });
  };

  // Group tags by source
  const groupedTags = useMemo(() => {
    return suggestedTags.reduce((acc, tag: TagSuggestionType) => {
      acc[tag.source] = acc[tag.source] || [];
      acc[tag.source].push(tag);
      return acc;
    }, {} as Record<'llm' | 'database', TagSuggestionType[]>);
  }, [suggestedTags]);

  // Filter and group files
  const filteredFiles = useMemo(() => {
    return files.filter(f => 
      f.file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [files, searchQuery]);

  const groupedFiles = useMemo(() => {
    if (!groupByType) return { all: filteredFiles };

    return filteredFiles.reduce((acc, file) => {
      const extension = file.file.name.split('.').pop()?.toLowerCase() || 'unknown';
      const language = getLanguageFromFilename(file.file.name);
      
      let group = 'other';
      if (language) {
        group = 'code';
      } else if (extension.match(/^(jpg|jpeg|png|gif|webp|svg)$/)) {
        group = 'image';
      } else if (extension.match(/^(mp4|webm|mov)$/)) {
        group = 'video';
      } else if (extension.match(/^(mp3|wav|ogg|m4a)$/)) {
        group = 'audio';
      } else if (extension.match(/^(txt|md|pdf|csv|json)$/)) {
        group = 'document';
      }

      acc[group] = acc[group] || [];
      acc[group].push(file);
      return acc;
    }, {} as Record<string, typeof files>);
  }, [filteredFiles, groupByType]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && onPrevious) onPrevious();
      if (e.key === 'ArrowRight' && onNext) onNext();
      
      // New shortcuts
      if (e.key === '+' || (e.key === '=' && e.ctrlKey)) {
        e.preventDefault();
        setZoom(z => Math.min(z + 0.25, 3));
      }
      if (e.key === '-' && e.ctrlKey) {
        e.preventDefault();
        setZoom(z => Math.max(z - 0.25, 0.25));
      }
      if (e.key === '0' && e.ctrlKey) {
        e.preventDefault();
        setZoom(1);
      }
      if (e.key === 'r' && e.ctrlKey) {
        e.preventDefault();
        setRotation(r => (r + 90) % 360);
      }
      if (e.key === 'd' && e.ctrlKey) {
        e.preventDefault();
        handleDownload();
      }
      if (e.key === 'c' && e.ctrlKey && type === 'text') {
        e.preventDefault();
        handleCopy();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrevious, type]);

  // Load text file content
  useEffect(() => {
    if (type === 'text') {
      const reader = new FileReader();
      reader.onload = (e) => {
        setTextContent(e.target?.result as string);
      };
      reader.readAsText(file);
    }
  }, [file, type]);

  const handleCopy = async () => {
    if (textContent) {
      await navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderTextContent = () => {
    if (!textContent) return <div className="text-gray-300 animate-pulse">Loading content...</div>;

    // Detect if it's a code file
    const language = getLanguageFromFilename(file.name);
    if (language) {
      return (
        <SyntaxHighlighter 
          language={language} 
          style={oneDark}
          showLineNumbers
          wrapLines
          customStyle={{
            margin: 0,
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
          }}
        >
          {textContent}
        </SyntaxHighlighter>
      );
    }

    switch (previewType) {
      case 'json':
        try {
          const formatted = JSON.stringify(JSON.parse(textContent), null, 2);
          return (
            <SyntaxHighlighter 
              language="json" 
              style={oneDark}
              showLineNumbers
              wrapLines
              customStyle={{
                margin: 0,
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
              }}
            >
              {formatted}
            </SyntaxHighlighter>
          );
        } catch {
          return <pre className="text-red-400">Invalid JSON content</pre>;
        }
      case 'markdown':
        return (
          <SyntaxHighlighter 
            language="markdown" 
            style={oneDark}
            customStyle={{
              margin: 0,
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
            }}
          >
            {textContent}
          </SyntaxHighlighter>
        );
      case 'csv':
        const rows = textContent.split('\n').filter(row => row.trim());
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  {rows[0]?.split(',').map((header, i) => (
                    <th 
                      key={i} 
                      className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider bg-gray-800"
                    >
                      {header.trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {rows.slice(1).map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}>
                    {row.split(',').map((cell, j) => (
                      <td key={j} className="px-4 py-2 whitespace-nowrap text-sm text-gray-300">
                        {cell.trim()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      default:
        return (
          <pre className="text-gray-300 font-mono text-sm whitespace-pre-wrap p-4">
            {textContent}
          </pre>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />

      <div className="relative h-full flex">
        {/* Left Column - Metadata and Tags */}
        <div className="w-1/3 h-full bg-gray-900 border-r border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">Agent Details</h3>
            <button
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white rounded-lg hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Name and Description */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={localMetadata.name}
                    onChange={(e) => handleMetadataChange({ name: e.target.value })}
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="text-white">{localMetadata.name || 'Untitled Agent'}</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                {isEditing ? (
                  <textarea
                    value={localMetadata.description}
                    onChange={(e) => handleMetadataChange({ description: e.target.value })}
                    rows={3}
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="text-white whitespace-pre-wrap">{localMetadata.description || 'No description'}</div>
                )}
              </div>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                {isEditing ? 'Save' : 'Edit'}
              </button>
            </div>

            {/* Current Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Tags</label>
              <div className="flex flex-wrap gap-2">
                {localMetadata.tags.map((tag: string) => (
                  <div
                    key={tag}
                    className="flex items-center space-x-1 bg-gray-800 text-white text-sm px-2 py-1 rounded-full"
                  >
                    <span>{tag}</span>
                    <button
                      onClick={() => handleTagRemove(tag)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Tag Suggestions */}
            {(groupedTags.llm?.length > 0 || groupedTags.database?.length > 0) && (
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-400">Suggested Tags</h4>

                {groupedTags.llm?.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs text-gray-500">AI Suggestions</h5>
                    <div className="space-y-1">
                      {groupedTags.llm.map(tag => (
                        <TagSuggestion
                          key={tag.tag}
                          {...tag}
                          onSelect={() => onTagSelect?.(tag.tag)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {groupedTags.database?.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs text-gray-500">From Other Agents</h5>
                    <div className="space-y-1">
                      {groupedTags.database.map(tag => (
                        <TagSuggestion
                          key={tag.tag}
                          {...tag}
                          onSelect={() => onTagSelect?.(tag.tag)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - File Preview and List */}
        <div className="flex-1 h-full flex flex-col">
          {/* Toolbar */}
          <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
                className="p-2 text-white/70 hover:text-white rounded-lg hover:bg-gray-800"
                title="Zoom In (Ctrl +)"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <button
                onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))}
                className="p-2 text-white/70 hover:text-white rounded-lg hover:bg-gray-800"
                title="Zoom Out (Ctrl -)"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <button
                onClick={() => setRotation(r => (r + 90) % 360)}
                className="p-2 text-white/70 hover:text-white rounded-lg hover:bg-gray-800"
                title="Rotate (Ctrl R)"
              >
                <RotateCw className="h-5 w-5" />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 text-white/70 hover:text-white rounded-lg hover:bg-gray-800"
                title="Download (Ctrl D)"
              >
                <Download className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-400">
                {files.length > 0 && `${currentIndex + 1} of ${files.length}`}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex">
            {/* File List Sidebar */}
            {files.length > 0 && (
              <div className="w-80 h-full bg-gray-900 border-r border-gray-800 flex flex-col">
                <div className="p-4 border-b border-gray-800">
                  <h3 className="text-lg font-medium text-white">Files</h3>
                  
                  {/* Search Input */}
                  <div className="mt-4 relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search files..."
                      className="w-full bg-gray-800 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Group Toggle */}
                  <button
                    onClick={() => setGroupByType(prev => !prev)}
                    className="mt-2 text-sm text-gray-400 hover:text-white flex items-center space-x-2"
                  >
                    <span>{groupByType ? 'Grouped by type' : 'All files'}</span>
                  </button>
                </div>

                {/* File List */}
                <DndProvider backend={HTML5Backend}>
                  <div className="flex-1 overflow-y-auto">
                    <AnimatePresence>
                      {Object.entries(groupedFiles).map(([group, groupFiles]) => (
                        <motion.div
                          key={group}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          {groupByType && (
                            <div className="px-4 py-2 text-xs font-medium text-gray-400 uppercase bg-gray-800/50">
                              {group}
                            </div>
                          )}
                          <div className="divide-y divide-gray-800">
                            {groupFiles.map((f, groupIndex) => {
                              const fileIndex = files.findIndex(file => file.file.name === f.file.name);
                              return (
                                <DraggableFileItem
                                  key={f.file.name}
                                  file={f}
                                  index={fileIndex}
                                  type={type}
                                  isActive={fileIndex === currentIndex}
                                  onSelect={() => onSelect?.(fileIndex)}
                                  onReorder={onReorder || (() => {})}
                                />
                              );
                            })}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </DndProvider>
              </div>
            )}

            {/* Preview Area */}
            <div className="flex-1 overflow-hidden p-4">
              <div className="relative h-full flex items-center justify-center">
                {/* Navigation Buttons */}
                {onPrevious && (
                  <button
                    onClick={onPrevious}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white bg-black/50 rounded-full"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                )}
                {onNext && (
                  <button
                    onClick={onNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white bg-black/50 rounded-full"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                )}

                {/* Preview Content */}
                <div className="relative max-w-full max-h-full">
                  {type === 'image' && (
                    <img
                      src={url}
                      alt={file.name}
                      className="max-h-[calc(100vh-8rem)] w-auto object-contain transition-transform duration-200"
                      style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`
                      }}
                    />
                  )}
                  {type === 'video' && (
                    <video
                      src={url}
                      controls
                      className="max-h-[calc(100vh-8rem)] w-auto"
                      autoPlay
                    />
                  )}
                  {type === 'audio' && (
                    <div className="bg-gray-900 p-8 rounded-lg">
                      <div className="text-white mb-4">{file.name}</div>
                      <audio src={url} controls className="w-[400px]" autoPlay />
                    </div>
                  )}
                  {type === 'text' && (
                    <div className="bg-gray-900 rounded-lg max-w-4xl w-full">
                      <div className="flex items-center justify-between p-4 border-b border-gray-800">
                        <span className="text-white">{file.name}</span>
                        <button
                          onClick={handleCopy}
                          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
                          title="Copy (Ctrl C)"
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          <span>{copied ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="p-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
                        {renderTextContent()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="p-4 bg-gray-900 border-t border-gray-800">
            <div className="flex flex-wrap justify-center gap-4 text-white/50 text-sm">
              <span>ESC to close</span>
              {onPrevious && <span>← Previous</span>}
              {onNext && <span>→ Next</span>}
              <span>Ctrl + / - to zoom</span>
              <span>Ctrl + R to rotate</span>
              <span>Ctrl + D to download</span>
              {type === 'text' && <span>Ctrl + C to copy</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 