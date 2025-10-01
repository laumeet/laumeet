// app/(main)/chat/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, MoreVertical, Phone, Video, Send, Paperclip, Smile, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Chat {
  id: string;
  user: {
    id: string;
    name: string;
    avatar: string;
    isOnline: boolean;
  };
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isTyping?: boolean;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
  containsSensitiveInfo?: boolean;
}

export default function ChatPage() {
  const [chats, setChats] = useState<Chat[]>([
    {
      id: '1',
      user: {
        id: '1',
        name: 'Alex Johnson',
        avatar: '/api/placeholder/40/40',
        isOnline: true
      },
      lastMessage: 'Hey! How was your presentation?',
      timestamp: '2 min ago',
      unreadCount: 2
    },
    {
      id: '2',
      user: {
        id: '2',
        name: 'Taylor Smith',
        avatar: '/api/placeholder/40/40',
        isOnline: false
      },
      lastMessage: 'Practice session at 6 PM today',
      timestamp: '1 hour ago',
      unreadCount: 0
    },
    {
      id: '3',
      user: {
        id: '3',
        name: 'Jordan Miller',
        avatar: '/api/placeholder/40/40',
        isOnline: true
      },
      lastMessage: 'Thanks for the study notes!',
      timestamp: '3 hours ago',
      unreadCount: 1,
      isTyping: true
    }
  ]);

  const [selectedChat, setSelectedChat] = useState<string>('1');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
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
  ]);
  const [showSecurityAlert, setShowSecurityAlert] = useState(false);
  const [securityAlertMessage, setSecurityAlertMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedChatData = chats.find(chat => chat.id === selectedChat);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Security Filter Functions
  const containsSensitiveInfo = (text: string): boolean => {
    const patterns = {
      phone: /\b(\+?[\d\s\-\(\)]{10,15})\b/g,
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      url: /(https?:\/\/[^\s]+|www\.[^\s]+|\b[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}([^\s]*)?)/gi,
      socialMedia: /\b(instagram|facebook|fb|twitter|x|tiktok|snapchat|telegram|whatsapp|signal|discord|reddit|linkedin)\b/gi,
      appNames: /\b(whatsapp|telegram|signal|instagram|facebook|twitter|snapchat|tiktok|discord|messenger|viber|wechat|line)\b/gi,
      externalPlatforms: /\b(move to|switch to|contact me on|dm me on|hit me up on|add me on|find me on)\s+(instagram|facebook|whatsapp|telegram|signal|snapchat)\b/gi
    };

    return Object.values(patterns).some(pattern => pattern.test(text));
  };

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

    // Censor phone numbers
    censoredText = censoredText.replace(patterns.phone, (match) => {
      hasSensitiveInfo = true;
      return '#' + '#'.repeat(match.length - 1);
    });

    // Censor emails
    censoredText = censoredText.replace(patterns.email, (match) => {
      hasSensitiveInfo = true;
      const [local, domain] = match.split('@');
      return local.charAt(0) + '#'.repeat(local.length - 1) + '@' + domain;
    });

    // Censor URLs
    censoredText = censoredText.replace(patterns.url, (match) => {
      hasSensitiveInfo = true;
      return '#' + '#'.repeat(Math.min(match.length - 1, 10));
    });

    // Censor social media and app names
    censoredText = censoredText.replace(patterns.socialMedia, (match) => {
      hasSensitiveInfo = true;
      return '#' + '#'.repeat(match.length - 1);
    });

    censoredText = censoredText.replace(patterns.appNames, (match) => {
      hasSensitiveInfo = true;
      return '#' + '#'.repeat(match.length - 1);
    });

    // Censor external platform requests
    censoredText = censoredText.replace(patterns.externalRequests, (match) => {
      hasSensitiveInfo = true;
      const words = match.split(' ');
      const lastWord = words[words.length - 1];
      return words.slice(0, -1).join(' ') + ' #' + '#'.repeat(lastWord.length - 1);
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

  const sendMessage = () => {
    if (!message.trim()) return;

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

    setMessages(prev => [...prev, newMessage]);
    setMessage('');

    // Update last message in chat list
    setChats(prev => prev.map(chat => 
      chat.id === selectedChat 
        ? { ...chat, lastMessage: censoredContent, timestamp: 'Just now', unreadCount: 0 }
        : chat
    ));

    // Simulate reply after 1-3 seconds
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
        senderId: selectedChat,
        content: randomReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOwn: false
      };
      setMessages(prev => [...prev, reply]);

      // Update chat list with reply
      setChats(prev => prev.map(chat => 
        chat.id === selectedChat 
          ? { ...chat, lastMessage: randomReply, timestamp: 'Just now', unreadCount: chat.unreadCount + 1 }
          : chat
      ));
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

    // Add a small security indicator for censored messages
    return (
      <span className="relative">
        {content}
        {containsSensitiveInfo && (
          <Shield className="h-3 w-3 text-blue-500 inline-block ml-1" />
        )}
      </span>
    );
  };

  return (
    <div className="flex h-[calc(100vh-140px)] pb-20">
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

      {/* Chat List */}
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search messages..."
              className="pl-10 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            />
          </div>
        </div>

        <div className="overflow-y-auto">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`p-4 border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors ${
                selectedChat === chat.id 
                  ? 'bg-gray-50 dark:bg-gray-800' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              onClick={() => setSelectedChat(chat.id)}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Avatar>
                    <AvatarImage src={chat.user.avatar} />
                    <AvatarFallback>{chat.user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {chat.user.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {chat.user.name}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {chat.timestamp}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className={`text-sm truncate ${
                      chat.unreadCount > 0 
                        ? 'text-gray-900 dark:text-white font-medium' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {chat.isTyping ? (
                        <span className="text-blue-500 italic">typing...</span>
                      ) : (
                        chat.lastMessage
                      )}
                    </p>
                    
                    {chat.unreadCount > 0 && (
                      <Badge className="bg-pink-500 text-white text-xs">
                        {chat.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        {selectedChatData && (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={selectedChatData.user.avatar} />
                  <AvatarFallback>{selectedChatData.user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {selectedChatData.user.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedChatData.user.isOnline ? 'Online' : 'Offline'}
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

            {/* Security Notice */}
            <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center text-sm text-yellow-800 dark:text-yellow-200">
                <Shield className="h-3 w-3 mr-2 flex-shrink-0" />
                <span>For your safety, phone numbers, links, and external app names are automatically hidden.</span>
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
          </>
        )}
      </div>
    </div>
  );
}