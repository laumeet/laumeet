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
  Loader2,
  CheckCheck,
  Check,
  X,
  Info,
  Video,
  Phone,

} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import api from '@/lib/axio';
import { useSocketContext } from '@/lib/socket-context';
import { useProfile } from '@/hooks/get-profile';

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

  // Swipe states
  const [swipeStartX, setSwipeStartX] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipingMessageId, setSwipingMessageId] = useState<string | number | null>(null);

  // socket - FIXED: use useSocketContext instead of useSocket
  const { socket, isConnected: socketConnected, onlineUsers } = useSocketContext();

  const chatId = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;
const { profile } = useProfile();
  // -----------------------------
  // Formatting helpers
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
  // Fetch functions
  // -----------------------------
  const fetchUserProfile = async (userId: string) => {
    try {
      const response = await api.get(`/users/${userId}/profile`);
      if (response.data.success) {
        setUserProfile(response.data.user);
      }
    } catch (err: any) {
      console.warn('Error fetching user profile:', err);
    }
  };

  const fetchConversationById = async (id: string | number) => {
    if (!id) return null;

    try {
      const response = await api.get('/chat/conversations');
      if (response.data.success) {
        const conversations = response.data.conversations || [];
        const currentConv = conversations.find((conv: Conversation) => {
          const convIdStr = String(conv.id);
          const chatIdStr = String(id);
          return convIdStr === chatIdStr || String(conv.other_user.id) === chatIdStr;
        });

        if (!currentConv) {
          setError('Chat not found');
          return null;
        }

        setConversation(currentConv);
        setOnlineStatus(currentConv.other_user.isOnline);
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
  // Socket Connection & Event Handlers - FIXED VERSION
  // -----------------------------
  useEffect(() => {
    if (!socket || !conversation) {
      console.log('🚫 Socket or conversation not available');
      return;
    }

    console.log('🔌 Setting up socket events for conversation:', conversation.id);

    const joinRoom = () => {
      try {
        console.log('🚪 Joining conversation room:', conversation.id);
        socket.emit('join_conversation', { conversation_id: conversation.id });
      } catch (err) {
        console.warn('Failed to join conversation room', err);
      }
    };

    // Join room immediately and on reconnect
    joinRoom();
    socket.on('connect', joinRoom);

    const handleNewMessage = (newMessage: any) => {
      console.log('📨 New message received:', newMessage);
      
      setMessages(prev => {
        const exists = prev.some(msg => String(msg.id) === String(newMessage.id));
        if (exists) {
          console.log('📨 Message already exists, skipping');
          return prev;
        }
        
        console.log('📨 Adding new message to state');
        return [...prev, {
          ...newMessage,
          status: newMessage.is_read ? 'read' : 'sent'
        }];
      });

      // Mark as delivered if it's not our message
      if (newMessage.sender_id !== profile?.id && socket) {
        console.log('📬 Marking message as delivered:', newMessage.id);
        socket.emit('message_delivered', {
          message_id: newMessage.id,
          conversation_id: conversation.id
        });
      }

      scrollToBottom();
    };

    const handleTyping = (data: any) => {
      console.log('⌨️ Typing event received:', data);
      
      if (data.user_id !== conversation.other_user.id) {
        console.log('⌨️ Typing from different user, ignoring');
        return;
      }

      setTypingUser(data.username);
      setIsTyping(data.is_typing);

      if (data.is_typing) {
        console.log('⌨️ User started typing');
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          console.log('⌨️ Typing timeout - stopping');
          setIsTyping(false);
          setTypingUser('');
        }, 3000);
      } else {
        console.log('⌨️ User stopped typing');
        setIsTyping(false);
        setTypingUser('');
      }
    };

    const handleOnlineStatus = (data: any) => {
      console.log('👤 Online status update:', data);
      
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

    const handleMessageStatusUpdate = (data: any) => {
      console.log('📬 Message status update:', data);
      
      if (!data) return;
      
      setMessages(prev =>
        prev.map(msg => {
          if (String(msg.id) !== String(data.message_id)) return msg;
          
          let updatedMsg = { ...msg };
          
          if (data.status === 'delivered') {
            updatedMsg = { 
              ...msg, 
              status: 'delivered', 
              delivered_at: data.delivered_at ?? msg.delivered_at 
            };
          } else if (data.status === 'read') {
            updatedMsg = { 
              ...msg, 
              status: 'read', 
              read_at: data.read_at ?? msg.read_at, 
              is_read: true 
            };
          }
          
          console.log('📬 Updated message status:', updatedMsg);
          return updatedMsg;
        })
      );
    };

    const handleJoinedConversation = (data: any) => {
      console.log('✅ Joined conversation room:', data);
    };

    // Register all event listeners
    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleTyping);
    socket.on('user_online_status', handleOnlineStatus);
    socket.on('message_status_update', handleMessageStatusUpdate);
    socket.on('joined_conversation', handleJoinedConversation);

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up socket event listeners');
      
      socket.off('connect', joinRoom);
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleTyping);
      socket.off('user_online_status', handleOnlineStatus);
      socket.off('message_status_update', handleMessageStatusUpdate);
      socket.off('joined_conversation', handleJoinedConversation);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [socket, conversation, profile?.id]);

  // Update online status when onlineUsers changes
  useEffect(() => {
    if (conversation && onlineUsers) {
      const isOnline = onlineUsers.has(conversation.other_user.id);
      console.log('👤 Online users update:', { onlineUsers: Array.from(onlineUsers), isOnline });
      setOnlineStatus(isOnline);
    }
  }, [conversation, onlineUsers]);

  // -----------------------------
  // Typing Indicator Functions
  // -----------------------------
  const handleTypingStart = useCallback(() => {
    if (!socket || !conversation) {
      console.log('🚫 Cannot send typing start - socket or conversation not available');
      return;
    }
    
    console.log('⌨️ Sending typing start');
    socket.emit('typing', {
      conversation_id: conversation.id,
      is_typing: true
    });
  }, [socket, conversation]);

  const handleTypingStop = useCallback(() => {
    if (!socket || !conversation) {
      console.log('🚫 Cannot send typing stop - socket or conversation not available');
      return;
    }
    
    console.log('⌨️ Sending typing stop');
    socket.emit('typing', {
      conversation_id: conversation.id,
      is_typing: false
    });
  }, [socket, conversation]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    if (e.target.value.trim() && !isTyping) {
      handleTypingStart();
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 1000);
  };

  // -----------------------------
  // Swipe to Reply
  // -----------------------------
  const handleSwipeStart = (e: React.TouchEvent | React.MouseEvent, messageId: string | number) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setSwipeStartX(clientX);
    setSwipingMessageId(messageId);
    setSwipeOffset(0);
  };

  const handleSwipeMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!swipingMessageId) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const diff = clientX - swipeStartX;
    
    // Only allow left swipe (negative values)
    if (diff < 0) {
      setSwipeOffset(Math.max(diff, -80)); // Max swipe distance
    }
  };

  const handleSwipeEnd = () => {
    if (!swipingMessageId) return;
    
    // If swiped enough, set reply
    if (swipeOffset < -50) {
      const msg = messages.find(m => String(m.id) === String(swipingMessageId));
      if (msg) {
        setReplyTo(msg);
        setShowReplyPreview(true);
      }
    }
    
    // Reset swipe
    setSwipingMessageId(null);
    setSwipeOffset(0);
  };

  // -----------------------------
  // Message Functions
  // -----------------------------
  const scrollToBottom = () => {
    try {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) { /* ignore */ }
  };

  const markMessagesAsRead = useCallback((messageIds: (string | number)[]) => {
    if (!socket || !conversation) return;
    
    console.log('📖 Marking messages as read:', messageIds);
    socket.emit('read_messages', {
      conversation_id: conversation.id,
      message_ids: messageIds
    });
  }, [socket, conversation]);

  useEffect(() => {
    const unreadMessages = messages
      .filter(msg => !msg.is_read && msg.sender_id !== profile?.id)
      .map(msg => msg.id);

    if (unreadMessages.length > 0) {
      console.log('📖 Auto-marking messages as read:', unreadMessages);
      markMessagesAsRead(unreadMessages);
    }
  }, [messages, markMessagesAsRead, profile?.id]);

  const sendMessage = async () => {
    if (!message.trim() || !conversation || sending) return;

    const content = message.trim();
    setSending(true);

    try {
      handleTypingStop();

      if (socket && socketConnected) {
        console.log('📤 Sending via socket');
        socket.emit('send_message', {
          conversation_id: conversation.id,
          content,
          reply_to: replyTo ? String(replyTo.id) : null
        });
      } else {
        console.log('📤 Sending via HTTP API');
        const response = await api.post(`/chat/messages/send?${conversation.id}`, {
          content,
          reply_to: replyTo ? String(replyTo.id) : null
        });

        if (response.data.success) {
          setMessages(prev => prev.filter(m => !isTempId(m.id)));
          await fetchMessagesById(conversation.id);
          await fetchConversationById(conversation.id);
        } else {
          throw new Error('Failed to send message');
        }
      }
    } catch (err: any) {
      console.error('❌ Error sending message:', err);
      setError(err.response?.data?.message || 'Failed to send message');
      setMessages(prev => prev.filter(m => !isTempId(m.id)));
    } finally {
      setMessage('')
      cancelReply()
      setSending(false);
    }
  };

  const cancelReply = () => {
    setReplyTo(null);
    setShowReplyPreview(false);
  };

  // -----------------------------
  // Load Chat Data
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
      }
    } catch (err) {
      setError('Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChatData();
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  // -----------------------------
  // UI Render
  // -----------------------------
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-500" />
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
        <Button onClick={() => router.push('/chat')}>
          Back to Chats
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#e5ddd5] dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/chat')}
              className="hover:bg-purple-600 text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex items-center space-x-3">
              <div onClick={() => setShowUserDetails(true)} className="cursor-pointer">
                <Avatar className="h-10 w-10 border-2 border-white">
                  <AvatarImage
                    src={conversation.other_user.avatar || '/placeholder-avatar.jpg'}
                    alt={conversation.other_user.name}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                    {conversation.other_user.name?.charAt(0) || conversation.other_user.username?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white truncate">
                  {conversation.other_user.name || conversation.other_user.username}
                </h3>
                <p className="text-purple-100 text-xs">
                  {onlineStatus ? 'online' : `Last seen: ${formatLastSeen(conversation.other_user.lastSeen)}`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" className="text-white">
              <Video className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white">
              <Phone className="h-5 w-5" />
            </Button>
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
              <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
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
              const isOwn = msg.sender_id === profile?.id;
              const showDate = index === 0 || !isSameDay(msg.timestamp, messages[index - 1].timestamp);
              const isSwiping = swipingMessageId === msg.id;

              const replyPreview = msg.reply_to ? (
                <div className="mb-1 px-2 py-1 rounded bg-black/10 dark:bg-white/10 text-xs text-gray-700 dark:text-gray-300 border-l-2 border-purple-500">
                  <div className="font-medium text-xs truncate">
                    {msg.reply_to.sender_username || profile?.username}
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
                    onTouchStart={(e) => handleSwipeStart(e, msg.id)}
                    onTouchMove={handleSwipeMove}
                    onTouchEnd={handleSwipeEnd}
                    onMouseDown={(e) => handleSwipeStart(e, msg.id)}
                    onMouseMove={handleSwipeMove}
                    onMouseUp={handleSwipeEnd}
                    onMouseLeave={handleSwipeEnd}
                    style={{
                      transform: isSwiping ? `translateX(${swipeOffset}px)` : 'translateX(0)',
                      transition: isSwiping ? 'none' : 'transform 0.2s ease'
                    }}
                  >
                    <div className={`max-w-[70%] ${isOwn ? 'ml-12' : 'mr-12'}`}>
                      <div className={`relative px-3 py-2 rounded-lg ${
                        isOwn 
                          ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-br-none' 
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
                      } shadow-sm`}>
                        {replyPreview}
                        <p className="text-sm break-words leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </p>
                        <div className={`flex items-center justify-end space-x-1 mt-1 ${
                          isOwn ? 'text-purple-100' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          <span className="text-xs" style={{ fontSize: '11px' }}>
                            {formatMessageTime(msg.timestamp)}
                          </span>
                          {isOwn && (
                            <span className="flex items-center" style={{ fontSize: '11px' }}>
                              {msg.status === 'read' ? (
                                <CheckCheck size={14} className="text-white" />
                              ) : msg.status === 'delivered' ? (
                                <CheckCheck size={14} className="text-white/80" />
                              ) : (
                                <Check size={14} className="text-white/60" />
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

      {/* Reply preview */}
      {showReplyPreview && replyTo && (
        <div className="flex-none p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <div className="w-1 h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full mt-1" />
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

      {/* Input Area */}
      <div className="flex-none p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        {error && (
          <div className="mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="flex items-end space-x-2 max-w-3xl mx-auto">
          <Button variant="ghost" size="icon" className="flex-none hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400">
            <Paperclip className="h-5 w-5" />
          </Button>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              placeholder="Type a message"
              value={message}
              onChange={handleInputChange}
             
              className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm min-h-[44px] max-h-[50px] overflow-hidden"
              rows={1}
              disabled={sending}
              style={{ overflow: 'hidden' }}
            />
            <Button variant="ghost" size="icon" className="absolute right-2 bottom-2 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400">
              <Smile className="h-5 w-5" />
            </Button>
          </div>

          <Button
            onClick={sendMessage}
            disabled={!message.trim() || sending}
            size="icon"
            className="flex-none bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed h-11 w-11 rounded-full shadow-lg"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            ) : (
              <Send className="h-5 w-5 text-white" />
            )}
          </Button>
        </div>
      </div>

      {/* User Details Modal */}
      {showUserDetails && conversation && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40">
          <div className="relative z-50 bg-white dark:bg-gray-900 rounded-t-xl md:rounded-xl p-6 w-full md:w-96 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Contact Info</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowUserDetails(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex flex-col items-center space-y-4 mb-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={conversation.other_user.avatar || '/placeholder-avatar.jpg'} />
                <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xl">
                  {conversation.other_user.name?.charAt(0) || conversation.other_user.username?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
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
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Media</h4>
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