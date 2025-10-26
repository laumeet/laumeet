/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(main)/chat/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Check, CheckCheck, MoreVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import api from '@/lib/axio';
import { useSocketContext } from '@/lib/socket-context';
import { useProfile } from '@/hooks/get-profile';
import { useCurrentUserSubscription } from '@/hooks/useCurrentUserSubscription';

export interface Conversation {
  id: string;
  other_user: {
    id: string;
    username: string;
    name: string;
    avatar: string | null;
    isOnline: boolean;
    lastSeen: string | null;
  };
  last_message: string | null;
  last_message_at: string | null;
  last_message_id: string | null;
  last_message_sender_id: string | null;
  last_message_status: 'sent' | 'delivered' | 'read' | null;
  unread_count: number;
  created_at: string;
  typing?: boolean;
  typing_user?: string;
  isPinned?: boolean;
}

// ENHANCED SENSITIVE CONTENT DETECTION PATTERNS - UPDATED FOR SMART FILTERING
const SENSITIVE_PATTERNS = {
  // Enhanced phone number patterns
  PHONE: /(\+?234[\s-]?|0)?[789][01]\d{1}[\s-]?\d{3}[\s-]?\d{4}|\+\d{10,15}|\b\d{4,15}\b/g,

  // Email patterns
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // Location patterns
  COORDINATES: /\b-?\d{1,3}\.\d+,\s*-?\d{1,3}\.\d+\b/g,
  ADDRESS: /\b\d+\s+(?:[A-Za-z]+\s+){1,5}(?:street|st|road|rd|avenue|ave|boulevard|blvd|lane|ln|drive|dr|court|ct|plaza|plz|square|sq|hostel|apartment|apt|building|bldg|house)\b/gi,

  // Social media and platform patterns - ENHANCED
  URL: /https?:\/\/[^\s]+|www\.[^\s]+|\.[a-z]{2,}\/[^\s]*/gi,

  // Social media names with variations and common bypass attempts
  SOCIAL_MEDIA_NAMES: /\b(?:whatsapp|whats app|whats\.app|wh@tsapp|wh@ts@pp|whtasapp|whatsap|whatsappp|telegram|telegran|telegramm|teligram|tele gram|telegrm|telgram|facebook|face book|fb|facebok|facebookk|f@cebook|instagram|insta|instagrm|instgram|instagran|insta gram|ingstagram|twitter|x|twiter|twittr|twtter|twiter|tweet|tiktok|tik tok|tikt0k|tik-tok|snapchat|snap chat|snapchat|sc|snapch@t|discord|discrod|discordd|d!scord|disc0rd|signal|signl|sign@l|signal|viber|vib3r|viberr|wechat|we chat|wech@t|line|lin3|linee)\b/gi,

  // Social media handles and URLs
  DISCORD: /discord\.gg\/[^\s]+|discordapp\.com\/[^\s]+/gi,
  INSTAGRAM: /(?:instagram\.com\/|@)[^\s]+/gi,
  FACEBOOK: /(?:facebook\.com\/|fb\.com\/)[^\s]+/gi,
  TWITTER: /(?:twitter\.com\/|x\.com\/|@)[^\s]+/gi,
  SNAPCHAT: /snapchat\.com\/add\/[^\s]+/gi,
  TELEGRAM: /(?:t\.me\/|telegram\.me\/|@)[^\s]+/gi,
  WHATSAPP: /(?:wa\.me\/|whatsapp\.com\/)[^\s]+/gi,
  TIKTOK: /tiktok\.com\/[^\s]+/gi,

  // Number word replacements (like "zero eight zero")
  NUMBER_WORDS: /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)\b/gi,

  // Spaced out text detection
  SPACED_TEXT: /(\w\s+){3,}\w/g,

  // Combined contact pattern
  COMBINED_CONTACT: /(?:\b\d{4,15}\b.*\b(?:call|text|message|contact|whatsapp|instagram|facebook|twitter|x|tiktok|snapchat|telegram|discord|signal|viber|wechat|line)\b)|(?:\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b.*\b(?:email|contact|reach)\b)/gi,
};

