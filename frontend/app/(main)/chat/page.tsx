/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(main)/chat/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
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
  unread_count: number;
  created_at: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { socket } = useSocket();

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

  useEffect(() => {
    fetchConversations();
  }, []);

  // Listen for real-time updates
  useEffect(() => {
    if (!socket) return;

    // Listen for new messages to update conversation list
    socket.on('new_message', (data: any) => {
      setConversations(prev => {
        const updated = prev.map(conv => {
          if (conv.id === data.conversation_id) {
            return {
              ...conv,
              last_message: data.content,
              last_message_at: data.timestamp,
              unread_count: data.sender_id !== conv.other_user.id ? conv.unread_count + 1 : conv.unread_count
            };
          }
          return conv;
        });

        // Move updated conversation to top
        const updatedConv = updated.find(conv => conv.id === data.conversation_id);
        if (updatedConv) {
          return [updatedConv, ...updated.filter(conv => conv.id !== data.conversation_id)];
        }
        return updated;
      });
    });

    // Listen for message status updates
    socket.on('message_status_update', (data: any) => {
      // You can update conversation status if needed
      console.log('Message status updated:', data);
    });

    // Listen for online status updates
    socket.on('user_online_status', (data: any) => {
      setConversations(prev => prev.map(conv => {
        if (conv.other_user.id === data.user_id) {
          return {
            ...conv,
            other_user: {
              ...conv.other_user,
              isOnline: data.is_online,
              lastSeen: data.last_seen
            }
          };
        }
        return conv;
      }));
    });

    return () => {
      socket.off('new_message');
      socket.off('message_status_update');
      socket.off('user_online_status');
    };
  }, [socket]);

  const handleChatSelect = (conversationId: string) => {
    // Reset unread count when opening chat
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? { ...conv, unread_count: 0 }
        : conv
    ));
    router.push(`/chat/${conversationId}`);
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      if (diffInMinutes < 1) return 'now';
      return `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.other_user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.last_message?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-green-500" />
          <p className="text-gray-500 dark:text-gray-400">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white dark:bg-gray-900">
  
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

      <div className="overflow-y-auto h-[calc(100vh-140px)]">
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
                    <AvatarFallback className="bg-green-500 text-white">
                      {conversation.other_user.name?.charAt(0) || conversation.other_user.username?.charAt(0)}
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
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {formatTimestamp(conversation.last_message_at)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className={`text-sm truncate flex-1 ${
                      conversation.unread_count > 0 
                        ? 'text-gray-900 dark:text-white font-medium' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {conversation.last_message || 'Start a conversation...'}
                    </p>
                    
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