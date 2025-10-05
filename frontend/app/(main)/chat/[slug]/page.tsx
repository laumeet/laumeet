/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(main)/chat/[slug]/page.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Send,
  Paperclip,
  Smile,
  Shield,
  Loader2,
  MoreVertical,
  CheckCheck,
  Check,
  Search,
  Menu,
  Heart,
  X,
  Info
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import api from '@/lib/axio';
import { useSocket } from '@/hooks/useSocket';
import { useExploreProfiles } from '@/hooks/use-explore-profiles';

// -----------------------------
// Types
// -----------------------------
export interface Message {
  id: string | number; // Accept string or number
  conversation_id: string;
  sender_id: string;
  sender_username: string;
  content: string;
  is_read: boolean;
  timestamp: string;
  delivered_at: string | null;
  read_at: string | null;
  status: 'sent' | 'delivered' | 'read';
  reply_to?: {
    id: string | number;
    content?: string;
    sender_username?: string;
  } | null;
  reactions?: {
    [emoji: string]: number; // e.g. { '❤️': 2 }
  };
}

export interface Conversation {
  id: string | number;
  created_at: string;
  last_message: string;
  last_message_at: string;
  other_user: {
    id: string;
    username: string;
    name: string;
    avatar: string | null;
    images?: string[]; // optional array of image URLs
    isOnline: boolean;
    lastSeen: string | null;
  };
  unread_count: number;
}

