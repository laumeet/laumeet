/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(main)/chat/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, Check, CheckCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/axio';
import { useSocket } from '@/hooks/useSocket';

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
}

export default function ChatPage() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
      setLoading(true);
      setError('');
      const response = await api.get('/chat/conversations');
      
      if (response.data.success) {
        setConversations(response.data.conversations || []);
      } else {
        setError('Failed to load conversations');
      }
    } catch (err: any) {
      console.error('Error loading conversations:', err);
      setError(err.response?.data?.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
    };
    fetchConversations();
  }, []);

  // ✅ Socket event handlers
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleConversationUpdate = (updated: Conversation) => {
      setConversations((prev) => {
        const exists = prev.find((c) => c.id === updated.id);
        if (exists) {
          return prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c));
        }
        return [updated, ...prev];
      });
    };

    const handleTyping = (data: { conversation_id: string; typing_user: string; isTyping: boolean }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === data.conversation_id
            ? { ...c, typing: data.isTyping, typing_user: data.typing_user }
            : c
        )
      );
    };

    const handleOnlineStatus = (data: { user_id: string; isOnline: boolean }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.other_user.id === data.user_id
            ? { ...c, other_user: { ...c.other_user, isOnline: data.isOnline } }
            : c
        )
      );
    };

    socket.on('conversation_update', handleConversationUpdate);
    socket.on('user_typing', handleTyping);
    socket.on('user_online_status', handleOnlineStatus);

    return () => {
      socket.off('conversation_update', handleConversationUpdate);
      socket.off('user_typing', handleTyping);
      socket.off('user_online_status', handleOnlineStatus);
    };
  }, [socket, isConnected]);

  const handleChatSelect = (conversationId: string) => {
    router.push(`/chat/${conversationId}`);
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    return isToday
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getLastMessagePreview = (conversation: Conversation) => {
    if (conversation.typing) {
      return (
        <span className="text-green-500 italic">
          {conversation.typing_user === conversation.other_user.username
            ? `${conversation.other_user.name || conversation.other_user.username} is typing...`
            : 'Typing...'}
        </span>
      );
    }
    return conversation.last_message || 'No messages yet';
  };

  const getMessageStatusIcon = (conversation: Conversation) => {
    if (!conversation.last_message_sender_id || conversation.last_message_sender_id === conversation.other_user.id)
      return null;

    if (conversation.last_message_status === 'read')
      return <CheckCheck size={14} className="text-green-500" />;
    if (conversation.last_message_status === 'delivered')
      return <Check size={14} className="text-gray-400" />;
    if (conversation.last_message_status === 'sent')
      return <Check size={14} className="text-gray-400" />;
    return null;
  };

  const filteredConversations = conversations.filter((c) =>
    c.other_user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.other_user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        <Loader2 className="animate-spin h-6 w-6 text-gray-500" />
      </div>
    );
  }

  return (
    <div className="h-screen no-scrollbar  bg-white dark:bg-gray-900">
      {/* Search Bar */}
      <div className="p-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search conversations..."
            className="pl-10 bg-gray-100 dark:bg-gray-800 border-0 focus:ring-0"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="p-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="overflow-y-auto h-[calc(100vh-80px)]">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
            <p className="text-sm">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
            {!searchQuery && (
              <p className="text-xs mt-1">Start a conversation by matching with someone!</p>
            )}
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              className="p-3 border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700"
              onClick={() => handleChatSelect(conversation.id)}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage
                      src={conversation.other_user.avatar || '/api/placeholder/40/40'}
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
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {conversation.other_user.name || conversation.other_user.username}
                    </h3>
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
                      <Badge className="bg-green-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center rounded-full">
                        {conversation.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
