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

export default function ChatPage() {
  const router = useRouter();
  const { socket, isConnected, onlineUsers, connectionError } = useSocketContext();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedConversations, setPinnedConversations] = useState<Set<string>>(new Set());

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

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/chat/conversations');
      
      if (response.data.success) {
        const conversationsData = response.data.conversations || [];
        
        // Update online status and pinned status
        const updatedConversations = conversationsData.map((conv: Conversation) => ({
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
  }, [onlineUsers, pinnedConversations]);

  // Initial fetch and refetch when socket connects
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Refetch conversations when socket connects
  useEffect(() => {
    if (isConnected) {
      console.log('🔄 Socket connected, refreshing conversations...');
      fetchConversations();
    }
  }, [isConnected, fetchConversations]);

  // Socket event handlers for real-time updates - FIXED VERSION
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
          
          const updatedConversation: Conversation = {
            ...conversation,
            last_message: message.content,
            last_message_at: message.timestamp,
            last_message_id: message.id,
            last_message_sender_id: message.sender_id,
            last_message_status: "sent",
            unread_count: message.sender_id !== conversation.other_user.id ? 
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
      setConversations(prev => {
        const exists = prev.find(c => c.id === updatedConv.id);
        if (exists) {
          return prev.map(c => 
            c.id === updatedConv.id 
              ? { ...c, ...updatedConv, isPinned: pinnedConversations.has(updatedConv.id) }
              : c
          );
        }
        // If it's a new conversation, add it to the top
        return [{ ...updatedConv, isPinned: pinnedConversations.has(updatedConv.id) }, ...prev];
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

    // Handle connection success
    const handleConnectionSuccess = (data: any) => {
      console.log('✅ Socket connection authenticated in list:', data);
    };

    // Register event listeners
    socket.on('new_message', handleNewMessage);
    socket.on('conversation_update', handleConversationUpdate);
    socket.on('user_typing', handleTyping);
    socket.on('user_online_status', handleOnlineStatus);
    socket.on('message_status_update', handleMessageStatusUpdate);
    socket.on('connection_success', handleConnectionSuccess);

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up socket event listeners from chat list');
      socket.off('new_message', handleNewMessage);
      socket.off('conversation_update', handleConversationUpdate);
      socket.off('user_typing', handleTyping);
      socket.off('user_online_status', handleOnlineStatus);
      socket.off('message_status_update', handleMessageStatusUpdate);
      socket.off('connection_success', handleConnectionSuccess);
    };
  }, [socket, isConnected, pinnedConversations, fetchConversations]);

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
    // This would need to be adjusted based on how you identify the current user
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
    <div className="h-screen bg-white dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r  text-white px-4 py-6">
   
        
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

      {/* Connection Status */}
      <div className={`px-4 py-2 text-xs text-center ${
        isConnected ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
      }`}>
        {isConnected ? '✅ Connected to chat' : '🔄 Connecting to chat...'}
        {connectionError && (
          <div className="mt-1 text-red-600">
            {connectionError}
          </div>
        )}
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
          filteredConversations.map((conversation) => (
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
                    <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                      {conversation.other_user.name?.charAt(0) ||
                        conversation.other_user.username?.charAt(0)}
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
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {conversation.other_user.name || conversation.other_user.username}
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
                      }`}
                    >
                      {getLastMessagePreview(conversation)}
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
                    <DropdownMenuItem className="text-red-600">
                      Delete chat
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}