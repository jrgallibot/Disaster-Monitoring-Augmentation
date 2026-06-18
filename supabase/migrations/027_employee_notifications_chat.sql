-- Employee notifications and realtime chat (team, direct, group)
-- After applying: verify Realtime is enabled for the three tables in Supabase Dashboard
-- if ALTER PUBLICATION fails (already added).

CREATE TABLE IF NOT EXISTS employee_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (
    type IN (
      'chat_message',
      'deployment_update',
      'accomplishment',
      'mobilization',
      'team_leader_action'
    )
  ),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_notifications_recipient
  ON employee_notifications(recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_employee_notifications_unread
  ON employee_notifications(recipient_user_id)
  WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('team', 'direct', 'group')),
  name TEXT,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  region_id UUID REFERENCES library_regions(id) ON DELETE SET NULL,
  team_leader_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_team
  ON chat_conversations(type, region_id, team_leader_employee_id)
  WHERE type = 'team';

CREATE TABLE IF NOT EXISTS chat_conversation_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_members_user
  ON chat_conversation_members(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_members_conversation
  ON chat_conversation_members(conversation_id);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
  ON chat_messages(conversation_id, created_at DESC);

-- RLS
ALTER TABLE employee_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON employee_notifications;
CREATE POLICY "Users read own notifications"
  ON employee_notifications FOR SELECT
  USING (recipient_user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own notifications" ON employee_notifications;
CREATE POLICY "Users update own notifications"
  ON employee_notifications FOR UPDATE
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());

DROP POLICY IF EXISTS "Members read conversations" ON chat_conversations;
CREATE POLICY "Members read conversations"
  ON chat_conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversation_members m
      WHERE m.conversation_id = chat_conversations.id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members read conversation members" ON chat_conversation_members;
CREATE POLICY "Members read conversation members"
  ON chat_conversation_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversation_members mine
      WHERE mine.conversation_id = chat_conversation_members.conversation_id
        AND mine.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members update own read state" ON chat_conversation_members;
CREATE POLICY "Members update own read state"
  ON chat_conversation_members FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Members read messages" ON chat_messages;
CREATE POLICY "Members read messages"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversation_members m
      WHERE m.conversation_id = chat_messages.conversation_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members insert messages" ON chat_messages;
CREATE POLICY "Members insert messages"
  ON chat_messages FOR INSERT
  WITH CHECK (
    sender_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chat_conversation_members m
      WHERE m.conversation_id = chat_messages.conversation_id
        AND m.user_id = auth.uid()
    )
  );

-- Realtime publication (ignore errors if tables already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE employee_notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversation_members;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
