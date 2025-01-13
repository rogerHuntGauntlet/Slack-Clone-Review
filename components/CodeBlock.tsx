'use client'

import React, { useState, useEffect } from 'react';
import { Pencil, Check, X, Copy } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-markdown';

interface CodeBlockProps {
  code: string;
  language: string;
  onUpdate?: (newCode: string) => void;
  isEditable?: boolean;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, onUpdate, isEditable = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState(code);

  useEffect(() => {
    if (!isEditing) {
      Prism.highlightAll();
    }
  }, [code, language, isEditing]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Code copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy code');
    }
  };

  const handleSave = () => {
    onUpdate?.(editedCode);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedCode(code);
    setIsEditing(false);
  };

  // Handle keyboard shortcuts in editor
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const value = e.currentTarget.value;
      
      // Handle multiple lines
      if (start !== end) {
        const lines = value.substring(start, end).split('\n');
        const newLines = lines.map(line => 
          e.shiftKey ? line.replace(/^\s{2}/, '') : '  ' + line
        );
        const newValue = value.substring(0, start) + newLines.join('\n') + value.substring(end);
        setEditedCode(newValue);
        return;
      }

      // Single line indentation
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      setEditedCode(newValue);
      // Set cursor position after indentation
      setTimeout(() => {
        e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 2;
      }, 0);
    }

    // Save with Ctrl/Cmd + S
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }

    // Cancel with Escape
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <div className="relative group rounded-md overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Language badge */}
      {language && (
        <div className="absolute top-2 right-2 px-2 py-1 text-xs font-mono bg-gray-200 dark:bg-gray-800 rounded">
          {language}
        </div>
      )}

      {/* Code content */}
      <div className="p-4 font-mono text-sm">
        {isEditing ? (
          <textarea
            value={editedCode}
            onChange={(e) => setEditedCode(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-full min-h-[100px] p-2 bg-transparent border dark:border-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            spellCheck="false"
          />
        ) : (
          <pre className="!m-0">
            <code className={`language-${language || 'plaintext'}`}>
              {code}
            </code>
          </pre>
        )}
      </div>

      {/* Action buttons */}
      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
        <button
          onClick={handleCopy}
          className="p-1 bg-gray-200 dark:bg-gray-800 rounded hover:bg-gray-300 dark:hover:bg-gray-700"
          title="Copy code (Click)"
        >
          <Copy size={14} />
        </button>
        {isEditable && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 bg-gray-200 dark:bg-gray-800 rounded hover:bg-gray-300 dark:hover:bg-gray-700"
            title="Edit code (Click)"
          >
            <Pencil size={14} />
          </button>
        )}
        {isEditing && (
          <>
            <button
              onClick={handleSave}
              className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
              title="Save changes (Ctrl/Cmd + S)"
            >
              <Check size={14} />
            </button>
            <button
              onClick={handleCancel}
              className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
              title="Cancel editing (Esc)"
            >
              <X size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CodeBlock; 