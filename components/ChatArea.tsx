'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from '@supabase/auth-helpers-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'react-hot-toast';
import { 
  X, 
  FileText, 
  BoldIcon, 
  ItalicIcon, 
  StrikethroughIcon, 
  CodeIcon,
  Blocks,
  ListIcon, 
  ListOrderedIcon, 
  PaperclipIcon,
  Link as LinkIcon,
  SendIcon,
  ChevronDown,
  Monitor
} from 'lucide-react';
import type { MessageType, FileAttachment } from '../types/database';
import type { ChatAreaProps } from '@/types/components';
import Message from './Message';
import ReplyModal from './ReplyModal';
import CameraModal from './media/CameraModal';
import ImageCatalogModal from './media/ImageCatalogModal';
import CodeBlock from './CodeBlock';

interface MessageWithUserProfile extends MessageType {
  user_profiles: {
    id: string;
    username: string;
    avatar_url: string;
  };
}

interface StorageBucket {
  id: string;
  name: string;
  owner: string;
  created_at: string;
  updated_at: string;
  public: boolean;
}

// Add language options
type CodeSnippets = {
  [key: string]: string;
};

type LanguageOption = {
  value: string;
  label: string;
  snippets?: CodeSnippets;
};

const CODE_LANGUAGES: LanguageOption[] = [
  { value: 'javascript', label: 'JavaScript', snippets: {
    'if': 'if (condition) {\n  \n}',
    'for': 'for (let i = 0; i < array.length; i++) {\n  \n}',
    'function': 'function name() {\n  \n}',
    'const': 'const name = ',
    'let': 'let name = ',
    'log': 'console.log();',
    'map': 'array.map(item => {\n  \n})',
    'filter': 'array.filter(item => {\n  \n})',
    'reduce': 'array.reduce((acc, item) => {\n  \n}, initial)',
    'promise': 'new Promise((resolve, reject) => {\n  \n})',
    'async': 'async function name() {\n  \n}',
    'try': 'try {\n  \n} catch (error) {\n  \n}',
    'class': 'class Name {\n  constructor() {\n    \n  }\n}',
    'import': 'import { name } from "module";',
    'export': 'export default name;'
  }},
  { value: 'typescript', label: 'TypeScript', snippets: {
    'if': 'if (condition) {\n  \n}',
    'for': 'for (let i: number = 0; i < array.length; i++) {\n  \n}',
    'function': 'function name(): void {\n  \n}',
    'interface': 'interface Name {\n  \n}',
    'type': 'type Name = ',
    'enum': 'enum Name {\n  \n}',
    'class': 'class Name {\n  constructor() {\n    \n  }\n}',
    'generic': 'function name<T>(param: T): T {\n  \n}',
    'promise': 'Promise<Type>',
    'async': 'async function name(): Promise<Type> {\n  \n}',
    'map': 'array.map((item: Type): Type => {\n  \n})',
    'import': 'import { Type } from "./types";',
    'export': 'export interface Name {\n  \n}',
    'union': 'type Union = Type1 | Type2;',
    'guard': 'function isType(value: any): value is Type {\n  \n}'
  }},
  { value: 'python', label: 'Python', snippets: {
    'if': 'if condition:\n    ',
    'for': 'for item in items:\n    ',
    'def': 'def function_name():\n    ',
    'class': 'class ClassName:\n    def __init__(self):\n        ',
    'print': 'print()',
    'import': 'from module import name',
    'try': 'try:\n    \nexcept Exception as e:\n    ',
    'with': 'with open("file.txt") as f:\n    ',
    'list': '[x for x in items]',
    'dict': '{"key": "value"}',
    'lambda': 'lambda x: x',
    'async': 'async def function_name():\n    ',
    'await': 'await coroutine',
    'decorator': '@decorator\ndef function():\n    ',
    'main': 'if __name__ == "__main__":\n    '
  }},
  { value: 'html', label: 'HTML', snippets: {
    'html': '<!DOCTYPE html>\n<html>\n  <head>\n    <title></title>\n  </head>\n  <body>\n    \n  </body>\n</html>',
    'div': '<div></div>',
    'p': '<p></p>',
    'a': '<a href=""></a>',
    'img': '<img src="" alt="" />',
    'form': '<form action="" method="">\n  \n</form>',
    'input': '<input type="text" name="" />',
    'button': '<button type="button"></button>',
    'meta': '<meta name="" content="" />',
    'link': '<link rel="stylesheet" href="" />'
  }},
  { value: 'css', label: 'CSS', snippets: {
    'flex': 'display: flex;\njustify-content: center;\nalign-items: center;',
    'grid': 'display: grid;\ngrid-template-columns: repeat(auto-fit, minmax(200px, 1fr));',
    'media': '@media (max-width: 768px) {\n  \n}',
    'anim': '@keyframes name {\n  from {\n    \n  }\n  to {\n    \n  }\n}',
    'var': ':root {\n  --name: value;\n}'
  }},
  { value: 'jsx', label: 'JSX' },
  { value: 'tsx', label: 'TSX' },
  { value: 'sql', label: 'SQL', snippets: {
    'select': 'SELECT * FROM table_name WHERE condition;',
    'insert': 'INSERT INTO table_name (column1, column2) VALUES (value1, value2);',
    'update': 'UPDATE table_name SET column = value WHERE condition;',
    'delete': 'DELETE FROM table_name WHERE condition;',
    'join': 'SELECT * FROM table1 JOIN table2 ON table1.id = table2.id;'
  }},
  { value: 'json', label: 'JSON' },
  { value: 'markdown', label: 'Markdown', snippets: {
    'h1': '# Heading',
    'h2': '## Subheading',
    'link': '[text](url)',
    'image': '![alt](url)',
    'code': '```language\n\n```',
    'table': '| Header | Header |\n|---------|----------|\n| Cell | Cell |'
  }}
];