// -----------------------------
// Utility helpers
// -----------------------------
const safeStr = (v: any) => (v === null || v === undefined ? '' : String(v));
const isTempId = (id: any) => String(id).startsWith('temp-');

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// -----------------------------
// Component
// -----------------------------
export default function ChatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profiles = [], loading: profilesLoading, error: profilesError, totalProfiles = 0, refetch: refetchProfiles, swipeProfile } = useExploreProfiles();

  // Basic states
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string>('');
  const [onlineStatus, setOnlineStatus] = useState<boolean>(true);
  const [isUserInChatRoom, setIsUserInChatRoom] = useState<boolean>(false);

  // Reply states
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showReplyPreview, setShowReplyPreview] = useState(false);

  // Reaction modal or quick reaction indicator
  const [showReactionsForMessage, setShowReactionsForMessage] = useState<string | number | null>(null);

  // Lightbox modal state for showing user images
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Dropdown (user details) state
  const [showUserDetailsDrop, setShowUserDetailsDrop] = useState(false);

  // local maps for delivered/read quick lookups
  const deliveredMapRef = useRef<Record<string, true>>({});
  const readMapRef = useRef<Record<string, true>>({});

  // refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // hold to reply detection
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pressedMessageRef = useRef<string | number | null>(null);

  // socket
  const { socket, isConnected: socketConnected, connectionError } = useSocket();

  const chatId = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;

  // -----------------------------
  // Helpers: formatting
  // -----------------------------
  const formatMessageTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return timestamp;
    }
  };

  const formatMessageDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString([], {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
    } catch {
      return timestamp;
    }
  };

  const isSameDay = (date1: string, date2: string) => {
    try {
      return new Date(date1).toDateString() === new Date(date2).toDateString();
    } catch {
      return false;
    }
  };

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return 'Never seen';

    const now = new Date();
    const seen = new Date(lastSeen);
    const diffMinutes = Math.floor((now.getTime() - seen.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  // -----------------------------
  // Fetching conversation & messages
  // -----------------------------
  const fetchConversationById = async (id: string | number) => {
    if (!id) return null;

    try {
      const response = await api.get('/chat/conversations');

      if (response.data.success) {
        const conversations = response.data.conversations || [];

        const currentConv = conversations.find((conv: Conversation) => {
          const convIdStr = String(conv.id);
          const chatIdStr = String(id);

          if (convIdStr === chatIdStr) {
            return true;
          }

          if (String(conv.other_user.id) === chatIdStr) {
            return true;
          }

          return false;
        });

        if (!currentConv) {
          setError('Chat not found');
          return null;
        }

        setConversation(currentConv);
        setOnlineStatus(currentConv.other_user.isOnline);
        return currentConv;
      }
      return null;
    } catch (err: any) {
      setError('Failed to load conversation');
      return null;
    }
  };

  const fetchMessagesById = async (id: string | number) => {
    if (!id) return;

    try {
      const response = await api.get(`/chat/messages/${id}`);

      if (response.data.success) {
        const serverMessages: Message[] = response.data.messages || [];
        setMessages(serverMessages);
      } else {
        setError('Failed to load messages');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load messages');
    }
  };

  const fetchMessages = async () => {
    if (!chatId) return;
    return fetchMessagesById(chatId);
  };

  const fetchConversation = async () => {
    if (!chatId) return null;
    return fetchConversationById(chatId);
  };

  // -----------------------------
  // Join room helper and resync
  // -----------------------------
  const joinConversationRoom = useCallback((convId?: string | number) => {
    if (!socket) return;
    const conversationId = convId ?? conversation?.id;
    if (!conversationId) return;

    try {
      socket.emit('join_conversation', { conversation_id: conversationId });
      // Also emit a custom event to notify join (server might not need this)
      socket.emit('user_joined_chat_room', { conversation_id: conversationId });
    } catch (err) {
      console.warn('Failed to join conversation room', err);
    }
  }, [socket, conversation]);

  const resyncConversation = useCallback(async (convId?: string | number) => {
    try {
      if (!convId && !conversation) return;
      const idToUse = convId ?? conversation!.id;
      await fetchConversationById(idToUse);
      await fetchMessagesById(idToUse);
    } catch (err) {
      console.error('Resync error', err);
    }
  }, [conversation]);

  // -----------------------------
  // Socket listeners
  // -----------------------------
  useEffect(() => {
    if (!socket || !conversation) return;

    // Join room on start
    joinConversationRoom(conversation.id);

    // When socket connects or reconnects, rejoin and resync
    const onConnect = () => {
      console.log('Socket connected/reconnected — rejoining and resyncing');
      joinConversationRoom(conversation.id);
      resyncConversation(conversation.id);
    };
    socket.on('connect', onConnect);

    // New message
    const onNewMessage = async (newMessage: Message) => {
      console.log('📨 New message received:', newMessage);

      // Prevent duplicates
      setMessages(prev => {
        const exists = prev.some(msg => String(msg.id) === String(newMessage.id));
        if (exists) return prev;
        return [...prev, newMessage];
      });

      // Scroll to bottom
      scrollToBottom();

      // If the new message is from other user and user is in the chat room, mark as read
      if (newMessage.sender_id === conversation.other_user.id && isUserInChatRoom) {
        if (socket) {
          socket.emit('mark_messages_read', { message_ids: [newMessage.id], conversation_id: conversation.id });
        }

        // Optimistic update
        setMessages(prev =>
          prev.map(msg =>
            String(msg.id) === String(newMessage.id)
              ? { ...msg, is_read: true, status: 'read', read_at: new Date().toISOString() }
              : msg
          )
        );
      }

      // refetch to make sure server side reply_to / ids are in canonical form
      try {
        await fetchMessagesById(conversation.id);
      } catch (err) {
        // ignore
      }
    };
    socket.on('new_message', onNewMessage);

    // Typing
    const onTyping = (data: any) => {
      if (data.user_id !== conversation.other_user.id) return;

      setTypingUser(data.username);
      setIsTyping(data.is_typing);

      if (data.is_typing) {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
          setTypingUser('');
        }, 3000);
      } else {
        setIsTyping(false);
        setTypingUser('');
      }
    };
    socket.on('user_typing', onTyping);

    // Online status
    const onOnlineStatus = (data: any) => {
      if (data.user_id === conversation.other_user.id) {
        setOnlineStatus(Boolean(data.is_online));
        setConversation(prev =>
          prev
            ? {
                ...prev,
                other_user: {
                  ...prev.other_user,
                  isOnline: Boolean(data.is_online),
                  lastSeen: data.last_seen ?? prev.other_user.lastSeen
                }
              }
            : prev
        );
      }
    };
    socket.on('user_online_status', onOnlineStatus);

    // Message delivered
    const onMessageDelivered = (data: any) => {
      // data: { message_id, conversation_id, delivered_at }
      setMessages(prev =>
        prev.map(msg =>
          String(msg.id) === String(data.message_id)
            ? { ...msg, status: 'delivered', delivered_at: data.delivered_at ?? msg.delivered_at }
            : msg
        )
      );
      deliveredMapRef.current[String(data.message_id)] = true;
    };
    socket.on('message_delivered', onMessageDelivered);

    // Message status update (read/delivered) - your backend emits message_status_update on read/delivered
    const onMessageStatusUpdate = (data: any) => {
      // example: { message_id, conversation_id, status: 'read', read_at, read_by }
      if (!data) return;
      const messageId = data.message_id;
      const status = data.status;
      if (!messageId) return;

      setMessages(prev =>
        prev.map(msg => {
          if (String(msg.id) !== String(messageId)) return msg;
          if (status === 'delivered') {
            deliveredMapRef.current[String(messageId)] = true;
            return { ...msg, status: 'delivered', delivered_at: data.delivered_at ?? msg.delivered_at };
          }
          if (status === 'read') {
            readMapRef.current[String(messageId)] = true;
            return { ...msg, status: 'read', read_at: data.read_at ?? msg.read_at, is_read: true };
          }
          return msg;
        })
      );
    };
    socket.on('message_status_update', onMessageStatusUpdate);

    // messages_read success response (bulk)
    const onMessagesRead = (data: any) => {
      if (!data) return;
      const messageIds: any[] = data.message_ids || [];
      setMessages(prev =>
        prev.map(msg =>
          messageIds.map(String).includes(String(msg.id))
            ? { ...msg, is_read: true, status: 'read', read_at: new Date().toISOString() }
            : msg
        )
      );
    };
    socket.on('messages_read', onMessagesRead);
    socket.on('messages_read_success', onMessagesRead);

    // user join/leave (optional)
    const onUserJoinedChat = (data: any) => {
      if (data.user_id === conversation.other_user.id) {
        markOurMessagesAsRead();
      }
    };
    socket.on('user_joined_chat', onUserJoinedChat);

    const onUserLeftChat = (data: any) => {
      // no-op for now
    };
    socket.on('user_left_chat', onUserLeftChat);

    // Clean up on unmount or conversation change
    return () => {
      socket.off('connect', onConnect);
      socket.off('new_message', onNewMessage);
      socket.off('user_typing', onTyping);
      socket.off('user_online_status', onOnlineStatus);
      socket.off('message_delivered', onMessageDelivered);
      socket.off('message_status_update', onMessageStatusUpdate);
      socket.off('messages_read', onMessagesRead);
      socket.off('messages_read_success', onMessagesRead);
      socket.off('user_joined_chat', onUserJoinedChat);
      socket.off('user_left_chat', onUserLeftChat);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
    };
  }, [socket, conversation, isUserInChatRoom, joinConversationRoom, resyncConversation]);

  // -----------------------------
  // mark our messages as read (when recipient views)
  // -----------------------------
  const markOurMessagesAsRead = async () => {
    if (!socket || !conversation) return;

    const ourUnreadMessages = messages.filter(msg =>
      msg.sender_id !== conversation.other_user.id &&
      msg.status !== 'read'
    );

    if (ourUnreadMessages.length > 0) {
      const messageIds = ourUnreadMessages.map(msg => msg.id);
      socket.emit('mark_messages_read', { message_ids: messageIds, conversation_id: conversation.id });
    }
  };

  // -----------------------------
  // mark incoming messages as read (when we view)
  // -----------------------------
  const markMessagesAsRead = async () => {
    if (!conversation) return;

    try {
      const unreadMessages = messages.filter(msg =>
        msg.sender_id === conversation.other_user.id &&
        !msg.is_read
      );

      if (unreadMessages.length > 0) {
        const messageIds = unreadMessages.map(msg => msg.id);

        if (socket) {
          socket.emit('mark_messages_read', { message_ids: messageIds, conversation_id: conversation.id });
        }

        try {
          await api.post(`/api/chat/conversations/mark-read?conversationId=${conversation.id}`);
        } catch (err) {
          console.warn('API mark-read failed:', err);
        }
      }

      setMessages(prev => prev.map(msg => ({
        ...msg,
        is_read: msg.sender_id === conversation.other_user.id ? true : msg.is_read,
        status: msg.sender_id === conversation.other_user.id && (msg.status === 'delivered' || msg.status === 'sent') ? 'read' : msg.status,
        read_at: msg.sender_id === conversation.other_user.id && !msg.read_at ? new Date().toISOString() : msg.read_at
      })));
    } catch (err) {
      console.error('Failed to mark messages as read:', err);
    }
  };

  // -----------------------------
  // scroll
  // -----------------------------
  const scrollToBottom = () => {
    try {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) { /* ignore */ }
  };

  // -----------------------------
  // load chat data
  // -----------------------------
  const loadChatData = async () => {
    if (!chatId) {
      router.push('/chat');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const conv = await fetchConversation();
      if (conv) {
        await fetchMessages();
        if (socket) joinConversationRoom(conv.id);
      }
    } catch (err) {
      setError('Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChatData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // -----------------------------
  // Auto-resize textarea
  // -----------------------------
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  // -----------------------------
  // Typing indicator
  // -----------------------------
  const handleTyping = (isTypingFlag: boolean) => {
    if (!socket || !conversation) return;

    socket.emit('typing', {
      conversation_id: conversation.id,
      is_typing: isTypingFlag
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Send typing start
    if (e.target.value.trim() && !isTyping) {
      handleTyping(true);
    }

    // Set timeout to send typing stop
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      handleTyping(false);
    }, 1000);
  };

  // -----------------------------
  // Hold/Long press (reply)
  // -----------------------------
  const startLongPress = (msgId: string | number) => {
    if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
    pressedMessageRef.current = msgId;
    longPressTimeoutRef.current = setTimeout(() => {
      const msg = messages.find(m => String(m.id) === String(msgId));
      if (msg) {
        setReplyTo(msg);
        setShowReplyPreview(true);
      }
    }, 500); // 500ms for long press
  };

  const cancelLongPress = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    pressedMessageRef.current = null;
  };

  const cancelReply = () => {
    setReplyTo(null);
    setShowReplyPreview(false);
  };

  // -----------------------------
  // Reactions (likes) - double-tap or button
  // -----------------------------
  // Simple double-tap detection (mobile friendly)
  const lastTapRef = useRef<number>(0);
  const handleMessageTap = (msg: Message) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // double-tap detected -> toggle like
      toggleLike(msg);
    }
    lastTapRef.current = now;
  };

  const toggleLike = (msg: Message) => {
    // Optimistic local update
    setMessages(prev =>
      prev.map(m => {
        if (String(m.id) !== String(msg.id)) return m;
        const reactions = m.reactions ? { ...m.reactions } : {};
        const heartCount = reactions['❤️'] || 0;
        // Simplest toggle: if user likes, increase; else increase. Without user-specific tracking, just increment.
        reactions['❤️'] = heartCount + 1;
        return { ...m, reactions };
      })
    );

    // Emit reaction over socket
    if (socket && conversation) {
      socket.emit('message_reaction', {
        message_id: msg.id,
        conversation_id: conversation.id,
        reaction: '❤️'
      });
    }
  };

  // -----------------------------
  // Send message
  // -----------------------------
  const sendMessage = async () => {
    if (!message.trim() || !conversation || sending) return;

    const content = message.trim();
    setSending(true);

    try {
      handleTyping(false);

      // optimistic message
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: String(conversation.id),
        sender_id: 'current-user',
        sender_username: 'You',
        content,
        is_read: false,
        timestamp: new Date().toISOString(),
        delivered_at: null,
        read_at: null,
        status: 'sent',
        reply_to: replyTo ? { id: replyTo.id, content: replyTo.content, sender_username: replyTo.sender_username } : null,
        reactions: {}
      };

      setMessages(prev => [...prev, tempMessage]);
      setMessage('');
      cancelReply();

      if (socket && socketConnected) {
        socket.emit('send_message', {
          conversation_id: conversation.id,
          content,
          reply_to: replyTo ? String(replyTo.id) : null
        });

        // Fallback fallback: if server doesn't return new message in time, refetch
        const fallbackTimer = setTimeout(async () => {
          try {
            await fetchMessagesById(conversation.id);
          } catch {
            // ignore
          }
        }, 2500);

        // When real message arrives, socket handler will dedupe and replace if needed
      } else {
        // Fallback to HTTP
        const response = await api.post(`/chat/messages/send?conversationId=${conversation.id}`, {
          content,
          reply_to: replyTo ? String(replyTo.id) : null
        });

        if (response.data.success) {
          setMessages(prev => prev.filter(m => !isTempId(m.id)));
          await fetchMessagesById(conversation.id);
          await fetchConversationById(conversation.id);
        } else {
          setError('Failed to send message');
          setMessages(prev => prev.filter(m => !isTempId(m.id)));
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send message');
      setMessages(prev => prev.filter(m => !isTempId(m.id)));
    } finally {
      setSending(false);
    }
  };

  
  // -----------------------------
  // Delivery acknowledgment when message is visible to recipient
  // -----------------------------
  // In some workflows you may emit message_delivered when you receive 'new_message' for recipient (recipient side should emit)
  // Here we provide a helper to mark a message delivered
  const markMessageDelivered = (msgId: string | number) => {
    if (!socket || !conversation) return;
    socket.emit('message_delivered', { message_id: msgId, conversation_id: conversation.id });
  };

  // -----------------------------
  // Keyboard / cleanup
  // -----------------------------
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
    };
  }, []);

  // -----------------------------
  // Back navigation
  // -----------------------------
  const handleBack = () => {
    router.push('/chat');
  };

  // -----------------------------
  // Avatar click: open lightbox OR show details dropdown
  // - If the user clicks avatar -> open images lightbox if images present, else show "no profile photo".
  // - There's also a header dropdown (three-dot or info icon) to show full other_user details using useExploreProfiles.
  // -----------------------------
  const openLightbox = (index = 0) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxIndex(0);
  };

  // Find profile details via useExploreProfiles data when showing details dropdown
  const otherUserProfile = (() => {
    if (!conversation) return null;
    const id = String(conversation.other_user.id);
    // search in profiles returned by hook
    return profiles.find((p: any) => String(p.id) === id || String(p.public_id) === id || String(p.username) === id) || null;
  })();

  const handleAvatarClick = () => {
    // If conversation.other_user has images array, open lightbox
    if (conversation?.other_user?.images && conversation.other_user.images.length > 0) {
      openLightbox(0);
      return;
    }

    // Otherwise open the user details dropdown so they can view profile (WhatsApp-like)
    setShowUserDetailsDrop(true);
  };

  // -----------------------------
  // UI Render
  // -----------------------------
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-green-500" />
          <p className="text-gray-500 dark:text-gray-400">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900 p-4">
        <p className="text-gray-500 dark:text-gray-400 mb-4 text-center">
          {error || 'Chat not found'}
        </p>
        <Button onClick={handleBack}>
          Back to Chats
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen no-scrollbar flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-none text-white">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="hover:bg-green-600 dark:hover:bg-green-700 text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex items-center space-x-3">
              <div onClick={handleAvatarClick} className="cursor-pointer">
                <Avatar className="h-10 w-10 border-2 border-white">
                  <AvatarImage
                    src={conversation.other_user.avatar || '/api/placeholder/40/40'}
                    alt={conversation.other_user.name}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-green-600 text-white">
                    {conversation.other_user.name?.charAt(0) || conversation.other_user.username?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white truncate">
                  {conversation.other_user.name || conversation.other_user.username}
                </h3>
                <div className="flex items-center space-x-2">
                  <p className="text-green-100 text-xs">
                    {onlineStatus ? 'online' : `Last seen: ${formatLastSeen(conversation.other_user.lastSeen)}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Header dropdown: show more about other_user */}
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white">
                  <Info className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="end" className="w-72">
                <div className="p-3">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={conversation.other_user.avatar || '/api/placeholder/80/80'}
                        alt={conversation.other_user.name}
                      />
                      <AvatarFallback className="bg-green-600 text-white">
                        {conversation.other_user.name?.charAt(0) || conversation.other_user.username?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold text-sm">{conversation.other_user.name || conversation.other_user.username}</div>
                      <div className="text-xs text-muted-foreground">@{conversation.other_user.username}</div>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-gray-700 dark:text-gray-300">
                    <div><strong>Online:</strong> {conversation.other_user.isOnline ? 'Yes' : 'No'}</div>
                    <div><strong>Last seen:</strong> {formatLastSeen(conversation.other_user.lastSeen)}</div>
                    <div className="mt-2"><strong>Conversation:</strong></div>
                    <div className="text-sm truncate">{conversation.last_message || 'No messages yet'}</div>
                  </div>

                  <div className="mt-3">
                    <Button onClick={() => { setShowUserDetailsDrop(true); }} size="sm">View full profile</Button>
                    <div className="mt-2 text-xs text-gray-500">Profiles loaded: {totalProfiles}</div>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto bg-[#e5ddd5] dark:bg-gray-800 bg-chat-background bg-repeat bg-center"
      >
        <div className="max-w-3xl mx-auto p-2 space-y-1">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl text-white">💬</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Start a conversation
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                Send your first message to {conversation.other_user.name || conversation.other_user.username} and get the chat started!
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isOwn = msg.sender_id !== conversation.other_user.id;
              const showDate = index === 0 || !isSameDay(msg.timestamp, messages[index - 1].timestamp);

              const replyPreview = msg.reply_to ? (
                <div className="mb-1 px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300">
                  <div className="font-medium text-xs truncate">
                    {msg.reply_to.sender_username ? `${msg.reply_to.sender_username}` : 'Reply'}
                  </div>
                  <div className="text-xs truncate">
                    {msg.reply_to.content ? (msg.reply_to.content.length > 120 ? `${msg.reply_to.content.slice(0, 120)}...` : msg.reply_to.content) : ''}
                  </div>
                </div>
              ) : null;

              return (
                <div key={String(msg.id)} className="space-y-1">
                  {showDate && (
                    <div className="flex justify-center">
                      <div className="bg-black bg-opacity-20 px-3 py-1 rounded-full text-xs text-white">
                        {formatMessageDate(msg.timestamp)}
                      </div>
                    </div>
                  )}

                  <div
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    onMouseDown={() => startLongPress(msg.id)}
                    onMouseUp={cancelLongPress}
                    onMouseLeave={cancelLongPress}
                    onTouchStart={() => startLongPress(msg.id)}
                    onTouchEnd={cancelLongPress}
                    onTouchCancel={cancelLongPress}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleMessageTap(msg)}
                  >
                    <div className={`max-w-[70%] ${isOwn ? 'ml-12' : 'mr-12'}`}>
                      <div className={`relative px-3 py-2 rounded-lg ${isOwn ? 'bg-[#d9fdd3] dark:bg-green-900 rounded-br-none' : 'bg-white dark:bg-gray-700 rounded-bl-none'} shadow-sm`}>
                        {/* reply preview */}
                        {replyPreview}

                        <p className="text-sm break-words leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </p>

                        {/* reactions display */}
                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                          <div className="absolute -top-3 left-0 -translate-y-1/2 flex items-center space-x-1">
                            {Object.entries(msg.reactions).map(([emoji, count]) => (
                              <div key={emoji} className="px-2 py-1 rounded-full bg-white/90 dark:bg-black/60 text-xs shadow-sm flex items-center space-x-1">
                                <span>{emoji}</span>
                                <span className="text-xs">{count}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className={`flex items-center justify-end space-x-1 mt-1 ${isOwn ? 'text-green-800 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}>
                          <span className="text-xs" style={{ fontSize: '11px' }}>
                            {formatMessageTime(msg.timestamp)}
                          </span>
                          {isOwn && (
                            <span className="flex items-center" style={{ fontSize: '11px' }}>
                              {msg.status === 'read' ? (
                                <CheckCheck size={14} className="text-blue-500" />
                              ) : msg.status === 'delivered' ? (
                                <CheckCheck size={14} />
                              ) : (
                                <Check size={14} />
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* small reaction button under message */}
                      <div className={`mt-1 text-xs ${isOwn ? 'text-right' : 'text-left'}`}>
                        <Button variant="ghost" size="sm" onClick={() => toggleLike(msg)}>
                          <Heart className="h-4 w-4 text-pink-500" />
                          <span className="ml-1 text-xs">Like</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Reply preview/banner above input */}
      {showReplyPreview && replyTo && (
        <div className="flex-none p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-1" />
              <div className="flex flex-col">
                <span className="text-xs text-gray-700 dark:text-gray-200 font-medium">
                  Replying to {replyTo.sender_username || 'them'}
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {replyTo.content && replyTo.content.length > 80 ? `${replyTo.content.slice(0, 80)}...` : replyTo.content}
                </span>
              </div>
            </div>
            <div>
              <Button variant="ghost" size="icon" onClick={cancelReply}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex-none p-3">
        {error && (
          <div className="mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="flex items-end space-x-2 max-w-3xl mx-auto">
          <Button variant="ghost" size="icon" className="flex-none hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400" type="button">
            <Paperclip className="h-5 w-5" />
          </Button>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              placeholder="Type a message"
              value={message}
              onChange={handleInputChange}
              
              className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm min-h-[44px] max-h-26 overflow-hidden"
              rows={1}
              disabled={sending}
              style={{ overflow: 'hidden' }}
            />
            <Button variant="ghost" size="icon" className="absolute right-2 bottom-2 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400" type="button">
              <Smile className="h-5 w-5" />
            </Button>
          </div>

          <Button
            onClick={sendMessage}
            disabled={!message.trim() || sending}
            size="icon"
            className="flex-none bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed h-11 w-11 rounded-full shadow-lg"
            type="button"
            title="Send message"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            ) : (
              <Send className="h-5 w-5 text-white" />
            )}
          </Button>
        </div>
      </div>

      {/* Lightbox modal */}
      {lightboxOpen && conversation?.other_user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="relative max-w-3xl w-full mx-4">
            <div className="bg-black rounded-lg overflow-hidden">
              <div className="relative h-[60vh] md:h-[70vh]">
                {conversation.other_user.images && conversation.other_user.images.length > 0 ? (
                  <img
                    src={conversation.other_user.images[lightboxIndex]}
                    alt={`${conversation.other_user.name || conversation.other_user.username} - ${lightboxIndex + 1}`}
                    className="object-contain w-full h-full bg-black"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-black text-white">
                    <div className="text-center">
                      <div className="text-3xl mb-2">No profile photo</div>
                      <div className="text-sm opacity-80">This user hasn't uploaded a profile image</div>
                    </div>
                  </div>
                )}
              </div>

              {/* controls */}
              <div className="absolute top-3 right-3">
                <Button variant="ghost" size="icon" onClick={closeLightbox}>
                  <X className="h-5 w-5 text-white" />
                </Button>
              </div>

              {/* thumbnails */}
              {conversation.other_user.images && conversation.other_user.images.length > 1 && (
                <div className="p-2 bg-black/60 flex space-x-2 overflow-x-auto">
                  {conversation.other_user.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`thumb-${idx}`}
                      className={`h-16 w-16 object-cover rounded cursor-pointer ${idx === lightboxIndex ? 'ring-2 ring-white' : ''}`}
                      onClick={() => setLightboxIndex(idx)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User details drawer/modal triggered by header dropdown */}
      {showUserDetailsDrop && conversation && (
        <div className="fixed inset-0 z-40 flex items-end md:items-center justify-center md:justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowUserDetailsDrop(false)} />
          <div className="relative z-50 bg-white dark:bg-gray-900 rounded-t-xl md:rounded-l-xl md:rounded-tr-none p-4 w-full md:w-96 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={conversation.other_user.avatar || '/api/placeholder/80/80'} />
                  <AvatarFallback className="bg-green-600 text-white">
                    {conversation.other_user.name?.charAt(0) || conversation.other_user.username?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">{conversation.other_user.name || conversation.other_user.username}</div>
                  <div className="text-xs text-muted-foreground">@{conversation.other_user.username}</div>
                </div>
              </div>
              <div>
                <Button variant="ghost" size="icon" onClick={() => setShowUserDetailsDrop(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-700 dark:text-gray-300">
              {/* Show profile from useExploreProfiles if available */}
              {otherUserProfile ? (
                <div>
                  <div><strong>Bio:</strong></div>
                  <div className="mt-1 text-xs">{otherUserProfile.bio || 'No bio available'}</div>

                  <div className="mt-3"><strong>Details</strong></div>
                  <div className="mt-1 text-xs">
<div><strong>Name:</strong> {otherUserProfile.name}</div>
                    <div><strong>Username:</strong> @{otherUserProfile.username}</div>
                   <div><strong>Name:</strong> {otherUserProfile.name}</div>
<div><strong>Level:</strong> {otherUserProfile.level}</div>
<div><strong>Age:</strong> {otherUserProfile.age}</div>
<div><strong>Religion:</strong> {otherUserProfile.religious}</div>
                    
                  </div>

                  <div className="mt-3"><strong>Photos</strong></div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(otherUserProfile.pictures || conversation.other_user.images || []).length === 0 ? (
                      <div className="col-span-3 text-xs text-gray-500">No photos</div>
                    ) : (
                      (otherUserProfile.pictures || conversation.other_user.images || []).map((img: string, i: number) => (
                        <img
                          key={i}
                          src={img}
                          alt={`profile-${i}`}
                          className="h-20 w-full object-cover rounded cursor-pointer"
                          onClick={() => { setLightboxIndex(i); setLightboxOpen(true); setShowUserDetailsDrop(false); }}
                        />
                      ))
                    )}
                  </div>

                  <div className="mt-4">
                    <Button onClick={() => { refetchProfiles(); }} size="sm">Refresh profile</Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-xs text-gray-500">Profile not in explore cache.</div>
                  <div className="mt-3">
                    <Button onClick={() => refetchProfiles()} size="sm">Load profile</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


interface ExploreProfile {
  id: string;
  username: string;
  name: string;
  age: number;
  bio: string;
  pictures: string[];
  category: string;
  isAnonymous: boolean;
  department: string;
  interests: string[];
  distance: number;
  compatibility: number;
  level: string;
  gender: string;
  interestedIn: string;
  religious: string;
  genotype: string;
  timestamp: string;
}