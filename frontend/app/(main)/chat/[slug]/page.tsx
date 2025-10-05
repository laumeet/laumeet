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

// -----------------------------
// Types
// -----------------------------
export interface Message {
  id: string | number;
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
    isOnline: boolean;
    lastSeen: string | null;
  };
  unread_count: number;
}

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  bio?: string;
  age?: number;
  level?: string;
  religious?: string;
  avatar: string | null;
  pictures?: string[];
  isOnline: boolean;
  lastSeen: string | null;
}

// -----------------------------
// Utility helpers
// -----------------------------
const safeStr = (v: any) => (v === null || v === undefined ? '' : String(v));
const isTempId = (id: any) => String(id).startsWith('temp-');

// -----------------------------
// Component
// -----------------------------
export default function ChatDetailPage() {
  const params = useParams();
  const router = useRouter();

  // Basic states
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string>('');
  const [onlineStatus, setOnlineStatus] = useState<boolean>(true);

  // Reply states
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showReplyPreview, setShowReplyPreview] = useState(false);

  // Modal states
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showUserDetails, setShowUserDetails] = useState(false);

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
  // Fetch User Profile
  // -----------------------------
  const fetchUserProfile = async (userId: string) => {
    try {
      // You'll need to create this API endpoint to get user details
      const response = await api.get(`/users/${userId}/profile`);
      
      if (response.data.success) {
        setUserProfile(response.data.user);
      } else {
        console.warn('Failed to fetch user profile:', response.data.message);
      }
    } catch (err: any) {
      console.warn('Error fetching user profile:', err);
      // Don't set error state for profile fetch failures
    }
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
        
        // Fetch user profile when conversation is loaded
        fetchUserProfile(currentConv.other_user.id);
        
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
    } catch (err) {
      console.warn('Failed to join conversation room', err);
    }
  }, [socket, conversation]);

  // -----------------------------
  // Socket listeners
  // -----------------------------
  useEffect(() => {
    if (!socket || !conversation) return;

    // Join room on start
    joinConversationRoom(conversation.id);

    // When socket connects or reconnects, rejoin
    const onConnect = () => {
      console.log('Socket connected/reconnected — rejoining');
      joinConversationRoom(conversation.id);
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

    // Message status update (read/delivered)
    const onMessageStatusUpdate = (data: any) => {
      if (!data) return;
      const messageId = data.message_id;
      const status = data.status;
      if (!messageId) return;

      setMessages(prev =>
        prev.map(msg => {
          if (String(msg.id) !== String(messageId)) return msg;
          if (status === 'delivered') {
            return { ...msg, status: 'delivered', delivered_at: data.delivered_at ?? msg.delivered_at };
          }
          if (status === 'read') {
            return { ...msg, status: 'read', read_at: data.read_at ?? msg.read_at, is_read: true };
          }
          return msg;
        })
      );
    };
    socket.on('message_status_update', onMessageStatusUpdate);

    // Clean up on unmount or conversation change
    return () => {
      socket.off('connect', onConnect);
      socket.off('new_message', onNewMessage);
      socket.off('user_typing', onTyping);
      socket.off('user_online_status', onOnlineStatus);
      socket.off('message_status_update', onMessageStatusUpdate);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
    };
  }, [socket, conversation, joinConversationRoom]);

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
  // Hold/Long press (reply) - WhatsApp style
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
  // Send message with reply functionality
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
        reply_to: replyTo ? { 
          id: replyTo.id, 
          content: replyTo.content, 
          sender_username: replyTo.sender_username 
        } : null,
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
  // Avatar click: open lightbox
  // -----------------------------
  const openLightbox = (index = 0) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxIndex(0);
  };

  const handleAvatarClick = () => {
    if (userProfile?.pictures && userProfile.pictures.length > 0) {
      openLightbox(0);
    } else {
      setShowUserDetails(true);
    }
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
      <div className="flex-none bg-green-500 dark:bg-green-600 text-white">
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

          {/* Header dropdown: show user info */}
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white"
              onClick={() => setShowUserDetails(true)}
            >
              <Info className="h-5 w-5" />
            </Button>
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

              // Reply preview for the message being replied to
              const replyPreview = msg.reply_to ? (
                <div className="mb-1 px-2 py-1 rounded bg-black/10 dark:bg-white/10 text-xs text-gray-700 dark:text-gray-300 border-l-2 border-green-500">
                  <div className="font-medium text-xs truncate">
                    {msg.reply_to.sender_username || 'User'}
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
                  >
                    <div className={`max-w-[70%] ${isOwn ? 'ml-12' : 'mr-12'}`}>
                      <div className={`relative px-3 py-2 rounded-lg ${isOwn ? 'bg-[#d9fdd3] dark:bg-green-900 rounded-br-none' : 'bg-white dark:bg-gray-700 rounded-bl-none'} shadow-sm`}>
                        {/* reply preview */}
                        {replyPreview}

                        <p className="text-sm break-words leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </p>

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
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="max-w-[70%] mr-12">
                <div className="bg-white dark:bg-gray-700 px-3 py-2 rounded-lg rounded-bl-none shadow-sm">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {typingUser} is typing...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Reply preview/banner above input - WhatsApp style */}
      {showReplyPreview && replyTo && (
        <div className="flex-none p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <div className="w-1 h-full bg-green-500 rounded-full mt-1" />
              <div className="flex flex-col flex-1">
                <span className="text-xs text-gray-700 dark:text-gray-200 font-medium">
                  Replying to {replyTo.sender_username || 'them'}
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {replyTo.content}
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm min-h-[44px] max-h-32 overflow-hidden"
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
      {lightboxOpen && userProfile?.pictures && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="relative max-w-3xl w-full mx-4">
            <div className="bg-black rounded-lg overflow-hidden">
              <div className="relative h-[60vh] md:h-[70vh]">
                <img
                  src={userProfile.pictures[lightboxIndex]}
                  alt={`${userProfile.name || userProfile.username} - ${lightboxIndex + 1}`}
                  className="object-contain w-full h-full bg-black"
                />
              </div>

              {/* controls */}
              <div className="absolute top-3 right-3">
                <Button variant="ghost" size="icon" onClick={closeLightbox}>
                  <X className="h-5 w-5 text-white" />
                </Button>
              </div>

              {/* thumbnails */}
              {userProfile.pictures.length > 1 && (
                <div className="p-2 bg-black/60 flex space-x-2 overflow-x-auto">
                  {userProfile.pictures.map((img, idx) => (
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

      {/* User details modal */}
      {showUserDetails && conversation && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40">
          <div className="relative z-50 bg-white dark:bg-gray-900 rounded-t-xl md:rounded-xl p-6 w-full md:w-96 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">User Details</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowUserDetails(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex items-center space-x-4 mb-6">
              <Avatar className="h-16 w-16">
                <AvatarImage src={conversation.other_user.avatar || '/api/placeholder/80/80'} />
                <AvatarFallback className="bg-green-600 text-white text-lg">
                  {conversation.other_user.name?.charAt(0) || conversation.other_user.username?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg">{conversation.other_user.name || conversation.other_user.username}</h3>
                <p className="text-sm text-gray-500">@{conversation.other_user.username}</p>
                <p className={`text-xs ${onlineStatus ? 'text-green-500' : 'text-gray-500'}`}>
                  {onlineStatus ? 'Online' : `Last seen ${formatLastSeen(conversation.other_user.lastSeen)}`}
                </p>
              </div>
            </div>

            {userProfile ? (
              <div className="space-y-4 text-sm">
                {userProfile.bio && (
                  <div>
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</h4>
                    <p className="text-gray-600 dark:text-gray-400">{userProfile.bio}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  {userProfile.age && (
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Age</h4>
                      <p className="text-gray-600 dark:text-gray-400">{userProfile.age}</p>
                    </div>
                  )}
                  {userProfile.level && (
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Level</h4>
                      <p className="text-gray-600 dark:text-gray-400">{userProfile.level}</p>
                    </div>
                  )}
                  {userProfile.religious && (
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Religion</h4>
                      <p className="text-gray-600 dark:text-gray-400">{userProfile.religious}</p>
                    </div>
                  )}
                </div>

                {userProfile.pictures && userProfile.pictures.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Photos</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {userProfile.pictures.map((img, index) => (
                        <img
                          key={index}
                          src={img}
                          alt={`Photo ${index + 1}`}
                          className="h-20 w-full object-cover rounded cursor-pointer"
                          onClick={() => {
                            setLightboxIndex(index);
                            setLightboxOpen(true);
                            setShowUserDetails(false);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading user profile...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}