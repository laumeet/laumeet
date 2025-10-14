/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Send,
  Loader2,
  CheckCheck,
  Check,
  X,
  Info,
  Lock,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import api from '@/lib/axio';
import { useSocketContext } from '@/lib/socket-context';
import { useProfile } from '@/hooks/get-profile';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { UpgradeModal, LockedContentTooltip, UpgradePrompt } from '@/components/chat/SubscriptionComponents';
import { useUsageStats } from '@/hooks/useUsageStats';

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

// Enhanced sensitive content detection patterns - VERY COMPLEX
const SENSITIVE_PATTERNS = {

  
  // Contact patterns
  PHONE: /(\+?234[\s-]?|0)?[789][01]\d{1}[\s-]?\d{3}[\s-]?\d{4}|\+\d{10,15}|\b\d{10,15}\b/g,
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Location patterns
  COORDINATES: /\b-?\d{1,3}\.\d+,\s*-?\d{1,3}\.\d+\b/g,
  ADDRESS: /\b\d+\s+(?:[A-Za-z]+\s+){1,5}(?:street|st|road|rd|avenue|ave|boulevard|blvd|lane|ln|drive|dr|court|ct|plaza|plz|square|sq)\b/gi,
  
  // Social media and platform patterns
  URL: /https?:\/\/[^\s]+|www\.[^\s]+|\.[a-z]{2,}\/[^\s]*/gi,
  SOCIAL_MEDIA: /(?:instagram|facebook|twitter|x|tiktok|snapchat|whatsapp|telegram|discord|signal|viber|wechat|line)[\s\.\/:][^\s]*/gi,
  DISCORD: /discord\.gg\/[^\s]+|discordapp\.com\/[^\s]+/gi,
  INSTAGRAM: /(?:instagram\.com\/|@)[^\s]+/gi,
  FACEBOOK: /(?:facebook\.com\/|fb\.com\/)[^\s]+/gi,
  TWITTER: /(?:twitter\.com\/|x\.com\/|@)[^\s]+/gi,
  SNAPCHAT: /snapchat\.com\/add\/[^\s]+/gi,
  TELEGRAM: /(?:t\.me\/|telegram\.me\/|@)[^\s]+/gi,
  WHATSAPP: /(?:wa\.me\/|whatsapp\.com\/)[^\s]+/gi,
  TIKTOK: /tiktok\.com\/[^\s]+/gi,
  



  COMBINED_CONTACT: /(?:\b\d{10,15}\b.*\b(?:call|text|message|contact|whatsapp|instagram|facebook|twitter|x|tiktok|snapchat|whatsapp|telegram|discord|signal|viber|wechat|line)\b)|(?:\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b.*\b(?:email|contact|reach)\b)/gi,
  
  // Advanced pattern for multiple messages combined
  MESSAGE_COMBINATION: /(?:(?:\b\d{10,18}\b|\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b|\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b|\b\d{10,15}\b).*){2,}/gi
};

// -----------------------------
// Custom Hook for Upgrade Prompts
// -----------------------------
const useUpgradePrompts = (hasSubscription: boolean, showUpgradeModal: boolean, setShowUpgradeModal: (show: boolean) => void) => {
  useEffect(() => {
    if (!hasSubscription || showUpgradeModal) return;

    const LAST_PROMPT_KEY = 'last_upgrade_prompt_time';
    const FIRST_VISIT_KEY = 'first_chat_visit_done';
    const PROMPT_INTERVAL = 10 * 60 * 1000; // 10 minutes

    // Check if this is first visit to chat
    const firstVisit = !localStorage.getItem(FIRST_VISIT_KEY);
    
    const checkAndShowPrompt = () => {
      const lastPromptTime = localStorage.getItem(LAST_PROMPT_KEY);
      const currentTime = Date.now();

      // Show immediately on first visit or if interval has passed
      if (firstVisit || !lastPromptTime || (currentTime - parseInt(lastPromptTime)) > PROMPT_INTERVAL) {
        setShowUpgradeModal(true);
        localStorage.setItem(LAST_PROMPT_KEY, currentTime.toString());
        if (firstVisit) {
          localStorage.setItem(FIRST_VISIT_KEY, 'true');
        }
      }
    };

    // Check immediately
    checkAndShowPrompt();

    // Set up interval to check every minute
    const interval = setInterval(checkAndShowPrompt, 60 * 1000);

    return () => clearInterval(interval);
  }, [hasSubscription, showUpgradeModal, setShowUpgradeModal]);
};

