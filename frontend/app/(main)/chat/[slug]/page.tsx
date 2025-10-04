/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(main)/chat/[slug]/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Paperclip, Smile, Shield, Loader2, MoreVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const chatId = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversation = async () => {
    if (!chatId) return null;

    try {
      const response = await api.get('/chat/conversations');

      if (response.data.success) {
        const conversations = response.data.conversations || [];

        const currentConv = conversations.find((conv: Conversation) => {
          const convIdStr = conv.id.toString();
          const chatIdStr = chatId.toString();

          if (convIdStr === chatIdStr) {
            return true;
          }

          if (conv.other_user.id === chatIdStr) {
            return true;
          }

          return false;
        });

        if (!currentConv) {
          setError('Chat not found');
          return null;
        }

        setConversation(currentConv);
        return currentConv;
      }
      return null;
    } catch (err: any) {
      setError('Failed to load conversation');
      return null;
    }
  };

  // In your ChatDetailPage component, change the fetchMessages function:

const fetchMessages = async () => {
  if (!conversation) return;

  try {
    // Use path parameter instead of query parameter
    const response = await api.get(`/chat/messages/${conversation.id}`);

    if (response.data.success) {
      setMessages(response.data.messages || []);
    } else {
      setError('Failed to load messages');
      console.error('API response error:', response.data);
    }
  } catch (err: any) {
    console.error('Fetch messages error:', err);
    setError(err.response?.data?.message || 'Failed to load messages');
  }
};

  const loadChatData = async () => {
    if (!chatId) {
      router.push('/chat');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const conv = await fetchConversation();
        await fetchMessages();
      
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
    if (!message.trim() || !conversation || sending) return;

    const { content: censoredContent, hasSensitiveInfo } = censorSensitiveInfo(message);
    const detectedPatterns = detectSensitivePatterns(message);

    if (hasSensitiveInfo) {
      showSecurityWarning(detectedPatterns);
    }

    setSending(true);

    try {
      const response = await api.post(`/chat/messages/send?conversationId=${conversation.id}`, {
        content: censoredContent
      });

      if (response.data.success) {
        const newMessage = response.data.message_data;
        setMessages(prev => [...prev, newMessage]);
        setMessage('');

        await fetchConversation();
      } else {
        setError('Failed to send message');
      }
    } catch (err: any) {
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

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatMessageDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString([], {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isSameDay = (date1: string, date2: string) => {
    return new Date(date1).toDateString() === new Date(date2).toDateString();
  };

  const handleBack = () => {
    router.push('/chat');
  };

  const markConversationAsRead = async () => {
    if (!conversation) return;

    try {
      await api.post(`/chat/conversations/mark-read?conversationId=${conversation.id}`);
    } catch (err) {
      // Silent fail for read receipts
    }
  };

  useEffect(() => {
    if (messages.length > 0 && conversation) {
      markConversationAsRead();
    }
  }, [messages.length, conversation]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-pink-500" />
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
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
      {/* Security Alert */}
      {showSecurityAlert && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
          <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-lg">
            <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
              {securityAlertMessage}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Chat Header */}
      <div className="flex-none border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBack} 
              className="md:hidden hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Avatar className="h-10 w-10 border-2 border-white dark:border-gray-800">
              <AvatarImage 
                src={conversation.other_user.avatar || '/api/placeholder/40/40'} 
                alt={conversation.other_user.name}
                className="object-cover"
              />
              <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                {conversation.other_user.name?.charAt(0) || conversation.other_user.username?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {conversation.other_user.name || conversation.other_user.username}
              </h3>
              <div className="flex items-center space-x-1">
                <div className={`h-2 w-2 rounded-full ${
                  conversation.other_user.isOnline 
                    ? 'bg-green-500' 
                    : 'bg-gray-400'
                }`} />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {conversation.other_user.isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-gray-100 dark:hover:bg-gray-800">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View profile</DropdownMenuItem>
              <DropdownMenuItem>Media, files & links</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">Block user</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">Report</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-800/30">
        <div className="max-w-3xl mx-auto p-4 space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl text-white">👋</span>
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
              const { content: censoredContent, hasSensitiveInfo } = censorSensitiveInfo(msg.content);
              const showDate = index === 0 || !isSameDay(msg.timestamp, messages[index - 1].timestamp);

              return (
                <div key={msg.id} className="space-y-2">
                  {/* Date Separator */}
                  {showDate && (
                    <div className="flex justify-center">
                      <div className="bg-white dark:bg-gray-700 px-3 py-1 rounded-full text-xs text-gray-500 dark:text-gray-400 border dark:border-gray-600">
                        {formatMessageDate(msg.timestamp)}
                      </div>
                    </div>
                  )}

                  {/* Message */}
                  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}>
                    <div className={`flex max-w-[70%] ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
                      {!isOwn && (
                        <Avatar className="h-8 w-8 flex-none">
                          <AvatarImage 
                            src={conversation.other_user.avatar || '/api/placeholder/32/32'} 
                            alt={conversation.other_user.name}
                          />
                          <AvatarFallback className="text-xs">
                            {conversation.other_user.name?.charAt(0) || conversation.other_user.username?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div className={`relative px-4 py-2 rounded-2xl ${
                        isOwn
                          ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-br-md'
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md shadow-sm border border-gray-200 dark:border-gray-600'
                      } ${hasSensitiveInfo ? 'border-2 border-yellow-400 dark:border-yellow-600' : ''}`}>
                        <p className="text-sm break-words leading-relaxed">
                          {censoredContent}
                        </p>

                        <div className={`flex items-center justify-end space-x-1 mt-1 ${
                          isOwn ? 'text-pink-100' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          <span className="text-xs">
                            {formatMessageTime(msg.timestamp)}
                          </span>
                          {isOwn && (
                            <span className="text-xs opacity-75">
                              {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
                            </span>
                          )}
                        </div>

                        {/* Security Shield */}
                        {hasSensitiveInfo && (
                          <div className="absolute -top-2 -right-2 bg-yellow-100 dark:bg-yellow-900 rounded-full p-1">
                            <Shield className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                          </div>
                        )}
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

      {/* Message Input */}
      <div className="flex-none border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        {error && (
          <div className="mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="flex items-end space-x-3 max-w-3xl mx-auto">
          <Button variant="ghost" size="icon" className="flex-none hover:bg-gray-100 dark:hover:bg-gray-800">
            <Paperclip className="h-5 w-5" />
          </Button>

          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm min-h-[44px] max-h-32"
              rows={1}
              disabled={sending}
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-2 bottom-2 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
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
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
