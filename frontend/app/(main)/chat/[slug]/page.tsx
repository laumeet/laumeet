/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(main)/chat/[id]/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Paperclip, Smile, Shield, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import api from '@/lib/axio';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_username: string;
  content: string;
  is_read: boolean;
  timestamp: string;
  delivered_at: string | null;
  read_at: string | null;
  status: 'sent' | 'delivered' | 'read';
}

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
}

export default function ChatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [showSecurityAlert, setShowSecurityAlert] = useState(false);
  const [securityAlertMessage, setSecurityAlertMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // FIX: Use params?.slug instead of params?.id
  const chatId = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;

  console.log('Chat ID from params:', chatId); // Debug log

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversation = async () => {
    if (!chatId) {
      console.log('No chatId provided');
      return null;
    }

    try {
      console.log('Fetching conversations...');
      const response = await api.get('/chat/conversations');
      console.log('Conversations response:', response.data);
      
      if (response.data.success) {
        const conversations = response.data.conversations || [];
        console.log('Available conversations:', conversations);
        
        const currentConv = conversations.find((conv: Conversation) => conv.id === chatId);
        console.log('Found conversation:', currentConv);
        
        if (!currentConv) {
          console.log('Conversation not found for ID:', chatId);
          setError('Chat not found');
          return null;
        }
        
        setConversation(currentConv);
        return currentConv;
      } else {
        console.log('Failed to fetch conversations');
        setError('Failed to load conversations');
        return null;
      }
    } catch (err: any) {
      console.error('Error fetching conversation:', err);
      setError('Failed to load conversation');
      return null;
    }
  };

  const fetchMessages = async () => {
    if (!chatId) return;

    try {
      console.log('Fetching messages for chat:', chatId);
      const response = await api.get(`/chat/messages/${chatId}`);
      console.log('Messages response:', response.data);
      
      if (response.data.success) {
        setMessages(response.data.messages || []);
      } else {
        setError('Failed to load messages');
      }
    } catch (err: any) {
      console.error('Error fetching messages:', err);
      setError(err.response?.data?.message || 'Failed to load messages');
    }
  };

  const loadChatData = async () => {
    if (!chatId) {
      console.log('No chatId, redirecting to /chat');
      router.push('/chat');
      return;
    }

    try {
      setLoading(true);
      setError('');
      console.log('Loading chat data for:', chatId);
      
      // First verify the conversation exists
      const conv = await fetchConversation();
      if (conv) {
        // Then load messages
        await fetchMessages();
      } else {
        console.log('No conversation found, setting loading to false');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error loading chat:', err);
      setError('Failed to load chat');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChatData();
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const censorSensitiveInfo = (text: string): { content: string; hasSensitiveInfo: boolean } => {
    let hasSensitiveInfo = false;
    let censoredText = text;

    const patterns = {
      phone: /\b(\+?[\d\s\-\(\)]{10,15})\b/g,
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      url: /(https?:\/\/[^\s]+|www\.[^\s]+)/gi,
      socialMedia: /\b(instagram|facebook|fb|twitter|x|tiktok|snapchat|telegram|whatsapp|signal|discord|reddit|linkedin)\b/gi,
      externalRequests: /\b(move to|switch to|contact me on|dm me on|hit me up on|add me on|find me on)\s+[a-zA-Z0-9]+\b/gi
    };

    Object.entries(patterns).forEach(([key, pattern]) => {
      censoredText = censoredText.replace(pattern, (match) => {
        hasSensitiveInfo = true;
        if (key === 'email') {
          const [local, domain] = match.split('@');
          return local.charAt(0) + '#'.repeat(local.length - 1) + '@' + domain;
        } else if (key === 'externalRequests') {
          const words = match.split(' ');
          const lastWord = words[words.length - 1];
          return words.slice(0, -1).join(' ') + ' #' + '#'.repeat(lastWord.length - 1);
        } else {
          return '#' + '#'.repeat(Math.min(match.length - 1, 10));
        }
      });
    });

    return { content: censoredText, hasSensitiveInfo };
  };

  const detectSensitivePatterns = (text: string): string[] => {
    const detectedPatterns: string[] = [];

    const patterns = {
      phone: { regex: /\b(\+?[\d\s\-\(\)]{10,15})\b/g, name: 'Phone number' },
      email: { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, name: 'Email address' },
      url: { regex: /(https?:\/\/[^\s]+|www\.[^\s]+)/gi, name: 'Website link' },
      socialMedia: { regex: /\b(instagram|facebook|fb|twitter|x|tiktok|snapchat|telegram|whatsapp|signal|discord|reddit|linkedin)\b/gi, name: 'Social media platform' },
      externalRequest: { regex: /\b(move to|switch to|contact me on|dm me on|hit me up on|add me on|find me on)\s+[a-zA-Z0-9]+\b/gi, name: 'External platform request' }
    };

    Object.entries(patterns).forEach(([key, { regex, name }]) => {
      if (regex.test(text)) {
        detectedPatterns.push(name);
      }
    });

    return detectedPatterns;
  };

  const showSecurityWarning = (patterns: string[]) => {
    if (patterns.length > 0) {
      setSecurityAlertMessage(
        `For your safety, we've hidden ${patterns.join(', ')}. Please keep conversations within Campus Vibes.`
      );
      setShowSecurityAlert(true);
      setTimeout(() => setShowSecurityAlert(false), 5000);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !chatId || sending || !conversation) {
      console.log('Cannot send message:', { message: message.trim(), chatId, sending, conversation });
      return;
    }

    const { content: censoredContent, hasSensitiveInfo } = censorSensitiveInfo(message);
    const detectedPatterns = detectSensitivePatterns(message);

    if (hasSensitiveInfo) {
      showSecurityWarning(detectedPatterns);
    }

    setSending(true);

    try {
      console.log('Sending message to conversation:', chatId);
      console.log('Message content:', censoredContent);
      
      // FIX: Use the correct API endpoint with query parameter
      const response = await api.post(`/api/chat/messages/send?conversationId=${chatId}`, {
        content: censoredContent
      });

      console.log('Send message response:', response.data);

      if (response.data.success) {
        const newMessage = response.data.message_data;
        setMessages(prev => [...prev, newMessage]);
        setMessage('');

        // Refresh conversation to update last message
        await fetchConversation();
      } else {
        setError('Failed to send message: ' + (response.data.message || 'Unknown error'));
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessageContent = (content: string, containsSensitiveInfo?: boolean) => {
    if (!containsSensitiveInfo) {
      return content;
    }

    return (
      <span className="relative">
        {content}
        {containsSensitiveInfo && (
          <Shield className="h-3 w-3 text-blue-500 inline-block ml-1" />
        )}
      </span>
    );
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleBack = () => {
    router.push('/chat');
  };

  const markConversationAsRead = async () => {
    if (!chatId) return;

    try {
      await api.post(`/chat/conversations/${chatId}/mark_read`);
    } catch (err) {
      console.error('Error marking conversation as read:', err);
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      markConversationAsRead();
    }
  }, [messages.length]);

  // Debug info
  useEffect(() => {
    console.log('Current state:', { loading, error, conversation, messagesCount: messages.length });
  }, [loading, error, conversation, messages.length]);

  if (loading) {
    return (
      <div className="h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-pink-500" />
          <p className="text-gray-500 dark:text-gray-400">Loading chat...</p>
          <p className="text-xs text-gray-400 mt-2">Chat ID: {chatId}</p>
        </div>
      </div>
    );
  }

  

  return (
    <div className="h-[calc(100vh-70px)] flex flex-col">
      {/* Security Alert */}
      {showSecurityAlert && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
          <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
              {securityAlertMessage}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={handleBack} className="mr-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar>
            <AvatarImage 
              src={conversation.other_user.avatar || '/api/placeholder/40/40'} 
              alt={conversation.other_user.name}
            />
            <AvatarFallback>
              {conversation.other_user.name?.charAt(0) || conversation.other_user.username?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {conversation.other_user.name || conversation.other_user.username}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {conversation.other_user.isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id !== conversation.other_user.id;
            const { content: censoredContent, hasSensitiveInfo } = censorSensitiveInfo(msg.content);

            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                    isOwn
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-br-none'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-none'
                  } ${hasSensitiveInfo ? 'border border-yellow-400 dark:border-yellow-600' : ''}`}
                >
                  <p className="text-sm break-words">
                    {formatMessageContent(censoredContent, hasSensitiveInfo)}
                  </p>
                  <div className={`text-xs mt-1 flex items-center justify-between ${
                    isOwn ? 'text-pink-100' : 'text-gray-500'
                  }`}>
                    <span>{formatMessageTime(msg.timestamp)}</span>
                    {isOwn && (
                      <span className="ml-2 text-xs opacity-75">
                        {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        {error && (
          <div className="mb-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            disabled={sending}
          />
          <Button variant="ghost" size="sm">
            <Smile className="h-4 w-4" />
          </Button>
          <Button 
            onClick={sendMessage}
            disabled={!message.trim() || sending}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}