// -----------------------------
// Component
// -----------------------------
export default function ChatDetailPage() {
  const { profile } = useProfile();
  const { subscription } = useUserSubscription();
  const { usage, fetchUsageStats } = useUsageStats();
  const { socket, isConnected: socketConnected, onlineUsers } = useSocketContext();
  const params = useParams();
  const router = useRouter();
  const chatId = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;

  // Basic states
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState<boolean>(true);

  // Subscription states
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(true);

  // Reply states
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showReplyPreview, setShowReplyPreview] = useState(false);

  // Modal states
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showUserDetails, setShowUserDetails] = useState(false);

  // Scroll states
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollEnabledRef = useRef(true);
  const lastMessageCountRef = useRef(0);
  const initialMessagesLoadedRef = useRef(false);

  // Swipe states
  const [swipeStartX, setSwipeStartX] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipingMessageId, setSwipingMessageId] = useState<string | number | null>(null);

  // -----------------------------
  // Upgrade Prompts
  // -----------------------------
  useUpgradePrompts(hasSubscription, showUpgradeModal, setShowUpgradeModal);

  // -----------------------------
  // Subscription Management
  // -----------------------------
  useEffect(() => {
    console.log('🔔 Subscription data updated:', subscription);
    console.log('📊 Usage data:', usage);
    
    if (subscription) {
      setHasSubscription(subscription.has_subscription);
      
      // Check if user has reached message limit using usage stats
      if (usage && usage.messages) {
        const hasReachedLimit = usage.messages.remaining <= 0;
        console.log('📝 Message limit check:', {
          used: usage.messages.used,
          limit: usage.messages.limit,
          remaining: usage.messages.remaining,
          hasReachedLimit,
          hasSubscription: subscription.has_subscription
        });

        // Show upgrade modal if limit reached and no subscription
        if (hasReachedLimit && !subscription.has_subscription) {
          console.log('🔒 Showing upgrade modal - limit reached');
          setShowUpgradeModal(true);
        }
      }
      
      fetchUsageStats();
    }
  }, [subscription, usage, fetchUsageStats]);

  // Check if user can send messages using usage stats
  const canSendMessage = useCallback(() => {
    if (hasSubscription) return true;
    
    if (usage && usage.messages) {
      const canSend = usage.messages.limit <= usage.messages.used;
      return canSend;
    }
    
  }, [hasSubscription, usage]);

  // Enhanced sensitive content filtering - APPLIED WHEN RECEIVING MESSAGES
  const filterSensitiveContent = useCallback((content: string, userHasSubscription: boolean, allMessages: Message[] = []): string => {
    if (userHasSubscription) {
      return content;
    }

    let filteredContent = content;

    // Check for individual sensitive patterns
    Object.values(SENSITIVE_PATTERNS).forEach(pattern => {
      filteredContent = filteredContent.replace(pattern, '🔒');
    });

    // Advanced detection: Check if multiple messages combined could reveal sensitive info
    const recentMessages = allMessages.slice(-5).map(msg => msg.content).join(' ');
    const combinedContent = recentMessages + ' ' + content;
    
    // Check combined messages for sensitive patterns
    Object.values(SENSITIVE_PATTERNS).forEach(pattern => {
      if (pattern.test(combinedContent)) {
        filteredContent = '🔒 Only subscribed users can view this message';
      }
    });

    // Check if any sensitive content was found
    const hasSensitiveContent = filteredContent.includes('🔒');
    
    if (hasSensitiveContent && !filteredContent.includes('Only subscribed users')) {
      return '🔒 Only subscribed users can view this message';
    }

    return filteredContent;
  }, []);

  // Apply sensitive content filtering to messages for display
  const updateMessagesWithFilter = useCallback((msgs: Message[], userHasSubscription: boolean) => {
    return msgs.map(msg => ({
      ...msg,
      content: filterSensitiveContent(msg.content, userHasSubscription, msgs)
    }));
  }, [filterSensitiveContent]);

  // Apply filtering when subscription changes
  useEffect(() => {
    if (initialMessagesLoadedRef.current && messages.length > 0) {
      const filteredMessages = updateMessagesWithFilter(messages, hasSubscription);
      setMessages(filteredMessages);
    }
   }, [hasSubscription, updateMessagesWithFilter]);
  // Apply filtering on initial message load
  useEffect(() => {
    if (messages.length > 0 && !initialMessagesLoadedRef.current) {
      const filteredMessages = updateMessagesWithFilter(messages, hasSubscription);
      setMessages(filteredMessages);
      initialMessagesLoadedRef.current = true;
    }
  }, [messages.length, hasSubscription, updateMessagesWithFilter]);

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
      const response = await api.get(`/users/userId/profile?userId=${userId}`);
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
      setMessagesLoading(true);
      const response = await api.get(`/chat/messages/conversationId?conversationId=${id}`);
      if (response.data.success) {
        const serverMessages: Message[] = response.data.messages || [];
        
        const filteredMessages = serverMessages.map(msg => ({
          ...msg,
          content: filterSensitiveContent(msg.content, hasSubscription, serverMessages)
        }));
        
        setMessages(filteredMessages);
        console.log(messages)
        initialMessagesLoadedRef.current = true;
      } else {
        setError('Failed to load messages');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load messages');
    } finally {
      setMessagesLoading(false);
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
  // Socket Connection & Event Handlers
  // -----------------------------
  useEffect(() => {
    if (!socket || !conversation) {
      console.log('🚫 Socket or conversation not available');
      return;
    }

    console.log('🔌 Setting up socket events for conversation:', chatId);

    const joinRoom = () => {
      try {
        console.log('🚪 Joining conversation room:', chatId);
        socket.emit('join_conversation', { conversation_id: chatId });
      } catch (err) {
        console.warn('Failed to join conversation room', err);
      }
    };

    joinRoom();

    let reconnectTimer: NodeJS.Timeout;
    const handleReconnect = () => {
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        joinRoom();
      }, 1000);
    };

    socket.on('connect', handleReconnect);

    const handleNewMessage = (newMessage: any) => {
      console.log('📨 New message received:', newMessage);
      
      if (String(newMessage.conversation_id) !== String(chatId)) {
        console.log('📨 Message for different conversation, ignoring');
        return;
      }
      
      setMessages(prev => {
        const exists = prev.some(msg => String(msg.id) === String(newMessage.id));
        if (exists) {
          console.log('📨 Message already exists, skipping');
          return prev;
        }
        
        console.log('📨 Adding new message to state');
        const allMessages = [...prev, newMessage];
        const filteredMessage = {
          ...newMessage,
          content: filterSensitiveContent(newMessage.content, hasSubscription, allMessages),
          status: newMessage.is_read ? 'read' : (!onlineStatus ? 'sent' : 'delivered')
        };
        
        return [...prev, filteredMessage];
      });

      if (newMessage.sender_id === profile?.id && !hasSubscription && usage) {
        // Update usage stats after sending message
       fetchUsageStats()
      }

      if (newMessage.sender_id !== profile?.id && socket) {
        console.log('📬 Marking message as delivered:', newMessage.id);
        socket.emit('message_delivered', {
          message_id: newMessage.id,
          conversation_id: chatId
        });
      }
    };

    const handleTyping = (data: any) => {
      console.log('⌨️ Typing event received:', data);
      
      if (data.user_id !== conversation.other_user.id) {
        console.log('⌨️ Typing from different user, ignoring');
        return;
      }
      
      setIsTyping(data.is_typing);
      
      if (data.is_typing) {
        console.log('⌨️ User started typing');
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          console.log('⌨️ Typing timeout - stopping');
          setIsTyping(false);
        }, 3000);
      } else {
        console.log('⌨️ User stopped typing');
        setIsTyping(false);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
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

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleTyping);
    socket.on('user_online_status', handleOnlineStatus);
    socket.on('message_status_update', handleMessageStatusUpdate);
    socket.on('joined_conversation', handleJoinedConversation);

    return () => {
      console.log('🧹 Cleaning up socket event listeners');
      
      socket.off('connect', handleReconnect);
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleTyping);
      socket.off('user_online_status', handleOnlineStatus);
      socket.off('message_status_update', handleMessageStatusUpdate);
      socket.off('joined_conversation', handleJoinedConversation);
      
      clearTimeout(reconnectTimer);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current);
        typingDebounceRef.current = null;
      }
    };
  }, [socket, conversation, profile?.id, onlineStatus, hasSubscription, filterSensitiveContent, usage, chatId]);

  // Update online status when onlineUsers changes
  useEffect(() => {
    if (conversation && onlineUsers) {
      const isOnline = onlineUsers.has(conversation.other_user.id);
      console.log('👤 Online users update:', { onlineUsers: Array.from(onlineUsers), isOnline });
      setOnlineStatus(isOnline);
    }
  }, [conversation, onlineUsers]);

  // -----------------------------
  // Scroll Management
  // -----------------------------
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current) {
      try {
        messagesEndRef.current.scrollIntoView({ behavior });
        autoScrollEnabledRef.current = true;
        setShowScrollButton(false);
      } catch (err) {
        // Ignore scroll errors
      }
    }
  }, []);

  // Auto scroll to bottom on initial load and when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && !messagesLoading) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        scrollToBottom('auto');
      }, 100);
    }
  }, [messages.length, messagesLoading, scrollToBottom]);

  useEffect(() => {
    const messagesContainer = messagesContainerRef.current;
    if (!messagesContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      autoScrollEnabledRef.current = isAtBottom;
      
      // Show scroll button when not at bottom and there are enough messages
      setShowScrollButton(!isAtBottom && messages.length > 5);
    };

    messagesContainer.addEventListener('scroll', handleScroll);
    return () => messagesContainer.removeEventListener('scroll', handleScroll);
  }, [messages.length]);

  // Auto scroll when typing indicator is shown
  useEffect(() => {
     const messagesContainer = messagesContainerRef.current;
      if (!messagesContainer) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    if (isTyping && isAtBottom && autoScrollEnabledRef.current) {
      scrollToBottom('smooth');
    }
  }, [isTyping, scrollToBottom]);

  // -----------------------------
  // Typing Indicator Functions - FIXED
  // -----------------------------
  const handleTypingStart = useCallback(() => {
    if (!socket || !conversation) {
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
      return;
    }
    console.log('⌨️ Sending typing stop');
    socket.emit('typing', {
      conversation_id: conversation.id,
      is_typing: false
    });
  }, [socket, conversation]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setMessage(newValue);

    // Clear existing debounce timeout
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
    }

    // Start typing if there's content
    if (newValue.trim() && !isTyping) {
      typingDebounceRef.current = setTimeout(() => {
        handleTypingStart();
      }, 300);
    }

    // Clear existing stop timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 1 second of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 1000);
  };

  // -----------------------------
  // Textarea Height Management
  // -----------------------------
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 88);
      textareaRef.current.style.height = `${newHeight}px`;
      
      textareaRef.current.style.overflowY = newHeight >= 88 ? 'auto' : 'hidden';
    }
  }, [message]);

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
    
    if (diff < 0) {
      setSwipeOffset(Math.max(diff, -80));
    }
  };

  const handleSwipeEnd = () => {
    if (!swipingMessageId) return;
    
    if (swipeOffset < -50) {
      const msg = messages.find(m => String(m.id) === String(swipingMessageId));
      if (msg) {
        setReplyTo(msg);
        setShowReplyPreview(true);
      }
    }
    
    setSwipingMessageId(null);
    setSwipeOffset(0);
  };

  // -----------------------------
  // Message Functions
  // -----------------------------
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

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (!message.trim() || !conversation || sending) return;
    
    if (!canSendMessage()) {
      setShowUpgradeModal(true);
      return;
    }

    const contentToSend = message.trim();
    
    setSending(true);

    setMessage('');
    setReplyTo(null);
    setShowReplyPreview(false);

    try {
      handleTypingStop();
      
      if (socket && socketConnected) {
        console.log('📤 Sending via socket');
        socket.emit('send_message', {
          conversation_id: chatId,
          content: contentToSend,
          reply_to: replyTo ? String(replyTo.id) : null
        });

        fetchUsageStats()
    
      } else {
        console.log('📤 Sending via HTTP API - socket not available');
        const response = await api.post(`/chat/messages/send?conversationId=${chatId}`, {
          conversation_id: chatId,
          content: contentToSend,
          reply_to: replyTo ? String(replyTo.id) : null
        });
        
        if (response.data.success) {
          setMessages(prev => prev.filter(m => !isTempId(m.id)));
          await fetchMessagesById(conversation.id);
          await fetchConversationById(conversation.id);
          
         fetchUsageStats()
        } else {
          throw new Error('Failed to send message');
        }
      }
    } catch (err: any) {
      console.error('❌ Error sending message:', err);
      setError(err.response?.data?.message || 'Failed to send message');
      setMessages(prev => prev.filter(m => !isTempId(m.id)));
    } finally {
      setSending(false);
    }
  };

  const cancelReply = () => {
    setReplyTo(null);
    setShowReplyPreview(false);
  };

  const handleUpgrade = () => {
    setShowUpgradeModal(false);
    router.push('/subscription');
  };

  // Handle input field click - show upgrade modal if no remaining messages
  const handleInputClick = () => {
    if (!canSendMessage()) {
      setShowUpgradeModal(true);
    }
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

  // -----------------------------
  // UI Components
  // -----------------------------
  const TypingBubble = () => (
    <div className="flex justify-start">
      <div className="max-w-[70px] mr-12">
        <div className="bg-white dark:bg-gray-700 px-3 py-2 rounded-lg rounded-bl-none shadow-sm">
          <div className="flex items-center space-x-1">
            <div className="flex space-x-1">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // -----------------------------
  // UI Render
  // -----------------------------
  if (loading || messagesLoading) {
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
      {/* Header - Fixed at top */}
      <div className="flex-none bg-gradient-to-r from-pink-500 to-purple-600 text-white">
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
                    alt={conversation.other_user.username}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-to-r from-pink-500 capitalize to-purple-600 text-white">
                    {conversation.other_user.username?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold capitalize text-white truncate">
                  {conversation.other_user.username}
                </h3>
                <p className="text-purple-100 text-xs">
                  {onlineStatus ? 'online' : `Last seen: ${formatLastSeen(conversation.other_user.lastSeen)}`}
                </p>
              </div>
            </div>
          </div>

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

      {/* Messages Area - Flexible middle section */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto bg-[#e5ddd5] dark:bg-gray-800 bg-chat-background bg-repeat bg-center relative"
        style={{ backgroundImage: 'url(/chat-bg.png)' }}
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
              const isLockedContent = msg.content.includes('🔒');

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
                      } shadow-sm ${isLockedContent ? 'opacity-80' : ''}`}>
                        {replyPreview}
                        <p className="text-sm break-words leading-relaxed whitespace-pre-wrap">
                          {isLockedContent ? (
                            <LockedContentTooltip message="Upgrade to view sensitive content">
                              <span className="flex items-center gap-1 text-gray-500 italic">
                                <Lock className="h-3 w-3" />
                                {msg.content}
                              </span>
                            </LockedContentTooltip>
                          ) : (
                            msg.content
                          )}
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
                                <CheckCheck size={14} className="text-blue-300" />
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
      {isTyping && <TypingBubble />}
      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={() => {scrollToBottom('smooth');setShowScrollButton(false)}}
          className="absolute bottom-4 right-4 z-10 bg-white dark:bg-gray-700 rounded-full p-2 shadow-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        >
          <ChevronDown className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </button>
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

      {/* Input Area - Fixed at bottom */}
      <div className="flex-none p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        {error && (
          <div className="mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {!canSendMessage() && (
          <UpgradePrompt onUpgrade={() => setShowUpgradeModal(true)} />
        )}

        <form onSubmit={sendMessage} className="max-w-3xl mx-auto">
          <div className="flex items-end space-x-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                placeholder={!canSendMessage() ? "Upgrade to continue messaging" : "Type a message"}
                value={message}
                onChange={handleInputChange}
                onClick={handleInputClick}
                className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm min-h-[44px] max-h-[88px] overflow-y-auto disabled:opacity-50 disabled:cursor-not-allowed"
                rows={1}
                disabled={sending || !canSendMessage()}
                style={{ 
                  lineHeight: '1.25rem'
                }}
              />
            </div>

            <Button
              type="submit"
              disabled={!message.trim() || sending || !canSendMessage()}
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
        </form>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        messageLimit={usage?.messages?.limit || 50}
        messagesUsed={usage?.messages?.used || 0}
        onUpgrade={handleUpgrade}
      />

      {/* Lightbox Modal */}
      {lightboxOpen && userProfile?.pictures && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          <div className="relative max-w-4xl max-h-full">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
            
            <img
              src={userProfile.pictures[lightboxIndex]}
              alt={`Photo ${lightboxIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
            
            {userProfile.pictures.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                {userProfile.pictures.map((_, index) => (
                  <button
                    key={index}
                    className={`w-3 h-3 rounded-full ${
                      index === lightboxIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                    onClick={() => setLightboxIndex(index)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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
                <AvatarFallback className="bg-gradient-to-r capitalize from-pink-500 to-purple-600 text-white text-xl">
                  { conversation.other_user.username?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h3 className="font-semibold text-lg capitalize">{conversation.other_user.name || conversation.other_user.username}</h3>
                <p className="text-sm text-gray-500 capitalize">@{conversation.other_user.username}</p>
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
                            setShowUserDetails(false)
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