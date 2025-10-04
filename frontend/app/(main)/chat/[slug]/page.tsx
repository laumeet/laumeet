/* eslint-disable @typescript-eslint/no-explicit-any */
// app/(main)/chat/[slug]/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Paperclip, Smile, Shield, Loader2, MoreVertical, CheckCheck, Check, Search, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import api from '@/lib/axio';
import { useSocket } from '@/hooks/useSocket';

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

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string>('');
  const [onlineStatus, setOnlineStatus] = useState<boolean>(true);
  const [isUserInChatRoom, setIsUserInChatRoom] = useState<boolean>(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Use the useSocket hook
  const { socket, isConnected: socketConnected, connectionError } = useSocket();

  const chatId = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;

  // Track if user is currently in the chat room (active tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsUserInChatRoom(!document.hidden);
      
      // If user comes back to the tab and conversation is loaded, mark messages as read
      if (!document.hidden && conversation) {
        markMessagesAsRead();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Initially set to true since user is viewing the page
    setIsUserInChatRoom(true);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [conversation]);

  // Mark messages as read when conversation is loaded and user is viewing
  useEffect(() => {
    if (conversation && isUserInChatRoom) {
      markMessagesAsRead();
    }
  }, [conversation, isUserInChatRoom]);

  // Setup socket listeners when conversation is loaded
  useEffect(() => {
    if (!socket || !conversation) return;

    // Join conversation room
    socket.emit('join_conversation', { conversation_id: conversation.id });

    // Listen for new messages
    socket.on('new_message', (newMessage: Message) => {
      console.log('📨 New message received:', newMessage);
      setMessages(prev => {
        // Check if message already exists to prevent duplicates
        const exists = prev.some(msg => msg.id === newMessage.id);
        if (exists) return prev;
        return [...prev, newMessage];
      });
      
      // If the new message is from other user and we're in the chat room, mark it as read immediately
      if (newMessage.sender_id === conversation.other_user.id && isUserInChatRoom) {
        socket.emit('mark_message_read', {
          message_id: newMessage.id,
          conversation_id: conversation.id
        });
      }
      
      // If the new message is from current user, handle status based on recipient's status
      if (newMessage.sender_id !== conversation.other_user.id) {
        handleOutgoingMessageStatus(newMessage);
      }
    });

    // Listen for typing indicators
    socket.on('user_typing', (data: any) => {
      if (data.user_id !== conversation.other_user.id) return;
      
      setTypingUser(data.username);
      setIsTyping(data.is_typing);

      if (data.is_typing) {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
          setTypingUser('');
        }, 3000);
      } else {
        setIsTyping(false);
        setTypingUser('');
      }
    });

    // Listen for online status updates
    socket.on('user_online_status', (data: any) => {
      if (data.user_id === conversation.other_user.id) {
        console.log(`🌐 User ${data.user_id} is now ${data.is_online ? 'online' : 'offline'}`);
        setOnlineStatus(data.is_online);
        setConversation(prev => prev ? {
          ...prev,
          other_user: {
            ...prev.other_user,
            isOnline: data.is_online,
            lastSeen: data.last_seen
          }
        } : null);

        // Update message statuses based on new online status
        updateMessageStatusesBasedOnOnlineStatus(data.is_online);
      }
    });

    // Listen for message status updates
    socket.on('message_status_update', (data: any) => {
      console.log('📨 Message status update:', data);
      setMessages(prev => prev.map(msg => 
        msg.id === data.message_id 
          ? { 
              ...msg, 
              status: data.status,
              delivered_at: data.delivered_at || msg.delivered_at,
              read_at: data.read_at || msg.read_at,
              is_read: data.status === 'read' ? true : msg.is_read
            } 
          : msg
      ));
    });
     


    // Message delivered update
    socket.on('message_delivered', ({ message_id }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === message_id ? { ...msg, status: 'delivered' } : msg
        )
      );
    });

    // Message read update
    socket.on('messages_read', ({ message_ids }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          message_ids.includes(msg.id)
            ? { ...msg, is_read: true, status: 'read' }
            : msg
        )
      );
    });

    


    // Listen for user join/leave chat room events
    socket.on('user_joined_chat', (data: any) => {
      if (data.user_id === conversation.other_user.id) {
        console.log('👤 Other user joined the chat room');
        // If other user joins chat room, mark our messages as read
        markOurMessagesAsRead();
      }
    });

    socket.on('user_left_chat', (data: any) => {
      if (data.user_id === conversation.other_user.id) {
        console.log('👤 Other user left the chat room');
      }
    });

    // Listen for conversation updates
    socket.on('conversation_updated', (data: any) => {
      if (data.conversation_id === conversation.id) {
        // Update conversation last message
        setConversation(prev => prev ? {
          ...prev,
          last_message: data.last_message,
          last_message_at: data.last_message_at
        } : null);
      }
    });

    return () => {
      socket.off('new_message');
      socket.off('user_typing');
      socket.off('user_online_status');
      socket.off('message_status_update');
      socket.off('user_joined_chat');
      socket.off('user_left_chat');
      socket.off('conversation_updated');
      socket.off('receive_message');
      socket.off('message_delivered');
      socket.off('messages_read');
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [socket, conversation, isUserInChatRoom]);

  // Handle outgoing message status based on recipient's status
  const handleOutgoingMessageStatus = (message: Message) => {
    if (!socket || !conversation) return;

    // If recipient is online AND in the chat room → mark as READ
    if (onlineStatus && isUserInChatRoom) {
      setTimeout(() => {
        socket.emit('message_read', {
          message_id: message.id,
          conversation_id: conversation.id
        });
      }, 1000); // Small delay to simulate real-world timing
    }
    // If recipient is online but NOT in chat room → mark as DELIVERED
    else if (onlineStatus) {
      setTimeout(() => {
        socket.emit('message_delivered', {
          message_id: message.id,
          conversation_id: conversation.id
        });
      }, 500);
    }
    // If recipient is offline → status remains SENT
    // No action needed, status stays as 'sent'
  };

  // Update all pending messages when recipient's online status changes
  const updateMessageStatusesBasedOnOnlineStatus = (isOnline: boolean) => {
    if (!socket || !conversation) return;

    // Get messages sent by current user that are not yet read
    const pendingMessages = messages.filter(msg => 
      msg.sender_id !== conversation.other_user.id && 
      msg.status !== 'read'
    );

    if (isOnline) {
      // If user comes online, update delivered messages
      pendingMessages.forEach(msg => {
        if (msg.status === 'sent') {
          socket.emit('message_delivered', {
            message_id: msg.id,
            conversation_id: conversation.id
          });
        }
      });
    }
  };

  // Mark all our messages as read (when recipient views the chat)
  const markOurMessagesAsRead = () => {
    if (!socket || !conversation) return;

    const ourUnreadMessages = messages.filter(msg => 
      msg.sender_id !== conversation.other_user.id && 
      msg.status !== 'read'
    );

    ourUnreadMessages.forEach(msg => {
      socket.emit('message_read', {
        message_id: msg.id,
        conversation_id: conversation.id
      });
    });
  };

  // Mark all messages from other user as read
  const markMessagesAsRead = async () => {
    if (!conversation) return;

    try {
      // Also emit socket event for real-time updates
      if (socket) {
        socket.emit('mark_conversation_read', {
          conversation_id: conversation.id
        });
      }

      // Update local state
      setMessages(prev => prev.map(msg => ({
        ...msg,
        is_read: true,
        status: msg.status === 'delivered' || msg.status === 'sent' ? 'read' : msg.status,
        read_at: msg.read_at || new Date().toISOString()
      })));

    } catch (err) {
      console.error('Failed to mark messages as read:', err);
    }
  };

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
        setOnlineStatus(currentConv.other_user.isOnline);
        return currentConv;
      }
      return null;
    } catch (err: any) {
      setError('Failed to load conversation');
      return null;
    }
  };

  const fetchMessages = async () => {
    if (!chatId) return;

    try {
  
      
      const response = await api.get(`/chat/messages/${chatId}`);

      

      if (response.data.success) {
        setMessages(response.data.messages || []);
    
      } else {
        setError('Failed to load messages');
        
      }
    } catch (err: any) {
   
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
     
      if (conv){
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

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Typing indicator handler
  const handleTyping = (isTyping: boolean) => {
    if (!socket || !conversation) return;

    socket.emit('typing', {
      conversation_id: conversation.id,
      is_typing: isTyping
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Send typing start
    if (e.target.value.trim() && !isTyping) {
      handleTyping(true);
    }
    
    // Set timeout to send typing stop
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      handleTyping(false);
    }, 1000);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);


  const sendMessage = async () => {
    if (!message.trim() || !conversation || sending) return;

    const content = message.trim();
    setSending(true);

    try {
      // Stop typing when sending
      handleTyping(false);

      // Create optimistic message

      setMessage('');

      // Use Socket.IO for real-time messaging
      if (socket && socketConnected) {
        socket.emit('send_message', {
          conversation_id: conversation.id,
          content: content
        });
      } else {
        // Fallback to HTTP API
        const response = await api.post(`/chat/messages/send?conversationId=${conversation.id}`, {
          content: content
        });

        if (response.data.success) {
        
          await fetchConversation();
        } else {
          setError('Failed to send message');
          // Remove optimistic message on error
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send message');
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id.startsWith('temp-')));
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
      minute: '2-digit',
      hour12: false
    });
  };

  const formatMessageDate = (timestamp: string) => {
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
  };

  const isSameDay = (date1: string, date2: string) => {
    return new Date(date1).toDateString() === new Date(date2).toDateString();
  };

  const handleBack = () => {
    router.push('/chat');
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
  } ;

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
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* WhatsApp-like Header */}
      <div className="flex-none bg-green-500 text-white">
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
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white truncate">
                {conversation.other_user.name || conversation.other_user.username}
              </h3>
              <div className="flex items-center space-x-2">
                <p className="text-green-100 text-xs">
                  {onlineStatus ? 'online' : formatLastSeen(conversation.other_user.lastSeen)}
                </p>
                
              </div>
            </div>
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

              return (
                <div key={msg.id} className="space-y-1">
                  {/* Date Separator */}
                  {showDate && (
                    <div className="flex justify-center">
                      <div className="bg-black bg-opacity-20 px-3 py-1 rounded-full text-xs text-white">
                        {formatMessageDate(msg.timestamp)}
                      </div>
                    </div>
                  )}

                  {/* Message */}
                  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${isOwn ? 'ml-12' : 'mr-12'}`}>
                      <div className={`relative px-3 py-2 rounded-lg ${
                        isOwn
                          ? 'bg-[#d9fdd3] dark:bg-green-900 rounded-br-none'
                          : 'bg-white dark:bg-gray-700 rounded-bl-none'
                      } shadow-sm`}>
                        <p className="text-sm break-words leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </p>

                        <div className={`flex items-center justify-end space-x-1 mt-1 ${
                          isOwn ? 'text-green-800 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'
                        }`}>
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

      {/* Message Input - WhatsApp Style */}
      <div className="flex-none bg-gray-100 dark:bg-gray-800 p-3">
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
              onKeyDown={handleKeyPress}
              className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm min-h-[44px] max-h-32 overflow-hidden"
              rows={1}
              disabled={sending}
              style={{ overflow: 'hidden' }}
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-2 bottom-2 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400"
            >
              <Smile className="h-5 w-5" />
            </Button>
          </div>

          <Button 
            onClick={sendMessage}
            disabled={!message.trim() || sending || !socketConnected}
            size="icon"
            className="flex-none bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed h-11 w-11 rounded-full shadow-lg"
            title={!socketConnected ? "Waiting for connection..." : "Send message"}
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            ) : (
              <Send className="h-5 w-5 text-white" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}