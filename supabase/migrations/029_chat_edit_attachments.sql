-- Message edit, attachments, and chat file storage

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT,
  ADD COLUMN IF NOT EXISTS attachment_mime TEXT;

ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_body_check;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_body_check CHECK (
  deleted_at IS NOT NULL
  OR attachment_url IS NOT NULL
  OR char_length(trim(body)) > 0
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  true,
  10485760,
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Chat attachments public read" ON storage.objects;
CREATE POLICY "Chat attachments public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS "Employees upload chat attachments" ON storage.objects;
CREATE POLICY "Employees upload chat attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Employees update chat attachments" ON storage.objects;
CREATE POLICY "Employees update chat attachments"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Employees delete chat attachments" ON storage.objects;
CREATE POLICY "Employees delete chat attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
