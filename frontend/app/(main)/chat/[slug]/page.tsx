// app/(main)/chat/[id]/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Phone, Video, MoreVertical, Send, Paperclip, Smile, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChatUser } from '../page';

export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
  containsSensitiveInfo?: boolean;
}

// Mock data - Replace with real API calls
const mockChatUsers: Record<string, ChatUser> = {
  '1': {
    id: '1',
    name: 'Alex Johnson',
    avatar: '/api/placeholder/40/40',
    isOnline: true
  },
  '2': {
    id: '2',
    name: 'Taylor Smith',
    avatar: '/api/placeholder/40/40',
    isOnline: false
  },
  '3': {
    id: '3',
    name: 'Jordan Miller',
    avatar: '/api/placeholder/40/40',
    isOnline: true
  }
};

const mockMessages: Record<string, Message[]> = {
  '1': [
    {
      id: '1',
      senderId: '1',
      content: 'Hey! How was your presentation?',
      timestamp: '2:30 PM',
      isOwn: false
    },
    {
      id: '2',
      senderId: 'current',
      content: 'It went really well! Thanks for asking 😊',
      timestamp: '2:31 PM',
      isOwn: true
    },
    {
      id: '3',
      senderId: '1',
      content: 'That\'s awesome! I knew you\'d crush it',
      timestamp: '2:32 PM',
      isOwn: false
    }
  ],
  '2': [
    {
      id: '1',
      senderId: '2',
      content: 'Practice session at 6 PM today',
      timestamp: '1:45 PM',
      isOwn: false
    },
    {
      id: '2',
      senderId: 'current',
      content: 'Got it! I\'ll be there',
      timestamp: '1:46 PM',
      isOwn: true
    }
  ],
  '3': [
    {
      id: '1',
      senderId: '3',
      content: 'Thanks for the study notes!',
      timestamp: '11:30 AM',
      isOwn: false
    },
    {
      id: '2',
      senderId: 'current',
      content: 'No problem! Happy to help',
      timestamp: '11:31 AM',
      isOwn: true
    }
  ]
};

// Real API functions - Uncomment and use these when you have your API
/*
const fetchChatUser = async (chatId: string): Promise<ChatUser> => {
  const response = await fetch(`/api/chats/${chatId}/user`);
  if (!response.ok) throw new Error('Failed to fetch chat user');
  return response.json();
};

const fetchMessages = async (chatId: string): Promise<Message[]> => {
  const response = await fetch(`/api/chats/${chatId}/messages`);
  if (!response.ok) throw new Error('Failed to fetch messages');
  return response.json();
};

const sendMessageToAPI = async (chatId: string, message: { content: string }): Promise<Message> => {
  const response = await fetch(`/api/chats/${chatId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message)
  });
  if (!response.ok) throw new Error('Failed to send message');
  return response.json();
};
*/

export default function ChatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [showSecurityAlert, setShowSecurityAlert] = useState(false);
  const [securityAlertMessage, setSecurityAlertMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Safely get chatId from params
  const chatId = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;

  const chatUser = chatId ? mockChatUsers[chatId] : null;

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const loadChatData = async () => {
      if (!chatId) {
        router.push('/chat');
        return;
      }

      try {
        setLoading(true);
        
        // For real API usage:
        // const [userData, messageData] = await Promise.all([
        //   fetchChatUser(chatId),
        //   fetchMessages(chatId)
        // ]);
        // setMessages(messageData);
        
        // Mock data loading
        if (mockMessages[chatId]) {
          setMessages(mockMessages[chatId]);
        } else {
          router.push('/chat');
          return;
        }
      } catch (error) {
        console.error('Error loading chat:', error);
        router.push('/chat');
      } finally {
        setLoading(false);
      }
    };

    loadChatData();
  }, [chatId, router]);

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
      appNames: /\b(whatsapp|telegram|signal|instagram|facebook|twitter|snapchat|tiktok|discord|messenger|viber|wechat|line)\b/gi,
      externalRequests: /\b(move to|switch to|contact me on|dm me on|hit me up on|add me on|find me on)\s+[a-zA-Z0-9]+\b/gi
    };

    // Censor patterns
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
    if (!message.trim() || !chatId) return;

    const { content: censoredContent, hasSensitiveInfo } = censorSensitiveInfo(message);
    const detectedPatterns = detectSensitivePatterns(message);

    if (hasSensitiveInfo) {
      showSecurityWarning(detectedPatterns);
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: 'current',
      content: censoredContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isOwn: true,
      containsSensitiveInfo: hasSensitiveInfo
    };

    // For real API usage:
    /*
    try {
      const sentMessage = await sendMessageToAPI(chatId, { content: censoredContent });
      setMessages(prev => [...prev, sentMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
    }
    */

    // Mock implementation
    setMessages(prev => [...prev, newMessage]);
    setMessage('');

    // Simulate reply
    const replyDelay = Math.random() * 2000 + 1000;
    setTimeout(() => {
      const replies = [
        "That's interesting!",
        "I appreciate you keeping the conversation here 😊",
        "Thanks for sharing!",
        "Let's continue chatting here on Campus Vibes!",
        "That sounds great!",
        "I'm glad we're talking here on the app"
      ];
      
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      
      const reply: Message = {
        id: (Date.now() + 1).toString(),
        senderId: chatId,
        content: randomReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOwn: false
      };
      setMessages(prev => [...prev, reply]);
    }, replyDelay);
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

  const handleBack = () => {
    router.push('/chat');
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-140px)] flex items-center justify-center">
        <p className="text-gray-500">Loading chat...</p>
      </div>
    );
  }

  if (!chatUser || !chatId) {
    return (
      <div className="h-[calc(100vh-140px)] flex items-center justify-center">
        <p className="text-gray-500">Chat not found</p>
        <Button onClick={handleBack} className="ml-4">
          Back to Chats
        </Button>
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
            <AvatarImage src={chatUser.avatar} />
            <AvatarFallback>{chatUser.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {chatUser.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {chatUser.isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                msg.isOwn
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-br-none'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-none'
              } ${msg.containsSensitiveInfo ? 'border border-yellow-400 dark:border-yellow-600' : ''}`}
            >
              <p className="text-sm break-words">
                {formatMessageContent(msg.content, msg.containsSensitiveInfo)}
              </p>
              <p className={`text-xs mt-1 ${
                msg.isOwn ? 'text-pink-100' : 'text-gray-500'
              }`}>
                {msg.timestamp}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
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
          />
          <Button variant="ghost" size="sm">
            <Smile className="h-4 w-4" />
          </Button>
          <Button 
            onClick={sendMessage}
            disabled={!message.trim()}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}