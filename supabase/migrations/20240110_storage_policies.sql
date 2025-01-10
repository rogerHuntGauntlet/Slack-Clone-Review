-- Enable RLS for storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for chat_attachments bucket
CREATE POLICY "Allow public read access for chat_attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat_attachments');

CREATE POLICY "Allow authenticated users to upload to chat_attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'chat_attachments'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Allow users to update their own objects in chat_attachments" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'chat_attachments'
    AND auth.uid() = owner
  );

CREATE POLICY "Allow users to delete their own objects in chat_attachments" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'chat_attachments'
    AND auth.uid() = owner
  ); 