/**
 * Detects and replaces sensitive content with hashes for free users
 * Only filters sensitive parts, keeps the rest of the message intact
 */
const filterSensitiveContent = (content: string, userHasSubscription: boolean): string => {
  if (userHasSubscription || !content) {
    return content;
  }

  let filteredContent = content;

  // Helper function to replace matches with hashes
  const replaceWithHashes = (text: string, pattern: RegExp): string => {
    return text.replace(pattern, (match) => {
      // For longer patterns like phone numbers, emails, etc., use full hash
      if (match.length >= 4) {
        return '#####';
      }
      // For shorter patterns, preserve some context but still hash
      return '###';
    });
  };

  // 1. First, detect and hash phone numbers (including disguised ones)
  filteredContent = replaceWithHashes(filteredContent, SENSITIVE_PATTERNS.PHONE);

  // 2. Detect and hash emails
  filteredContent = replaceWithHashes(filteredContent, SENSITIVE_PATTERNS.EMAIL);

  // 3. Detect and hash social media names with variations
  filteredContent = replaceWithHashes(filteredContent, SENSITIVE_PATTERNS.SOCIAL_MEDIA_NAMES);

  // 4. Detect and hash social media URLs and handles
  filteredContent = replaceWithHashes(filteredContent, SENSITIVE_PATTERNS.INSTAGRAM);
  filteredContent = replaceWithHashes(filteredContent, SENSITIVE_PATTERNS.FACEBOOK);
  filteredContent = replaceWithHashes(filteredContent, SENSITIVE_PATTERNS.TWITTER);
  filteredContent = replaceWithHashes(filteredContent, SENSITIVE_PATTERNS.WHATSAPP);
  filteredContent = replaceWithHashes(filteredContent, SENSITIVE_PATTERNS.TELEGRAM);
  filteredContent = replaceWithHashes(filteredContent, SENSITIVE_PATTERNS.DISCORD);
  filteredContent = replaceWithHashes(filteredContent, SENSITIVE_PATTERNS.SNAPCHAT);
  filteredContent = replaceWithHashes(filteredContent, SENSITIVE_PATTERNS.TIKTOK);

  // 5. Detect and hash addresses and locations
  filteredContent = replaceWithHashes(filteredContent, SENSITIVE_PATTERNS.ADDRESS);

  // 6. Detect and hash general URLs
  filteredContent = replaceWithHashes(filteredContent, SENSITIVE_PATTERNS.URL);

  // 7. Advanced: Detect number words (like "zero eight zero")
  filteredContent = replaceWithHashes(filteredContent, SENSITIVE_PATTERNS.NUMBER_WORDS);

  // 8. Detect combined contact patterns
  filteredContent = replaceWithHashes(filteredContent, SENSITIVE_PATTERNS.COMBINED_CONTACT);

  return filteredContent;
};