// Add new type for code attachments
interface CodeAttachment {
  id: string;
  language: string;
  content: string;
}

interface Channel {
  id: string;
  name: string;
}

const ChatArea: React.FC<ChatAreaProps> = ({ 
  activeWorkspace,
  activeChannel,
  currentUser,
  onSwitchChannel,
  userWorkspaces,
  onThreadStateChange
}) => {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [threadMessage, setThreadMessage] = useState<MessageType | null>(null);
  const [threadMessages, setThreadMessages] = useState<MessageType[]>([]);
  const [newThreadMessage, setNewThreadMessage] = useState('');
  const [fileAttachments, setFileAttachments] = useState<FileAttachment[]>([]);
  const [threadFileAttachments, setThreadFileAttachments] = useState<FileAttachment[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<MessageType | null>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [showThreadView, setShowThreadView] = useState(false);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  // Media states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'pending'>('pending');
  const [selectedMediaType, setSelectedMediaType] = useState<'file' | 'photo' | 'camera' | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<Blob | null>(null);
  const [mediaUploadProgress, setMediaUploadProgress] = useState<number>(0);
  const supabase = createClientComponentClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadMessagesEndRef = useRef<HTMLDivElement>(null);
  const mainChatRef = useRef<HTMLDivElement>(null);
  const threadChatRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Add new state for image catalog
  const [showImageCatalog, setShowImageCatalog] = useState(false);

  // Add state for link modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);

  // Add state for code block modal
  const [showCodeBlockModal, setShowCodeBlockModal] = useState(false);
  const [codeContent, setCodeContent] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('');

  // Add state for code suggestions
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);

  // Add state for code attachments
  const [codeAttachments, setCodeAttachments] = useState<CodeAttachment[]>([]);

  // Add new state variables for recording
  const [showWebcam, setShowWebcam] = useState(false);
  const [recordingPreview, setRecordingPreview] = useState<string | null>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const webcamRef = useRef<HTMLVideoElement>(null);

  // Add new state variables after other media states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingChunks, setRecordingChunks] = useState<Blob[]>([]);

  // Scroll to bottom when messages change and shouldScrollToBottom is true
  useEffect(() => {
    if (shouldScrollToBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldScrollToBottom]);

  // Scroll to bottom when thread messages change
  useEffect(() => {
    if (threadMessagesEndRef.current) {
      threadMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [threadMessages]);

  // Check if user is near bottom when scrolling
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const div = e.currentTarget;
    const isNearBottom = div.scrollHeight - div.scrollTop - div.clientHeight < 100;
    setIsNearBottom(isNearBottom);
    setShouldScrollToBottom(isNearBottom);
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isThreadMessage: boolean = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newAttachments: FileAttachment[] = [];
    const maxSize = 5 * 1024 * 1024; // 5MB

    try {
      // Process files
      for (const file of Array.from(files)) {
        if (file.size > maxSize) {
          toast.error(`${file.name} is too large (max 5MB)`);
          continue;
        }

        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;

          const { error: uploadError, data } = await supabase.storage
            .from('chat_attachments')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: true
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            toast.error(`Failed to add ${file.name}`);
            continue;
          }

          const { data: { publicUrl } } = supabase.storage
            .from('chat_attachments')
            .getPublicUrl(fileName);

          newAttachments.push({
            file_name: file.name,
            file_type: file.type,
            file_url: publicUrl
          });

          toast.success(`Added ${file.name}`);
        } catch (error) {
          console.error('Upload error:', error);
          toast.error(`Failed to add ${file.name}`);
        }
      }

      if (newAttachments.length > 0) {
        if (isThreadMessage) {
          setThreadFileAttachments(prev => [...prev, ...newAttachments]);
        } else {
          setFileAttachments(prev => [...prev, ...newAttachments]);
        }
      }
    } catch (error) {
      console.error('Error handling file upload:', error);
      toast.error('Failed to upload files');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  console.log('ChatArea render - Current state:', {
    channelId: activeChannel,
    messageCount: messages.length,
    loading,
    currentUser,
    threadView: showThreadView
  });

  useEffect(() => {
    if (activeChannel) {
      console.log('ChatArea: Channel ID changed, setting up...', activeChannel);
      fetchMessages();

      // Set up realtime subscription
      const channel = supabase
        .channel(`messages:${activeChannel}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `channel_id=eq.${activeChannel}`
          },
          async (payload: {
            new: {
              id: string;
              channel_id: string;
              content: string;
              created_at: string;
              user_id: string;
              parent_id: string | null;
            };
          }) => {
            console.log('Realtime: New message received:', payload);
            
            // Fetch the complete message with user data
            const { data: newMessage, error } = await supabase
              .from('messages')
              .select(`
                *,
                user_profiles!user_id (
                  id,
                  username,
                  avatar_url
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (error) {
              console.error('Realtime: Error fetching new message details:', error);
              return;
            }

            if (newMessage) {
              console.log('Realtime: Adding new message to state:', newMessage);
              // Transform the new message to match the expected format
              const transformedMessage = {
                ...(newMessage as MessageWithUserProfile),
                user: newMessage.user_profiles
              };

              // If it's a reply and we're viewing that thread, add it to thread messages
              if (transformedMessage.parent_id && threadMessage?.id === transformedMessage.parent_id) {
                setThreadMessages(prev => [...prev, transformedMessage]);
              }
              // If it's a main message or we're not viewing its thread, add it to main messages
              else if (!transformedMessage.parent_id) {
                setMessages(prev => [...prev, transformedMessage]);
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `channel_id=eq.${activeChannel}`
          },
          async (payload: {
            new: {
              id: string;
              channel_id: string;
            };
          }) => {
            console.log('Realtime: Message updated:', payload);
            
            // Fetch the complete updated message
            const { data: updatedMessage, error } = await supabase
              .from('messages')
              .select(`
                *,
                user:user_profiles!user_id (
                  id,
                  username,
                  avatar_url
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (error) {
              console.error('Error fetching updated message:', error);
              return;
            }

            // Update the message in state
            setMessages(prev => prev.map(msg => 
              msg.id === payload.new.id 
                ? { ...msg, ...updatedMessage }
                : msg
            ));

            // Also update thread messages if necessary
            setThreadMessages(prev => prev.map(msg => 
              msg.id === payload.new.id 
                ? { ...msg, ...updatedMessage }
                : msg
            ));

            // Update thread message if it's the one being updated
            if (threadMessage?.id === payload.new.id) {
              setThreadMessage(prev => 
                prev ? { ...prev, ...updatedMessage } : null
              );
            }
          }
        )
        .subscribe();

      return () => {
        console.log('ChatArea: Cleaning up subscription for channel:', activeChannel);
        channel.unsubscribe();
      };
    }
  }, [activeChannel, threadMessage?.id]);

  const fetchMessages = async () => {
    if (!activeChannel) {
      console.log('fetchMessages: No channel ID provided');
      return;
    }

    try {
      setLoading(true);
      
      const query = supabase
        .from('messages')
        .select(`
          *,
          user_profiles!user_id (
            id,
            username,
            avatar_url
          )
        `)
        .eq('channel_id', activeChannel)
        .is('parent_id', null)  // Only fetch main messages, not replies
        .order('created_at', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching messages:', error);
        toast.error('Failed to load messages');
        return;
      }

      // Transform the data to match the expected format
      const transformedData = (data as MessageWithUserProfile[] || []).map(message => ({
        ...message,
        user: message.user_profiles
      }));

      console.log('Fetched messages:', transformedData);
      setMessages(transformedData);
    } catch (error) {
      console.error('Error in fetchMessages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const fetchThreadMessages = async (parentId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          user_profiles!user_id (
            id,
            username,
            avatar_url
          )
        `)
        .eq('parent_id', parentId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching thread messages:', error);
        toast.error('Failed to load thread messages');
        return;
      }

      // Transform the data to match the expected format
      const transformedData = (data as MessageWithUserProfile[] || []).map(message => ({
        ...message,
        user: message.user_profiles
      }));

      setThreadMessages(transformedData);
    } catch (error) {
      console.error('Error in fetchThreadMessages:', error);
      toast.error('Failed to load thread messages');
    }
  };

  const handleSendMessage = async (e: React.FormEvent, isThreadMessage: boolean = false) => {
    e.preventDefault();
    const content = isThreadMessage ? newThreadMessage : newMessage;
    const attachments = isThreadMessage ? threadFileAttachments : fileAttachments;

    if (!content.trim() && attachments.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          content: content.trim(),
          channel_id: activeChannel,
          user_id: currentUser.id,
          file_attachments: attachments,
          parent_id: isThreadMessage ? threadMessage?.id : null
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
        return;
      }

      console.log('Message sent:', data);
      if (isThreadMessage) {
        setNewThreadMessage('');
        setThreadFileAttachments([]);
      } else {
        setNewMessage('');
        setFileAttachments([]);
        // Reset textarea height to default
        const textarea = document.querySelector('textarea');
        if (textarea) {
          textarea.style.height = '64px';
        }
      }
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      toast.error('Failed to send message');
    }
  };

  const handleSendReply = async (content: string) => {
    if (!selectedMessage) return;
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          content,
          channel_id: activeChannel,
          user_id: currentUser.id,
          parent_id: selectedMessage.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending reply:', error);
        toast.error('Failed to send reply');
        return;
      }

      console.log('Reply sent:', data);
      setShowReplyModal(false);
      setSelectedMessage(null);
    } catch (error) {
      console.error('Error in handleSendReply:', error);
      toast.error('Failed to send reply');
    }
  };

  const handleSubmit = async (e: React.FormEvent, isThreadMessage: boolean = false) => {
    e.preventDefault();
    
    console.log('Submit triggered with:', {
      activeChannel,
      isThreadMessage,
      currentUser,
      messageContent: isThreadMessage ? newThreadMessage : newMessage,
      attachments: isThreadMessage ? threadFileAttachments : fileAttachments,
      codeAttachments
    });
    
    // Validate channel ID
    if (!activeChannel) {
      console.log('No active channel found');
      toast.error('No active channel selected');
      return;
    }
    
    const messageContent = isThreadMessage ? newThreadMessage : newMessage;
    const attachments = isThreadMessage ? threadFileAttachments : fileAttachments;
    
    if ((!messageContent.trim() && attachments.length === 0 && codeAttachments.length === 0) || isUploading) {
      console.log('No content to send or upload in progress');
      return;
    }

    try {
      // Combine message content with code blocks
      let finalContent = messageContent;
      if (codeAttachments.length > 0) {
        // Add a newline if there's existing content
        if (finalContent.trim()) {
          finalContent += '\n\n';
        }
        // Add each code block
        finalContent += codeAttachments.map(code => 
          `\`\`\`${code.language}\n${code.content}\n\`\`\``
        ).join('\n\n');
      }

      console.log('Attempting to send message with:', {
        content: finalContent,
        channel_id: activeChannel,
        user_id: currentUser.id,
        parent_id: isThreadMessage ? threadMessage?.id : null,
        file_attachments: attachments
      });

      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          content: finalContent,
          channel_id: activeChannel,
          user_id: currentUser.id,
          parent_id: isThreadMessage ? threadMessage?.id : null,
          file_attachments: attachments
        })
        .select()
        .single();

      if (messageError) {
        console.error('Error from Supabase:', messageError);
        throw messageError;
      }

      console.log('Message sent successfully:', message);

      // Clear all inputs and previews
      if (isThreadMessage) {
        setNewThreadMessage('');
        setThreadFileAttachments([]);
      } else {
        setNewMessage('');
        setFileAttachments([]);
        setCodeAttachments([]);
        setRecordingPreview(null);
        setImagePreview(null);
        setCapturedImage(null);
        setMediaUploadProgress(0);
        
        // Reset textarea height to default
        const textarea = document.querySelector('textarea');
        if (textarea) {
          textarea.style.height = '64px';
        }
      }

      // Scroll to bottom
      if (!isThreadMessage) {
        setShouldScrollToBottom(true);
      }
    } catch (error) {
      console.error('Detailed error in handleSubmit:', error);
      toast.error('Failed to send message');
    }
  };

  const handleKeyPress = async (e: React.KeyboardEvent<HTMLTextAreaElement>, isThreadMessage: boolean = false) => {
    // Handle list continuation on Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      const textarea = e.currentTarget;
      const text = textarea.value;
      const cursorPos = textarea.selectionStart;
      const currentLine = text.substring(0, cursorPos).split('\n').pop() || '';

      // Check for list patterns
      const bulletMatch = currentLine.match(/^(\s*)[•-]\s(.*)/);
      const numberMatch = currentLine.match(/^(\s*)\d+\.\s(.*)/);

      if (bulletMatch || numberMatch) {
        e.preventDefault();
        const [, indent, content] = bulletMatch || numberMatch || [];
        
        // If line is empty, end the list
        if (!content.trim()) {
          const newText = text.substring(0, cursorPos - (currentLine.length + 1)) + text.substring(cursorPos);
          if (isThreadMessage) {
            setNewThreadMessage(newText);
          } else {
            setNewMessage(newText);
          }
          return;
        }

        // Continue the list
        const nextItem = bulletMatch ? `${indent}- ` : `${indent}${(text.substring(0, cursorPos).match(/\n/g) || []).length + 1}. `;
        const newText = text.substring(0, cursorPos) + '\n' + nextItem + text.substring(cursorPos);
        if (isThreadMessage) {
          setNewThreadMessage(newText);
        } else {
          setNewMessage(newText);
        }
        return;
      }
    }

    // Handle Tab for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const text = textarea.value;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      // If text is selected, indent/outdent all selected lines
      if (start !== end) {
        const selectedText = text.substring(start, end);
        const lines = selectedText.split('\n');
        const newLines = lines.map(line => 
          e.shiftKey ? line.replace(/^\s{2}/, '') : '  ' + line
        );
        const newText = text.substring(0, start) + newLines.join('\n') + text.substring(end);
        if (isThreadMessage) {
          setNewThreadMessage(newText);
        } else {
          setNewMessage(newText);
        }
        return;
      }

      // If no text is selected, just add/remove indentation at cursor
      const newText = e.shiftKey
        ? text.substring(0, start).replace(/\s{2}$/, '') + text.substring(end)
        : text.substring(0, start) + '  ' + text.substring(end);
      if (isThreadMessage) {
        setNewThreadMessage(newText);
      } else {
        setNewMessage(newText);
      }
      return;
    }

    // Original Enter handling for sending message
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const content = isThreadMessage ? newThreadMessage : newMessage;
      const attachments = isThreadMessage ? threadFileAttachments : fileAttachments;
      if (!content.trim() && attachments.length === 0) return;
      await handleSendMessage(e as any, isThreadMessage);
    }

    // Handle formatting shortcuts
    if (e.ctrlKey || e.metaKey) {
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const text = e.currentTarget.value;
      const before = text.substring(0, start);
      const selection = text.substring(start, end);
      const after = text.substring(end);

      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          setNewMessage(`${before}**${selection}**${after}`);
          break;
        case 'i':
          e.preventDefault();
          setNewMessage(`${before}*${selection}*${after}`);
          break;
        case 'e':  // Ctrl+E for strikethrough
          e.preventDefault();
          setNewMessage(`${before}~~${selection}~~${after}`);
          break;
        case 'k':  // Ctrl+K for code
          e.preventDefault();
          setNewMessage(`${before}\`${selection}\`${after}`);
          break;
      }
    }
  };

  const handleThreadClick = async (message: MessageType) => {
    setThreadMessage(message);
    setShowThreadView(true);
    onThreadStateChange?.(true);
    await fetchThreadMessages(message.id);
  };

  const handleOpenThread = async (message: MessageType) => {
    setThreadMessage(message);
    onThreadStateChange?.(true);
    // Fetch thread messages
    const { data: threadMessages, error } = await supabase
      .from('messages')
      .select('*, user:users(*)')
      .eq('parent_id', message.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching thread messages:', error);
      return;
    }

    setThreadMessages(threadMessages || []);
  };

  const handleCloseThread = () => {
    setThreadMessage(null);
    setThreadMessages([]);
    onThreadStateChange?.(false);
  };

  const handleFormat = (before: string, after: string) => {
    const textarea = document.querySelector('textarea');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const beforeText = text.substring(0, start);
      const selection = text.substring(start, end);
      const afterText = text.substring(end);
      setNewMessage(`${beforeText}${before}${selection}${after}${afterText}`);
      textarea.focus();
    }
  };

  const handleListFormat = (format: 'bullet' | 'number') => {
    const textarea = document.querySelector('textarea');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const selection = text.substring(start, end);
      const after = text.substring(end);
      const lines = selection ? selection.split('\n') : [''];
      const formattedList = lines.map(line => {
        if (format === 'bullet') {
          return `- ${line}`;
        } else if (format === 'number') {
          return `${lines.indexOf(line) + 1}. ${line}`;
        }
      }).join('\n');
      setNewMessage(`${before}${formattedList}${after}`);
      textarea.focus();
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newAttachments: FileAttachment[] = [];
    const maxSize = 5 * 1024 * 1024; // 5MB

    try {
      for (const file of Array.from(files)) {
        // Skip image files - they should use photo upload
        if (file.type.startsWith('image/')) {
          toast.error(`Please use the photo upload button for images`);
          continue;
        }

        if (file.size > maxSize) {
          toast.error(`${file.name} is too large (max 5MB)`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;

        const { error: uploadError, data } = await supabase.storage
          .from('chat_attachments')
          .upload(`files/${fileName}`, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Failed to add ${file.name}`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('chat_attachments')
          .getPublicUrl(`files/${fileName}`);

        newAttachments.push({
          file_name: file.name,
          file_type: file.type,
          file_url: publicUrl
        });

        toast.success(`Added ${file.name}`);
      }

      if (newAttachments.length > 0) {
        setFileAttachments(prev => [...prev, ...newAttachments]);
      }
    } catch (error) {
      console.error('Error handling file upload:', error);
      toast.error('Failed to upload files');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Update handlePhotoClick to show catalog instead of file picker
  const handlePhotoClick = () => {
    setShowImageCatalog(true);
  };

  // Handle selecting an existing image
  const handleImageSelect = (imageUrl: string) => {
    setImagePreview(imageUrl);
    setFileAttachments(prev => [...prev, {
      file_name: imageUrl.split('/').pop() || 'image',
      file_type: 'image/jpeg',
      file_url: imageUrl
    }]);
    setShowImageCatalog(false);
  };

  // Handle uploading a new image from catalog
  const handleUploadNewFromCatalog = () => {
    photoInputRef.current?.click();
    setShowImageCatalog(false);
  };

  // Update handlePhotoChange to not clear preview
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setMediaUploadProgress(0);

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image file`);
          continue;
        }

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;

        const { error: uploadError, data } = await supabase.storage
          .from('chat_attachments')
          .upload(`images/${fileName}`, file, {
            cacheControl: '3600',
            upsert: true,
            contentType: file.type
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('chat_attachments')
          .getPublicUrl(`images/${fileName}`);

        setFileAttachments(prev => [...prev, {
          file_name: file.name,
          file_type: file.type,
          file_url: publicUrl
        }]);

        toast.success(`Added ${file.name}`);
      }
    } catch (error) {
      console.error('Error handling photo upload:', error);
      toast.error('Failed to upload photos');
    } finally {
      setIsUploading(false);
      setMediaUploadProgress(0);
      e.target.value = '';
    }
  };

  // Handle camera capture
  const handleCameraCapture = async (blob: Blob) => {
    if (!blob) return;

    setIsUploading(true);
    setMediaUploadProgress(0);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(blob);

      // Upload captured image
      const fileName = `camera-${Date.now()}.jpg`;

      const { error: uploadError, data } = await supabase.storage
        .from('chat_attachments')
        .upload(`images/${fileName}`, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Failed to upload captured image');
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('chat_attachments')
        .getPublicUrl(`images/${fileName}`);

      setFileAttachments(prev => [...prev, {
        file_name: fileName,
        file_type: 'image/jpeg',
        file_url: publicUrl
      }]);

      toast.success('Image captured and uploaded');
    } catch (error) {
      console.error('Error handling camera capture:', error);
      toast.error('Failed to upload captured image');
    } finally {
      setIsUploading(false);
      setMediaUploadProgress(0);
      setIsCameraActive(false);
    }
  };

  const handleTextAreaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setNewMessage(textarea.value);
    
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Calculate new height based on content
    const newHeight = Math.min(Math.max(64, textarea.scrollHeight), 250);
    textarea.style.height = `${newHeight}px`;
  };

  // Handle link insertion
  const handleLinkClick = () => {
    const textarea = document.querySelector('textarea');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selection = textarea.value.substring(start, end);
      
      setSelectionStart(start);
      setSelectionEnd(end);
      setLinkText(selection);
      setShowLinkModal(true);
    }
  };

  const handleInsertLink = () => {
    const textarea = document.querySelector('textarea');
    if (textarea) {
      const text = textarea.value;
      const beforeText = text.substring(0, selectionStart);
      const afterText = text.substring(selectionEnd);
      const linkMarkdown = `[${linkText || linkUrl}](${linkUrl})`;
      
      setNewMessage(`${beforeText}${linkMarkdown}${afterText}`);
      setShowLinkModal(false);
      setLinkUrl('');
      setLinkText('');
      textarea.focus();
    }
  };

  // Handle code block insertion
  const handleCodeBlockClick = () => {
    const textarea = document.querySelector('textarea');
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selection = textarea.value.substring(start, end);
      
      setCodeContent(selection);
      setShowCodeBlockModal(true);
    }
  };

  const handleInsertCodeBlock = () => {
    if (!codeContent.trim()) return;
    
    const newCodeBlock: CodeAttachment = {
      language: codeLanguage || 'plaintext',
      content: codeContent.trim(),
      id: Math.random().toString(36).substring(2)
    };
    
    setCodeAttachments(prev => [...prev, newCodeBlock]);
    setShowCodeBlockModal(false);
    setCodeContent('');
    setCodeLanguage('');
  };

  // Handle code autocompletion
  const handleCodeInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setCodeContent(value);

    // Get the current line
    const lines = value.split('\n');
    const currentLine = lines[lines.length - 1].trim();

    // Show suggestions if we have a language selected and current line is not empty
    if (codeLanguage && currentLine) {
      const language = CODE_LANGUAGES.find(lang => lang.value === codeLanguage);
      if (language?.snippets) {
        const matchingSnippets = Object.keys(language.snippets).filter(key =>
          key.toLowerCase().startsWith(currentLine.toLowerCase())
        );
        setSuggestions(matchingSnippets);
        setShowSuggestions(matchingSnippets.length > 0);
        setSelectedSuggestion(0);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: string) => {
    const language = CODE_LANGUAGES.find(lang => lang.value === codeLanguage);
    if (language?.snippets && suggestion in language.snippets) {
      const snippet = language.snippets[suggestion];
      const lines = codeContent.split('\n');
      lines.pop(); // Remove the current line
      setCodeContent([...lines, snippet].join('\n'));
    }
    setShowSuggestions(false);
  };

  // Handle keyboard navigation for suggestions
  const handleCodeKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestion(prev => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestion(prev => (prev - 1 + suggestions.length) % suggestions.length);
      } else if ((e.key === 'Enter' || e.key === 'Tab') && suggestions.length > 0) {
        e.preventDefault();
        handleSuggestionSelect(suggestions[selectedSuggestion]);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    }
  };

  const startScreenRecording = async () => {
    try {
      // Get screen stream
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { 
          frameRate: { ideal: 30 }
        },
        audio: true 
      });

      // Get webcam stream if enabled
      let finalStream = screenStream;
      if (showWebcam) {
        try {
          const webcamStream = await navigator.mediaDevices.getUserMedia({ 
            video: true,
            audio: false
          });
          
          // Display webcam preview
          if (webcamRef.current) {
            webcamRef.current.srcObject = webcamStream;
            webcamRef.current.play();
          }

          // Combine streams if needed
          finalStream = screenStream;
        } catch (error) {
          console.error('Error accessing webcam:', error);
          toast.error('Failed to access webcam');
        }
      }
      
      // Show preview of recording
      if (previewRef.current) {
        previewRef.current.srcObject = screenStream;
        previewRef.current.play();
      }
      
      setRecordingStream(finalStream);
      const recorder = new MediaRecorder(finalStream, {
        mimeType: 'video/webm;codecs=vp9'
      });
      
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = async () => {
        const recordingBlob = new Blob(chunks, { type: 'video/webm' });
        // Create preview URL
        const previewUrl = URL.createObjectURL(recordingBlob);
        setRecordingPreview(previewUrl);
        await handleRecordingUpload(recordingBlob);
        setRecordingChunks([]);
        setRecordingTime(0);
      };
      
      setMediaRecorder(recorder);
      recorder.start(1000);
      setIsRecording(true);
      
      // Start timer
      const startTime = Date.now();
      const timerInterval = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      
      // Clean up when recording stops
      recorder.addEventListener('stop', () => {
        clearInterval(timerInterval);
        finalStream.getTracks().forEach(track => track.stop());
        setRecordingStream(null);
        setMediaRecorder(null);
        setIsRecording(false);
        if (webcamRef.current) {
          webcamRef.current.srcObject = null;
        }
        if (previewRef.current) {
          previewRef.current.srcObject = null;
        }
      });
    } catch (error) {
      console.error('Error starting screen recording:', error);
      toast.error('Failed to start screen recording');
    }
  };

  const stopScreenRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    if (recordingStream) {
      recordingStream.getTracks().forEach(track => track.stop());
    }
  };

  const handleRecordingUpload = async (blob: Blob) => {
    setIsUploading(true);
    try {
      const fileName = `screen-recording-${Date.now()}.webm`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat_attachments')
        .upload(`recordings/${fileName}`, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'video/webm'
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('chat_attachments')
        .getPublicUrl(`recordings/${fileName}`);

      setFileAttachments(prev => [...prev, {
        file_name: fileName,
        file_type: 'video/webm',
        file_url: publicUrl
      }]);

      toast.success('Screen recording uploaded');
    } catch (error) {
      console.error('Error uploading screen recording:', error);
      toast.error('Failed to upload screen recording');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex h-full min-w-0 max-w-full">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 max-w-full">
        <div 
          className="flex-1 overflow-y-auto p-4 min-w-0" 
          ref={mainChatRef}
          onScroll={handleScroll}
        >
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          ) : (
            <div className="space-y-4 min-w-0">
              {messages.map((message) => (
                <Message
                  key={message.id}
                  message={message}
                  currentUser={currentUser}
                  onReplyClick={handleThreadClick}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="px-4 pb-4 pt-2 min-w-0">
          <form onSubmit={(e) => handleSubmit(e, false)} className="flex flex-col gap-2">
            {/* Formatting Toolbar */}
            <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-t dark:border-gray-700">
              {/* Text Formatting Section */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  onClick={() => handleFormat('**', '**')}
                  title="Bold (Ctrl+B)"
                >
                  <BoldIcon className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  onClick={() => handleFormat('*', '*')}
                  title="Italic (Ctrl+I)"
                >
                  <ItalicIcon className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  onClick={() => handleFormat('~~', '~~')}
                  title="Strikethrough (Ctrl+E)"
                >
                  <StrikethroughIcon className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  onClick={() => handleFormat('`', '`')}
                  title="Inline Code (Ctrl+K)"
                >
                  <CodeIcon className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  onClick={handleCodeBlockClick}
                  title="Code Block"
                >
                  <Blocks className="w-5 h-5" />
                </button>
              </div>

              <div className="h-6 w-px bg-gray-300 dark:bg-gray-700" />

              {/* List Formatting Section */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  onClick={() => handleListFormat('bullet')}
                  title="Bullet List"
                >
                  <ListIcon className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  onClick={() => handleListFormat('number')}
                  title="Numbered List"
                >
                  <ListOrderedIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="h-6 w-px bg-gray-300 dark:bg-gray-700" />

              {/* Link Section */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  onClick={handleLinkClick}
                  title="Insert Link"
                >
                  <LinkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="h-6 w-px bg-gray-300 dark:bg-gray-700" />

              {/* Media Upload Section */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg relative"
                  onClick={handleFileClick}
                  title="Upload Files"
                >
                  <PaperclipIcon className="w-5 h-5" />
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                    multiple
                  />
                </button>
                <button
                  type="button"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  onClick={handlePhotoClick}
                  title="Upload Photos"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg ${isCameraActive ? 'text-blue-500' : ''}`}
                  onClick={() => {
                    setIsCameraActive(prev => !prev);
                    setSelectedMediaType('camera');
                  }}
                  title="Take Picture"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg ${isRecording ? 'text-red-500 animate-pulse' : ''}`}
                  onClick={isRecording ? stopScreenRecording : startScreenRecording}
                  title={isRecording ? 'Stop Recording' : 'Record Screen'}
                >
                  <Monitor className="w-5 h-5" />
                  {isRecording && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1 rounded-full">
                      {recordingTime}s
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 border dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-colors">
              <textarea
                value={newMessage}
                onChange={handleTextAreaInput}
                onKeyDown={(e) => handleKeyPress(e, false)}
                placeholder={isUploading ? "Uploading files..." : "Message #general"}
                className="flex-1 p-2 bg-transparent focus:outline-none min-h-[64px] max-h-[250px] resize-none rounded-l overflow-y-auto"
                rows={2}
              />
              <button
                type="submit"
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 mr-1"
                disabled={isUploading || (!newMessage.trim() && fileAttachments.length === 0)}
              >
                <svg viewBox="0 0 20 20" className="w-5 h-5 rotate-90 fill-current">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11h2v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                </svg>
              </button>
            </div>

            {/* Preview Area */}
            {(fileAttachments.length > 0 || codeAttachments.length > 0 || recordingPreview || isRecording) && (
              <div className="mt-2">
                <div className="grid grid-cols-4 gap-2">
                  {/* Image/File Previews */}
                  {fileAttachments.map((file, index) => (
                    file.file_type.startsWith('image/') ? (
                      <div key={index} className="relative aspect-square">
                        <img 
                          src={file.file_url} 
                          alt={file.file_name}
                          className="w-full h-full object-cover rounded-lg border dark:border-gray-700"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setFileAttachments(prev => prev.filter((_, i) => i !== index));
                            if (fileAttachments.length === 1) {
                              setImagePreview(null);
                            }
                          }}
                          className="absolute -top-2 -right-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 shadow-sm"
                        >
                          <X size={14} />
                        </button>
                        {mediaUploadProgress > 0 && mediaUploadProgress < 100 && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                            <div className="text-white">{mediaUploadProgress}%</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div key={index} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 text-sm">
                        <span className="truncate max-w-[200px]">{file.file_name}</span>
                        <button
                          type="button"
                          onClick={() => setFileAttachments(prev => prev.filter((_, i) => i !== index))}
                          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          disabled={isUploading}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )
                  ))}

                  {/* Code Block Previews */}
                  {codeAttachments.map((codeBlock: CodeAttachment) => (
                    <div key={codeBlock.id} className="col-span-4">
                      <div className="relative">
                        <CodeBlock
                          code={codeBlock.content}
                          language={codeBlock.language}
                          isEditable={true}
                          onUpdate={(newCode) => {
                            setCodeAttachments(prev => 
                              prev.map(c => 
                                c.id === codeBlock.id 
                                  ? { ...c, content: newCode }
                                  : c
                              )
                            );
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setCodeAttachments(prev => prev.filter(c => c.id !== codeBlock.id))}
                          className="absolute -top-2 -right-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 shadow-sm"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Recording Preview */}
                  {(isRecording || recordingPreview) && (
                    <div className="col-span-4">
                      <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                        {isRecording ? (
                          <>
                            <video 
                              ref={previewRef}
                              className="w-full h-full object-contain"
                              muted
                            />
                            {showWebcam && (
                              <div className="absolute bottom-4 right-4 w-48 h-36 bg-black rounded-lg overflow-hidden border-2 border-red-500">
                                <video
                                  ref={webcamRef}
                                  className="w-full h-full object-cover"
                                  muted
                                />
                              </div>
                            )}
                            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 rounded-full px-3 py-1">
                              <span className="animate-pulse text-red-500">●</span>
                              <span className="text-white font-medium">{recordingTime}s</span>
                            </div>
                          </>
                        ) : recordingPreview && (
                          <video 
                            src={recordingPreview}
                            className="w-full h-full object-contain"
                            controls
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (isRecording) {
                              stopScreenRecording();
                            } else {
                              setRecordingPreview(null);
                              setFileAttachments(prev => prev.filter(f => f.file_type !== 'video/webm'));
                            }
                          }}
                          className="absolute top-2 right-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 shadow-sm"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Hidden Photo Input */}
            <input
              type="file"
              ref={photoInputRef}
              className="hidden"
              onChange={handlePhotoChange}
              accept="image/*"
              multiple
            />
          </form>
        </div>

        {/* Add ImageCatalogModal */}
        {showImageCatalog && (
          <ImageCatalogModal
            onSelect={handleImageSelect}
            onUploadNew={handleUploadNewFromCatalog}
            onClose={() => setShowImageCatalog(false)}
          />
        )}

        {/* Add CameraModal */}
        {isCameraActive && (
          <CameraModal
            onCapture={handleCameraCapture}
            onClose={() => {
              setIsCameraActive(false);
              setSelectedMediaType(null);
            }}
          />
        )}

        {/* Add Link Modal */}
        {showLinkModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Insert Link</h3>
                <button 
                  onClick={() => setShowLinkModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Link Text</label>
                  <input
                    type="text"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="Text to display"
                    className="w-full p-2 border dark:border-gray-700 rounded-md bg-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">URL</label>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full p-2 border dark:border-gray-700 rounded-md bg-transparent"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowLinkModal(false)}
                    className="px-4 py-2 text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInsertLink}
                    disabled={!linkUrl}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    Insert
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Code Block Modal */}
        {showCodeBlockModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl max-w-2xl w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Insert Code Block</h3>
                <button 
                  onClick={() => setShowCodeBlockModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Language</label>
                  <select
                    value={codeLanguage}
                    onChange={(e) => setCodeLanguage(e.target.value)}
                    className="w-full p-2 border dark:border-gray-700 rounded-md bg-transparent"
                  >
                    <option value="">Select a language</option>
                    {CODE_LANGUAGES.map(lang => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="relative">
                  <label className="block text-sm font-medium mb-1">Code</label>
                  <textarea
                    value={codeContent}
                    onChange={handleCodeInput}
                    onKeyDown={handleCodeKeyDown}
                    placeholder={codeLanguage ? "Start typing to see suggestions..." : "Select a language and paste your code here..."}
                    className="w-full h-64 p-2 border dark:border-gray-700 rounded-md bg-transparent font-mono text-sm"
                    spellCheck="false"
                  />
                  
                  {/* Code Suggestions Dropdown */}
                  {showSuggestions && (
                    <div className="absolute left-0 right-0 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md mt-1 shadow-lg">
                      {suggestions.map((suggestion, index) => (
                        <div
                          key={suggestion}
                          className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 font-mono text-sm ${
                            index === selectedSuggestion ? 'bg-gray-100 dark:bg-gray-700' : ''
                          }`}
                          onClick={() => handleSuggestionSelect(suggestion)}
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowCodeBlockModal(false)}
                    className="px-4 py-2 text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInsertCodeBlock}
                    disabled={!codeContent.trim()}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    Insert
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Thread View */}
      {showThreadView && threadMessage && (
        <div className="w-96 border-l dark:border-gray-700 flex flex-col h-full">
          <div className="p-4 border-b dark:border-gray-700 flex items-center gap-2">
            <h3 className="text-lg font-semibold">Thread</h3>
            <button
              onClick={() => {
                setShowThreadView(false);
                setThreadMessage(null);
                setThreadMessages([]);
                setNewThreadMessage('');
                setThreadFileAttachments([]);
                onThreadStateChange?.(false);
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              <X size={16} />
            </button>
          </div>

          <div 
            className="flex-1 overflow-y-auto p-4" 
            ref={threadChatRef}
          >
            <Message
              message={threadMessage}
              currentUser={currentUser}
              isThreadView
            />
            <div className="mt-4 space-y-4">
              {threadMessages.map((message) => (
                <Message
                  key={message.id}
                  message={message}
                  currentUser={currentUser}
                  isThreadView
                />
              ))}
              <div ref={threadMessagesEndRef} />
            </div>
          </div>

          {/* Thread Reply Input */}
          <div className="px-4 pb-4 pt-2">
            <form onSubmit={(e) => handleSubmit(e, true)} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 border dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-colors">
                <label className={`cursor-pointer p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-l ${isUploading ? 'animate-pulse' : ''}`}>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, true)}
                    disabled={isUploading}
                  />
                  <FileText 
                    size={20} 
                    className={`${threadFileAttachments.length > 0 ? 'text-blue-500' : isUploading ? 'text-yellow-500' : 'text-gray-400'}`} 
                  />
                </label>
                <textarea
                  value={newThreadMessage}
                  onChange={(e) => setNewThreadMessage(e.target.value)}
                  onKeyDown={(e) => handleKeyPress(e, true)}
                  placeholder={isUploading ? "Uploading files..." : "Reply in thread..."}
                  className="flex-1 p-2 bg-transparent focus:outline-none min-h-[44px] max-h-[200px] resize-none"
                  rows={1}
                />
                <button
                  type="submit"
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 mr-1"
                  disabled={isUploading || (!newThreadMessage.trim() && threadFileAttachments.length === 0)}
                >
                  <svg viewBox="0 0 20 20" className="w-5 h-5 rotate-90 fill-current">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11h2v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                  </svg>
                </button>
              </div>
              {threadFileAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {threadFileAttachments.map((file, index) => (
                    <div key={index} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 text-sm">
                      <span className="truncate max-w-[200px]">{file.file_name}</span>
                      <button
                        type="button"
                        onClick={() => setThreadFileAttachments(prev => prev.filter((_, i) => i !== index))}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        disabled={isUploading}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatArea;
