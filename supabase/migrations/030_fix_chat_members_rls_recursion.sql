-- Fix infinite recursion in chat_conversation_members RLS policies.
-- Self-referential EXISTS subqueries on the same table trigger recursion;
-- use a SECURITY DEFINER helper that bypasses RLS for the membership check.

CREATE OR REPLACE FUNCTION public.is_chat_conversation_member(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM chat_conversation_members
    WHERE conversation_id = p_conversation_id
      AND user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_chat_conversation_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_chat_conversation_member(UUID) TO authenticated;

DROP POLICY IF EXISTS "Members read conversation members" ON chat_conversation_members;
CREATE POLICY "Members read conversation members"
  ON chat_conversation_members FOR SELECT
  USING (public.is_chat_conversation_member(conversation_id));

DROP POLICY IF EXISTS "Members read conversations" ON chat_conversations;
CREATE POLICY "Members read conversations"
  ON chat_conversations FOR SELECT
  USING (public.is_chat_conversation_member(id));

DROP POLICY IF EXISTS "Members read messages" ON chat_messages;
CREATE POLICY "Members read messages"
  ON chat_messages FOR SELECT
  USING (public.is_chat_conversation_member(conversation_id));

DROP POLICY IF EXISTS "Members insert messages" ON chat_messages;
CREATE POLICY "Members insert messages"
  ON chat_messages FOR INSERT
  WITH CHECK (
    sender_user_id = auth.uid()
    AND public.is_chat_conversation_member(conversation_id)
  );

DROP POLICY IF EXISTS "Members soft delete own messages" ON chat_messages;
CREATE POLICY "Members soft delete own messages"
  ON chat_messages FOR UPDATE
  USING (
    sender_user_id = auth.uid()
    AND public.is_chat_conversation_member(conversation_id)
  )
  WITH CHECK (
    sender_user_id = auth.uid()
    AND public.is_chat_conversation_member(conversation_id)
  );
