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

  const handleChatSelect = (conversationId: string) => {
    router.push(`/chat/${conversationId}`);
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.other_user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.last_message?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-pink-500" />
          <p className="text-gray-500 dark:text-gray-400">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-140px)] pb-10">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Messages</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search conversations..."
            className="pl-10 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
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

      <div className="overflow-y-auto h-full">
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
              className="p-4 border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
              onClick={() => handleChatSelect(conversation.id)}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Avatar>
                    <AvatarImage 
                      src={conversation.other_user.avatar || '/api/placeholder/40/40'} 
                      alt={conversation.other_user.name}
                    />
                    <AvatarFallback>
                      {conversation.other_user.name?.charAt(0) || conversation.other_user.username?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {conversation.other_user.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {conversation.other_user.name || conversation.other_user.username}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimestamp(conversation.last_message_at)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className={`text-sm truncate ${
                      conversation.unread_count > 0 
                        ? 'text-gray-900 dark:text-white font-medium' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {conversation.last_message || 'Start a conversation...'}
                    </p>
                    
                    {conversation.unread_count > 0 && (
                      <Badge className="bg-pink-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center">
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