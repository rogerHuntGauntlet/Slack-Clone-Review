export interface MessageType {
  id: string;
  content: string;
  created_at: string | null;
  user_id: string;
  channel: string | null;
  parent_id?: string | null;
  receiver_id?: string | null;
  is_direct_message?: boolean | null;
  updated_at?: string | null;
  has_attachment?: boolean | null;
  file_url?: string | null;
  reactions?: { [key: string]: string[] };
  user?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  replies?: MessageType[];
  file_attachments?: {
    id: string;
    file_name: string;
    file_type: string;
    file_url: string;
  }[];
}

export interface MessageWithRelations extends MessageType {} 