"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowLeft,
  FileText,
  Loader2,
  MessageCircle,
  Paperclip,
  Pencil,
  Plus,
  Radio,
  Search,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  createGroupConversation,
  deleteChatMessage,
  editChatMessage,
  getConversationMembers,
  getConversationMessages,
  getMyConversations,
  getOrCreateDirectConversation,
  markConversationRead,
  searchMessageableEmployees,
  sendChatMessage,
  sendChatMessageWithAttachment,
  syncRegionTeamChats,
} from "@/lib/actions/chat";
import {
  broadcastChatMessage,
  broadcastChatMessageUpdate,
} from "@/lib/realtime/chat-broadcast";
import { useChatSubscription } from "@/lib/realtime/use-chat-subscription";
import { toast } from "@/lib/toast";
import { formatRelativeTime, getFullName } from "@/lib/utils";
import type {
  ChatConversationMemberProfile,
  ChatConversationWithPreview,
  ChatMessage,
  MessageableEmployee,
} from "@/lib/types";

type PanelView = "list" | "thread" | "search" | "newGroup" | "members";

interface EmployeeChatPanelProps {
  userId: string;
  myEmployeeId: string;
  open: boolean;
  onClose: () => void;
}

function isImageMime(mime: string | null | undefined): boolean {
  return Boolean(mime?.startsWith("image/"));
}

