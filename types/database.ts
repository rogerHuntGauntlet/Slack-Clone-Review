export interface MessageType {
  id: string;
  content: string;
  user_id: string;
  channel_id: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  file_attachments: FileAttachment[] | null;
  user?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  replies?: MessageType[];
  reply_count?: number;
  reactions?: { [emoji: string]: string[] };
}

export interface DirectMessageType {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  file_attachments: FileAttachment[] | null;
  sender?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  receiver?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  replies?: DirectMessageType[];
}

export interface FileAttachment {
  file_name: string;
  file_type: string;
  file_url: string;
}

export interface ReactionUpdate {
  messageId: string;
  emoji: string;
  userId: string;
} 