-- Realtime filter support + soft-delete for chat messages

ALTER TABLE employee_notifications REPLICA IDENTITY FULL;
ALTER TABLE chat_messages REPLICA IDENTITY FULL;
ALTER TABLE chat_conversation_members REPLICA IDENTITY FULL;

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_active
  ON chat_messages(conversation_id, created_at DESC)
  WHERE deleted_at IS NULL;

DROP POLICY IF EXISTS "Members soft delete own messages" ON chat_messages;
CREATE POLICY "Members soft delete own messages"
  ON chat_messages FOR UPDATE
  USING (
    sender_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chat_conversation_members m
      WHERE m.conversation_id = chat_messages.conversation_id
        AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    sender_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chat_conversation_members m
      WHERE m.conversation_id = chat_messages.conversation_id
        AND m.user_id = auth.uid()
    )
  );