function MessageAttachment({
  message,
  isMine,
}: {
  message: ChatMessage;
  isMine: boolean;
}) {
  if (!message.attachment_url || message.deleted_at) return null;

  if (isImageMime(message.attachment_mime)) {
    return (
      <a
        href={message.attachment_url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 block overflow-hidden rounded-lg border border-white/20"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={message.attachment_url}
          alt={message.attachment_name ?? "Attachment"}
          className="max-h-56 w-full object-cover"
        />
      </a>
    );
  }

  return (
    <a
      href={message.attachment_url}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
        isMine
          ? "border-white/30 bg-white/10 text-white hover:bg-white/20"
          : "border-dswd-border bg-slate-50 text-dswd-navy hover:bg-slate-100"
      }`}
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate">{message.attachment_name ?? "Download attachment"}</span>
    </a>
  );
}

function MessageBubble({
  message,
  myEmployeeId,
  onDelete,
  onEdit,
  deleting,
  editing,
}: {
  message: ChatMessage;
  myEmployeeId: string;
  onDelete: (id: string) => void;
  onEdit: (id: string, body: string) => void;
  deleting: boolean;
  editing: boolean;
}) {
  const isMine = message.sender_employee_id === myEmployeeId;
  const isDeleted = Boolean(message.deleted_at);
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(message.body);

  useEffect(() => {
    if (!isEditing) setEditDraft(message.body);
  }, [message.body, isEditing]);

  return (
    <div className={`group flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div className="relative max-w-[88%]">
        <div
          className={`rounded-2xl px-4 py-2.5 text-base shadow-sm ${
            isDeleted
              ? "border border-dashed border-dswd-border bg-slate-50 italic text-muted-foreground"
              : isMine
                ? "rounded-br-md bg-gradient-to-br from-dswd-navy to-dswd-blue text-white"
                : "rounded-bl-md border border-dswd-border bg-white text-dswd-navy"
          }`}
        >
          {!isMine && message.sender && !isDeleted && (
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-dswd-blue">
              {getFullName(message.sender.first_name, message.sender.last_name)}
            </p>
          )}

          {isEditing && isMine && !isDeleted ? (
            <div className="space-y-2">
              <Textarea
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                rows={3}
                className="min-h-[4rem] resize-none border-white/30 bg-white/10 text-white placeholder:text-white/60"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-white hover:bg-white/10"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-8 bg-white text-dswd-navy hover:bg-white/90"
                  disabled={editing || !editDraft.trim()}
                  onClick={() => {
                    onEdit(message.id, editDraft.trim());
                    setIsEditing(false);
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : isDeleted ? (
            <p className="whitespace-pre-wrap break-words">
              {isMine ? "You deleted this message" : "This message was deleted"}
            </p>
          ) : (
            <>
              {message.body.trim() && (
                <p className="whitespace-pre-wrap break-words">{message.body}</p>
              )}
              <MessageAttachment message={message} isMine={isMine} />
            </>
          )}

          <p
            className={`mt-1.5 text-xs ${
              isDeleted
                ? "text-muted-foreground"
                : isMine
                  ? "text-white/70"
                  : "text-muted-foreground"
            }`}
          >
            {formatRelativeTime(message.created_at)}
            {message.edited_at && !isDeleted ? " · edited" : ""}
          </p>
        </div>

        {isMine && !isDeleted && !isEditing && (
          <div className="absolute -left-16 top-1/2 flex -translate-y-1/2 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-dswd-blue"
              disabled={editing}
              onClick={() => setIsEditing(true)}
              aria-label="Edit message"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-red-600"
              disabled={deleting}
              onClick={() => onDelete(message.id)}
              aria-label="Delete message"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function EmployeeChatPanel({
  userId,
  myEmployeeId,
  open,
  onClose,
}: EmployeeChatPanelProps) {
  const [view, setView] = useState<PanelView>("list");
  const [conversations, setConversations] = useState<ChatConversationWithPreview[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<ChatConversationWithPreview | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<ChatConversationMemberProfile[]>([]);
  const [draft, setDraft] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MessageableEmployee[]>([]);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<MessageableEmployee[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const syncedRef = useRef(false);

  const memberConversationIds = useMemo(
    () => conversations.map((conversation) => conversation.id),
    [conversations]
  );

  const loadConversations = useCallback(() => {
    startTransition(async () => {
      const data = await getMyConversations();
      setConversations(data);
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    loadConversations();
    setView("list");

    if (!syncedRef.current) {
      syncedRef.current = true;
      void syncRegionTeamChats().then(() => loadConversations());
    }
  }, [open, loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, view]);

  const handleIncomingMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((item) => item.id === message.id)) return prev;
      return [...prev, message];
    });
  }, []);

  const handleMessageUpdated = useCallback((message: ChatMessage) => {
    setMessages((prev) =>
      prev.map((item) => (item.id === message.id ? message : item))
    );
  }, []);

  const handleConversationActivity = useCallback(
    (conversationId: string) => {
      setConversations((prev) => {
        const updated = [...prev];
        const index = updated.findIndex((item) => item.id === conversationId);
        if (index > 0) {
          const [item] = updated.splice(index, 1);
          updated.unshift(item);
        }
        return updated;
      });
      loadConversations();
      if (activeConversation?.id === conversationId) {
        void markConversationRead(conversationId);
      }
    },
    [activeConversation?.id, loadConversations]
  );

  useChatSubscription({
    userId,
    enabled: open,
    memberConversationIds,
    activeConversationId: activeConversation?.id ?? null,
    onMessage: handleIncomingMessage,
    onMessageUpdated: handleMessageUpdated,
    onConversationActivity: handleConversationActivity,
  });

  function openConversation(conversation: ChatConversationWithPreview) {
    setActiveConversation(conversation);
    setView("thread");
    setPendingFile(null);
    startTransition(async () => {
      const data = await getConversationMessages(conversation.id);
      setMessages(data);
      await markConversationRead(conversation.id);
      loadConversations();
    });
  }

  function openMembers() {
    if (!activeConversation) return;
    setView("members");
    startTransition(async () => {
      const data = await getConversationMembers(activeConversation.id);
      setMembers(data);
    });
  }

  function applyOutgoingMessage(message: ChatMessage) {
    setMessages((prev) => {
      if (prev.some((item) => item.id === message.id)) {
        return prev.map((item) => (item.id === message.id ? message : item));
      }
      return [...prev, message];
    });
    void broadcastChatMessage(message.conversation_id, message);
  }

  function applyUpdatedMessage(message: ChatMessage) {
    setMessages((prev) =>
      prev.map((item) => (item.id === message.id ? message : item))
    );
    void broadcastChatMessageUpdate(message.conversation_id, message);
  }

  function handleSend() {
    if (!activeConversation || isSending) return;
    if (!draft.trim() && !pendingFile) return;

    const body = draft.trim();
    const file = pendingFile;
    setDraft("");
    setPendingFile(null);
    setIsSending(true);

    startTransition(async () => {
      try {
        const result = file
          ? await (() => {
              const formData = new FormData();
              formData.append("conversationId", activeConversation.id);
              formData.append("body", body);
              formData.append("file", file);
              return sendChatMessageWithAttachment(formData);
            })()
          : await sendChatMessage(activeConversation.id, body);

        if (!result.success) {
          toast.error(result.error);
          setDraft(body);
          if (file) setPendingFile(file);
          return;
        }

        if (result.message) {
          applyOutgoingMessage(result.message);
        }
        loadConversations();
      } finally {
        setIsSending(false);
      }
    });
  }

  function handleDelete(messageId: string) {
    setDeletingId(messageId);
    startTransition(async () => {
      const result = await deleteChatMessage(messageId);
      setDeletingId(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (result.message) {
        applyUpdatedMessage(result.message);
      }
      loadConversations();
    });
  }

  function handleEdit(messageId: string, body: string) {
    setEditingId(messageId);
    startTransition(async () => {
      const result = await editChatMessage(messageId, body);
      setEditingId(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (result.message) {
        applyUpdatedMessage(result.message);
      }
      loadConversations();
    });
  }

  function handleSearch(query: string) {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    startTransition(async () => {
      const results = await searchMessageableEmployees(query);
      setSearchResults(results);
    });
  }

  function startDirectMessage(employee: MessageableEmployee) {
    startTransition(async () => {
      const result = await getOrCreateDirectConversation(employee.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (!result.conversationId) {
        toast.error("Could not start conversation.");
        return;
      }
      const data = await getMyConversations();
      setConversations(data);
      const conversation = data.find((item) => item.id === result.conversationId);
      if (conversation) openConversation(conversation);
    });
  }

  function toggleGroupMember(employee: MessageableEmployee) {
    setSelectedMembers((prev) => {
      const exists = prev.some((item) => item.id === employee.id);
      if (exists) return prev.filter((item) => item.id !== employee.id);
      return [...prev, employee];
    });
  }

  function handleCreateGroup() {
    startTransition(async () => {
      const result = await createGroupConversation(
        groupName,
        selectedMembers.map((member) => member.id)
      );
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (!result.conversationId) {
        toast.error("Could not create group.");
        return;
      }
      setGroupName("");
      setSelectedMembers([]);
      const data = await getMyConversations();
      setConversations(data);
      const conversation = data.find((item) => item.id === result.conversationId);
      if (conversation) openConversation(conversation);
      else setView("list");
    });
  }

  const showMembersButton =
    activeConversation &&
    (activeConversation.type === "group" || activeConversation.type === "team");

  if (!open) return null;

  return (
    <div className="fixed bottom-24 right-4 z-[70] flex h-[min(85vh,640px)] w-[min(100vw-1.5rem,32rem)] flex-col overflow-hidden rounded-2xl border border-dswd-border bg-white shadow-2xl sm:right-6">
      <div className="flex shrink-0 items-center justify-between border-b border-dswd-border bg-gradient-to-r from-dswd-navy via-dswd-blue to-dswd-navy px-4 py-3.5 text-white">
        <div className="flex min-w-0 items-center gap-2">
          {view !== "list" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-white hover:bg-white/10"
              onClick={() => {
                if (view === "thread" || view === "members") {
                  if (view === "members") {
                    setView("thread");
                    return;
                  }
                  setActiveConversation(null);
                  setMessages([]);
                  setMembers([]);
                  setView("list");
                  loadConversations();
                } else {
                  setView("list");
                }
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">
              {view === "thread"
                ? activeConversation?.name ?? "Conversation"
                : view === "members"
                  ? "Group Members"
                  : view === "search"
                    ? "New Message"
                    : view === "newGroup"
                      ? "Create Group"
                      : "Team Comms"}
            </p>
            <p className="flex items-center gap-1 text-xs text-white/80">
              <Radio className="h-3.5 w-3.5" />
              Live field messaging
              {activeConversation?.member_count
                ? ` · ${activeConversation.member_count} members`
                : ""}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {view === "thread" && showMembersButton && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-white hover:bg-white/10"
              onClick={openMembers}
              aria-label="View members"
            >
              <Users className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white hover:bg-white/10"
            onClick={onClose}
            aria-label="Close chat"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {view === "list" && (
        <>
          <div className="flex shrink-0 gap-2 border-b border-dswd-border bg-dswd-light/40 p-3">
            <Button
              variant="outline"
              size="sm"
              className="h-10 flex-1 gap-1.5 border-dswd-navy/20 text-sm"
              onClick={() => setView("search")}
            >
              <Search className="h-4 w-4" />
              Message
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 flex-1 gap-1.5 border-dswd-navy/20 text-sm"
              onClick={() => {
                setSearchQuery("");
                setSearchResults([]);
                setView("newGroup");
              }}
            >
              <Users className="h-4 w-4" />
              Group
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {conversations.length === 0 ? (
              <p className="px-2 py-12 text-center text-base text-muted-foreground">
                Setting up your regional team channel...
              </p>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => openConversation(conversation)}
                  className="mb-1 flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-dswd-light/70"
                >
                  <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-dswd-navy to-dswd-blue text-white shadow">
                    {conversation.type === "team" ? (
                      <Users className="h-5 w-5" />
                    ) : (
                      <MessageCircle className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-base font-semibold text-dswd-navy">
                        {conversation.name ??
                          (conversation.type === "team" ? "Team Chat" : "Direct Message")}
                      </p>
                      {conversation.unread_count > 0 && (
                        <Badge className="shrink-0 bg-dswd-gold text-dswd-navy">
                          {conversation.unread_count}
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {conversation.last_message?.deleted_at
                        ? "Message deleted"
                        : conversation.last_message?.attachment_url
                          ? conversation.last_message.attachment_name
                            ? `📎 ${conversation.last_message.attachment_name}`
                            : "📎 Attachment"
                          : conversation.last_message?.body ?? "No messages yet"}
                    </p>
                    {conversation.last_message && (
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(conversation.last_message.created_at)}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}

      {view === "thread" && activeConversation && (
        <>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-slate-50 to-white p-4">
            {messages.length === 0 ? (
              <p className="py-12 text-center text-base text-muted-foreground">
                Send a field update to your team.
              </p>
            ) : (
              messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  myEmployeeId={myEmployeeId}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  deleting={deletingId === message.id}
                  editing={editingId === message.id}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="shrink-0 border-t border-dswd-border bg-white p-3">
            {pendingFile && (
              <div className="mb-2 flex items-center justify-between rounded-lg border border-dswd-border bg-dswd-light/40 px-3 py-2 text-sm">
                <span className="truncate text-dswd-navy">📎 {pendingFile.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setPendingFile(null)}
                  aria-label="Remove attachment"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            {isSending && (
              <p className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-dswd-blue" />
                Sending message...
              </p>
            )}
            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                className="hidden"
                disabled={isSending}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setPendingFile(file);
                  e.target.value = "";
                }}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-11 w-11 shrink-0 border-dswd-border"
                disabled={isSending}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Attach file"
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a field message..."
                rows={2}
                disabled={isSending}
                className="min-h-[3rem] resize-none border-dswd-border text-base disabled:opacity-60"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button
                size="icon"
                className="h-11 w-11 shrink-0 bg-dswd-navy hover:bg-dswd-blue"
                disabled={isSending || (!draft.trim() && !pendingFile)}
                onClick={handleSend}
                aria-label="Send message"
              >
                {isSending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}

      {view === "members" && activeConversation && (
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <p className="mb-3 text-sm text-muted-foreground">
            {members.length} member{members.length === 1 ? "" : "s"} in{" "}
            <span className="font-medium text-dswd-navy">
              {activeConversation.name ?? "this conversation"}
            </span>
          </p>
          {members.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading members...</p>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="mb-2 flex items-center gap-3 rounded-xl border border-dswd-border bg-white px-4 py-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-dswd-navy to-dswd-blue text-sm font-semibold text-white">
                  {member.first_name.charAt(0)}
                  {member.last_name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-medium text-dswd-navy">
                    {getFullName(member.first_name, member.last_name, member.middle_name)}
                    {member.id === myEmployeeId ? " (You)" : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">{member.employee_id}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {view === "search" && (
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <Input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name or employee ID..."
            autoFocus
            className="h-11 border-dswd-border text-base"
          />
          <div className="mt-3">
            {searchQuery.trim().length < 2 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search.
              </p>
            ) : searchResults.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No employees found.
              </p>
            ) : (
              searchResults.map((employee) => (
                <button
                  key={employee.id}
                  type="button"
                  onClick={() => startDirectMessage(employee)}
                  className="mb-1 flex w-full items-center justify-between rounded-lg px-3 py-3 text-left hover:bg-dswd-light/70"
                >
                  <div>
                    <p className="text-base font-medium text-dswd-navy">
                      {getFullName(
                        employee.first_name,
                        employee.last_name,
                        employee.middle_name
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">{employee.employee_id}</p>
                  </div>
                  <Plus className="h-5 w-5 text-dswd-blue" />
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {view === "newGroup" && (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          <Input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name (e.g. NCR Response Unit)"
            className="h-11 border-dswd-border text-base"
          />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search members to add..."
            className="h-11 border-dswd-border text-base"
          />
          {selectedMembers.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedMembers.map((member) => (
                <Badge key={member.id} variant="secondary" className="gap-1 text-sm">
                  {getFullName(member.first_name, member.last_name, member.middle_name)}
                  <button type="button" onClick={() => toggleGroupMember(member)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <div>
            {searchResults.map((employee) => {
              const selected = selectedMembers.some((item) => item.id === employee.id);
              return (
                <button
                  key={employee.id}
                  type="button"
                  onClick={() => toggleGroupMember(employee)}
                  className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-3 text-left ${
                    selected ? "bg-dswd-light" : "hover:bg-dswd-light/70"
                  }`}
                >
                  <div>
                    <p className="text-base font-medium text-dswd-navy">
                      {getFullName(
                        employee.first_name,
                        employee.last_name,
                        employee.middle_name
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">{employee.employee_id}</p>
                  </div>
                  {selected && <Badge>Selected</Badge>}
                </button>
              );
            })}
          </div>
          <Button
            className="h-11 w-full bg-dswd-navy text-base hover:bg-dswd-blue"
            disabled={isPending || !groupName.trim() || selectedMembers.length === 0}
            onClick={handleCreateGroup}
          >
            Create Group
          </Button>
        </div>
      )}
    </div>
  );
}

interface EmployeeChatFabProps {
  userId: string;
  myEmployeeId: string;
}

export function EmployeeChatFab({ userId, myEmployeeId }: EmployeeChatFabProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        size="icon"
        className="fixed bottom-6 right-4 z-[60] h-14 w-14 rounded-full bg-gradient-to-br from-dswd-navy to-dswd-blue shadow-lg hover:from-dswd-blue hover:to-dswd-navy sm:right-6"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>
      <EmployeeChatPanel
        userId={userId}
        myEmployeeId={myEmployeeId}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