export default function ChatPage() {
  const router = useRouter();
  const { socket, isConnected, onlineUsers } = useSocketContext();
  const { profile } = useProfile();
  const { subscription } = useCurrentUserSubscription(profile?.id);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedConversations, setPinnedConversations] = useState<Set<string>>(new Set());
  const [hasSubscription, setHasSubscription] = useState(false);
 
  // Update subscription status
  useEffect(() => {
    if (subscription) {
      setHasSubscription(subscription.has_subscription);
    }
  }, [subscription]);

  // Load pinned conversations from localStorage
  useEffect(() => {
    const pinned = localStorage.getItem('pinned-conversations');
    if (pinned) {
      try {
        setPinnedConversations(new Set(JSON.parse(pinned)));
      } catch (err) {
        console.error('Error loading pinned conversations:', err);
      }
    }
  }, []);

  // Save pinned conversations to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('pinned-conversations', JSON.stringify(Array.from(pinnedConversations)));
    } catch (err) {
      console.error('Error saving pinned conversations:', err);
    }
  }, [pinnedConversations]);

  // Apply sensitive content filtering to conversations
  const filterConversationContent = useCallback((conversationsData: Conversation[], userHasSubscription: boolean) => {
    return conversationsData.map((conv: Conversation) => ({
      ...conv,
      last_message: conv.last_message ? filterSensitiveContent(conv.last_message, userHasSubscription) : null,
    }));
  }, []);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/chat/conversations');
      
      if (response.data.success) {
        const conversationsData = response.data.conversations || [];
        
        // Apply sensitive content filtering
        const filteredConversations = filterConversationContent(conversationsData, hasSubscription);
        
        // Update online status and pinned status
        const updatedConversations = filteredConversations.map((conv: Conversation) => ({
          ...conv,
          other_user: {
            ...conv.other_user,
            isOnline: onlineUsers.has(conv.other_user.id)
          },
          isPinned: pinnedConversations.has(conv.id)
        }));

        // Sort: pinned first, then by last message time
        const sortedConversations = updatedConversations.sort((a: Conversation, b: Conversation) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          const aTime = new Date(a.last_message_at || a.created_at).getTime();
          const bTime = new Date(b.last_message_at || b.created_at).getTime();
          return bTime - aTime;
        });

        console.log('📋 Loaded conversations:', sortedConversations.length);
        setConversations(sortedConversations);
      } else {
        setError('Failed to load conversations');
      }
    } catch (err: any) {
      console.error('Error loading conversations:', err);
      setError(err.response?.data?.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [onlineUsers, pinnedConversations, hasSubscription, filterConversationContent]);

  // Re-filter conversations when subscription changes
  useEffect(() => {
    if (conversations.length > 0) {
      const filteredConversations = filterConversationContent(conversations, hasSubscription);
      setConversations(filteredConversations);
    }
  }, [hasSubscription, filterConversationContent, conversations.length]);

  // Initial fetch
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Socket event handlers for real-time updates
  useEffect(() => {
    if (!socket || !isConnected) {
      console.log('🚫 Socket not available, skipping event listeners');
      return;
    }

    console.log('🔌 Setting up socket event listeners for chat page');

    // Handle new message
    const handleNewMessage = (message: any) => {
      console.log('📨 New message received in list:', message);
      
      setConversations(prev => {
        const existingConvIndex = prev.findIndex(c => c.id === message.conversation_id);
        
        if (existingConvIndex !== -1) {
          // Update existing conversation
          const updated = [...prev];
          const conversation = updated[existingConvIndex];
          
          // Apply sensitive content filtering to the new message
          const filteredMessage = filterSensitiveContent(message.content, hasSubscription);
          
          const updatedConversation: Conversation = {
            ...conversation,
            last_message: filteredMessage,
            last_message_at: message.timestamp,
            last_message_id: message.id,
            last_message_sender_id: message.sender_id,
            last_message_status: "sent",
            unread_count: message.sender_id === conversation.other_user.id ? 
              conversation.unread_count + 1 : conversation.unread_count
          };

          console.log('📨 Updated conversation:', updatedConversation);
          // Remove from current position and add to top
          updated.splice(existingConvIndex, 1);
          return [updatedConversation, ...updated];
        } else {
          // New conversation - fetch the updated list
          console.log('🆕 New conversation detected, refreshing list...');
          setTimeout(() => fetchConversations(), 100);
          return prev;
        }
      });
    };

    // Handle conversation updates
    const handleConversationUpdate = (updatedConv: Conversation) => {
      console.log('🔄 Conversation update received:', updatedConv);
      
      // Apply sensitive content filtering to the updated conversation
      const filteredConv = {
        ...updatedConv,
        last_message: updatedConv.last_message ? filterSensitiveContent(updatedConv.last_message, hasSubscription) : null,
      };
      
      setConversations(prev => {
        const exists = prev.find(c => c.id === filteredConv.id);
        if (exists) {
          return prev.map(c => 
            c.id === filteredConv.id 
              ? { ...c, ...filteredConv, isPinned: pinnedConversations.has(filteredConv.id) }
              : c
          );
        }
        // If it's a new conversation, add it to the top
        return [{ ...filteredConv, isPinned: pinnedConversations.has(filteredConv.id) }, ...prev];
      });
    };

    // Handle typing indicators
    const handleTyping = (data: { 
      conversation_id: string; 
      user_id: string;
      username: string;
      is_typing: boolean;
    }) => {
      console.log('⌨️ Typing indicator in list:', data);
      setConversations(prev =>
        prev.map(c =>
          c.id === data.conversation_id
            ? { 
                ...c, 
                typing: data.is_typing, 
                typing_user: data.username 
              }
            : c
        )
      );

      // Auto-clear typing after 3 seconds
      if (data.is_typing) {
        setTimeout(() => {
          setConversations(prev =>
            prev.map(c =>
              c.id === data.conversation_id && c.typing
                ? { ...c, typing: false, typing_user: undefined }
                : c
            )
          );
        }, 3000);
      }
    };

    // Handle online status updates
    const handleOnlineStatus = (data: { 
      user_id: string; 
      is_online: boolean;
      username: string;
    }) => {
      console.log('👤 Online status update in list:', data);
      setConversations(prev =>
        prev.map(c =>
          c.other_user.id === data.user_id
            ? { 
                ...c, 
                other_user: { 
                  ...c.other_user, 
                  isOnline: data.is_online 
                } 
              }
            : c
        )
      );
    };

    // Handle message status updates
    const handleMessageStatusUpdate = (data: {
      message_id: string;
      conversation_id: string;
      status: 'delivered' | 'read';
    }) => {
      console.log('📬 Message status update in list:', data);
      setConversations(prev =>
        prev.map(c => {
          if (c.id === data.conversation_id && c.last_message_id === data.message_id) {
            return {
              ...c,
              last_message_status: data.status
            };
          }
          return c;
        })
      );
    };

    // Register event listeners
    socket.on('new_message', handleNewMessage);
    socket.on('conversation_update', handleConversationUpdate);
    socket.on('user_typing', handleTyping);
    socket.on('user_online_status', handleOnlineStatus);
    socket.on('message_status_update', handleMessageStatusUpdate);

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up socket event listeners from chat list');
      socket.off('new_message', handleNewMessage);
      socket.off('conversation_update', handleConversationUpdate);
      socket.off('user_typing', handleTyping);
      socket.off('user_online_status', handleOnlineStatus);
      socket.off('message_status_update', handleMessageStatusUpdate);
    };
  }, [socket, isConnected, pinnedConversations, fetchConversations, hasSubscription]);

  // Update conversations when onlineUsers changes
  useEffect(() => {
    console.log('👥 Online users changed:', Array.from(onlineUsers));
    setConversations(prev =>
      prev.map(conv => ({
        ...conv,
        other_user: {
          ...conv.other_user,
          isOnline: onlineUsers.has(conv.other_user.id)
        }
      }))
    );
  }, [onlineUsers]);

  const handleChatSelect = (conversationId: string) => {
    console.log('💬 Selecting conversation:', conversationId);
    router.push(`/chat/${conversationId}`);
  };

  const togglePinConversation = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newPinned = new Set(pinnedConversations);
    if (newPinned.has(conversationId)) {
      newPinned.delete(conversationId);
    } else {
      newPinned.add(conversationId);
    }
    setPinnedConversations(newPinned);
    
    // Update local state
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, isPinned: newPinned.has(conversationId) }
          : conv
      ).sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const aTime = new Date(a.last_message_at || a.created_at).getTime();
        const bTime = new Date(b.last_message_at || b.created_at).getTime();
        return bTime - aTime;
      })
    );
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString();
      
      if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (isYesterday) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    } catch (err) {
      console.error('Error formatting timestamp:', err);
      return '';
    }
  };

  const getLastMessagePreview = (conversation: Conversation) => {
    if (conversation.typing) {
      return (
        <span className="text-purple-500 italic">
          {conversation.typing_user === conversation.other_user.username
            ? `${conversation.other_user.name || conversation.other_user.username} is typing...`
            : 'Typing...'}
        </span>
      );
    }
    
    // Check if the last message was sent by the current user
    const isCurrentUserMessage = conversation.last_message_sender_id && 
                                 conversation.last_message_sender_id !== conversation.other_user.id;
    
    if (isCurrentUserMessage) {
      return `You: ${conversation.last_message}`;
    }
    
    return conversation.last_message || 'No messages yet';
  };

  const getMessageStatusIcon = (conversation: Conversation) => {
    // Only show status for messages sent by current user
    const isCurrentUserMessage = conversation.last_message_sender_id && 
                                 conversation.last_message_sender_id !== conversation.other_user.id;
    
    if (!isCurrentUserMessage) return null;

    if (conversation.last_message_status === 'read')
      return <CheckCheck size={14} className="text-purple-500" />;
    if (conversation.last_message_status === 'delivered')
      return <Check size={14} className="text-gray-400" />;
    if (conversation.last_message_status === 'sent')
      return <Check size={14} className="text-gray-400" />;
    return null;
  };

  const markConversationAsRead = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.post(`/chat/conversations/${conversationId}/mark_read`);
      // Update local state to reflect read status
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
    } catch (err) {
      console.error('Error marking conversation as read:', err);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.other_user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.other_user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.last_message?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="animate-spin h-8 w-8 text-purple-500" />
          <p className="text-gray-500 dark:text-gray-400">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[80vh] overflow-y-auto pb-32 flex flex-col">
      {/* Header */}
      <div className=" text-white px-4 py-4">

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search conversations..."
            className="pl-10 bg-white/20 backdrop-blur-sm border-0 text-white placeholder-gray-200 focus:ring-0 focus:bg-white/30"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="p-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            <button 
              onClick={() => fetchConversations()}
              className="mt-2 text-xs bg-red-100 dark:bg-red-800 px-2 py-1 rounded"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
            <p className="text-sm">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
            {!searchQuery && (
              <p className="text-xs mt-1 text-center px-4">
                Start a conversation by matching with someone!
              </p>
            )}
          </div>
        ) : (
          filteredConversations.map((conversation) => {
            const hasLockedContent = conversation.last_message?.includes('#####') || conversation.last_message?.includes('###');
            
            return (
              <div
                key={conversation.id}
                className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700"
                onClick={() => handleChatSelect(conversation.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={conversation.other_user.avatar || '/placeholder-avatar.jpg'}
                        alt={conversation.other_user.name}
                      />
                      <AvatarFallback className="bg-gradient-to-r capitalize from-pink-500 to-purple-600 text-white">
                        {conversation.other_user.username?.charAt(0)} 
                      </AvatarFallback>
                    </Avatar>
                    {conversation.other_user.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        {conversation.isPinned && (
                          <span className="text-purple-500" title="Pinned conversation">📌</span>
                        )}
                        <h3 className="font-semibold capitalize text-gray-900 dark:text-white truncate">
                          {conversation.other_user.username}
                        </h3>
                      </div>
                      <div className="flex items-center space-x-1">
                        {getMessageStatusIcon(conversation)}
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {formatTimestamp(conversation.last_message_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div
                        className={`text-sm truncate flex-1 ${
                          conversation.unread_count > 0
                            ? 'text-gray-900 dark:text-white font-medium'
                            : 'text-gray-500 dark:text-gray-400'
                        } ${hasLockedContent ? 'italic' : ''}`}
                      >
                        {hasLockedContent ? (
                          <span className="text-gray-400 italic">
                            {conversation.last_message}
                            {!hasSubscription && (
                              <span className="text-xs text-purple-500 ml-1">🔒</span>
                            )}
                          </span>
                        ) : (
                          getLastMessagePreview(conversation)
                        )}
                      </div>

                      {conversation.unread_count > 0 && (
                        <Badge className="bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs min-w-[20px] h-5 flex items-center justify-center rounded-full">
                          {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Context Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button 
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        <MoreVertical size={16} className="text-gray-500" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => togglePinConversation(conversation.id, e)}>
                        {conversation.isPinned ? 'Unpin chat' : 'Pin chat'}
                      </DropdownMenuItem>
                      {conversation.unread_count > 0 && (
                        <DropdownMenuItem onClick={(e) => markConversationAsRead(conversation.id, e)}>
                          Mark as read
                        </DropdownMenuItem>
                      )}
                     
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}