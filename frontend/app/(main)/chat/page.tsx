// app/(main)/chat/page.tsx
'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export interface ChatUser {
  id: string;
  name: string;
  avatar: string;
  isOnline: boolean;
}

export interface Chat {
  id: string;
  user: ChatUser;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isTyping?: boolean;
}

// Mock data - Replace with real API call
const mockChats: Chat[] = [
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
];

// Real API functions - Uncomment and use these when you have your API
/*
const fetchChats = async (): Promise<Chat[]> => {
  const response = await fetch('/api/chats');
  if (!response.ok) throw new Error('Failed to fetch chats');
  return response.json();
};

const updateChatLastMessage = async (chatId: string, lastMessage: string) => {
  const response = await fetch(`/api/chats/${chatId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lastMessage })
  });
  if (!response.ok) throw new Error('Failed to update chat');
  return response.json();
};
*/

export default function ChatPage() {
  const router = useRouter();

  const handleChatSelect = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  // For real API usage, you would use:
  /*
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChats = async () => {
      try {
        const chatData = await fetchChats();
        setChats(chatData);
      } catch (error) {
        console.error('Error loading chats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChats();
  }, []);
  */

  return (
    <div className="h-[calc(100vh-140px)] pb-10">
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

      <div className="overflow-y-auto h-full">
        {mockChats.map((chat) => (
          <div
            key={chat.id}
            className="p-4 border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={() => handleChatSelect(chat.id)}
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
  );
}