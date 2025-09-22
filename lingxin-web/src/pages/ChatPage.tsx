import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSpirit } from '@/contexts/SpiritContext';
import { supabase, Message } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import TopRibbon from '@/components/TopRibbon';
import WelfareBanner from '@/components/WelfareBanner';
import NameDialog from '@/components/NameDialog';
import toast from 'react-hot-toast';
import {
  Send,
  Menu,
  ArrowLeft,
  Clock,
  Sparkles,
  User,
  Bot,
  Plus,
  Calendar,
  ShieldOff
} from 'lucide-react';

interface SmartChip {
  id: string;
  text: string;
  action: string;
  category: string;
}

export default function ChatPage() {
  const { spiritId } = useParams<{ spiritId: string }>();
  const { user, profile, signOut } = useAuth();
  const { spirit, refreshSpirit } = useSpirit();
  const navigate = useNavigate();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [smartChips, setSmartChips] = useState<SmartChip[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [naming, setNaming] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isRevoked = spirit?.status === 'revoked';

  useEffect(() => {
    if (spiritId) {
      setConversationId(spiritId);
    } else if (spirit?.id) {
      setConversationId(spirit.id);
    }
  }, [spiritId, spirit?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = useCallback(async () => {
    if (!user || !conversationId) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', user.id)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Error loading chat history:', error);
        return;
      }

      if (data) {
        setMessages(data);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }, [user, conversationId]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading || !user || !conversationId || !spirit || isRevoked) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setLoading(true);
    setSmartChips([]);

    const timestamp = new Date().toISOString();

    const userMsg: Message = {
      id: crypto.randomUUID(),
      user_id: user.id,
      conversation_id: conversationId,
      role: 'user',
      content: userMessage,
      created_at: timestamp,
      updated_at: timestamp
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const { data, error } = await supabase.functions.invoke('chat-api', {
        body: {
          message: userMessage,
          conversation_id: conversationId,
          spirit_id: spirit.id,
          context: {
            user_profile: profile
          }
        }
      });

      if (error) {
        throw new Error(error.message || '聊天服務暫時無法使用');
      }

      if (data?.data) {
        const aiMessage: Message = {
          id: crypto.randomUUID(),
          user_id: user.id,
          conversation_id: conversationId,
          role: 'assistant',
          content: data.data.message,
          tokens_used: data.data.tokens_used,
          model_used: data.data.model_used,
          created_at: data.data.timestamp,
          updated_at: data.data.timestamp
        };
        setMessages((prev) => [...prev, aiMessage]);

        if (data.data.suggested_actions && data.data.suggested_actions.length > 0) {
          const chips = data.data.suggested_actions.map((action: any) => ({
            id: crypto.randomUUID(),
            text: action.actions?.[0]?.text || '加入行事曆',
            action: action.actions?.[0]?.action || 'add_to_calendar',
            category: action.category || 'reminder'
          }));
          setSmartChips(chips);
        }
      }

      refreshSpirit().catch((err) => console.error('Failed to refresh spirit:', err));
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || '傳送訊息失敗');

      const errorMsg: Message = {
        id: crypto.randomUUID(),
        user_id: user.id,
        conversation_id: conversationId,
        role: 'assistant',
        content: '抱歉，我現在無法回應。請稍後再試。',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleChipClick = async (chip: SmartChip) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('commitment-engine', {
        body: {
          action: 'parse',
          message: chip.text
        }
      });

      if (error) {
        throw new Error('無法處理承諾');
      }

      if (data?.data?.commitment_detected) {
        toast.success('承諾已加入清單！');
        setSmartChips([]);
      } else {
        toast.success('已記錄你的操作');
      }
    } catch (error: any) {
      console.error('Error handling chip click:', error);
      toast.error(error.message || '操作失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const handleNameSubmit = async (name: string) => {
    if (!spirit?.id) return;
    try {
      setNaming(true);
      const { error } = await supabase.functions.invoke('name', {
        body: {
          spirit_id: spirit.id,
          name
        }
      });

      if (error) {
        throw new Error(error.message || '命名失敗');
      }

      toast.success('命名完成！');
      await refreshSpirit();
      setNameDialogOpen(false);
    } catch (error: any) {
      console.error('命名失敗:', error);
      toast.error(error.message || '命名失敗，請稍後再試');
    } finally {
      setNaming(false);
    }
  };

  const spiritName = spirit?.name || '專屬語氣靈';

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">靈信 3.0</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="md:hidden"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>

          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-gray-500" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {profile?.full_name || '用戶'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 p-4">
            <nav className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  navigate('/commitments');
                  setSidebarOpen(false);
                }}
              >
                <Calendar className="w-4 h-4 mr-3" />
                承諾清單
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  window.open(
                    `https://wwpbkwsedszrtqedkcvi.supabase.co/functions/v1/ics-calendar/${btoa((user?.id || '') + ':' + Date.now() + ':signature')}.ics`,
                    '_blank'
                  );
                  setSidebarOpen(false);
                }}
              >
                <Clock className="w-4 h-4 mr-3" />
                行事曆訂閱
              </Button>
            </nav>
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/10"
            >
              登出
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <TopRibbon
            visible={!spirit?.name && !isRevoked && Boolean(spirit)}
            onAction={() => setNameDialogOpen(true)}
          />
          <div className="p-4 flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden"
            >
              <Menu className="w-4 h-4" />
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                {isRevoked ? <ShieldOff className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
              </div>
              <div>
                <h1 className="font-semibold text-gray-900 dark:text-white">
                  {spiritName}
                  {isRevoked && <span className="ml-2 text-xs text-red-500">（服務暫停）</span>}
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isRevoked ? '官方已暫停此幼靈服務，請查看善待協議。' : '在線中'}
                </p>
              </div>
            </div>
          </div>
          {spirit && !isRevoked && (
            <div className="px-4 pb-4">
              <WelfareBanner score={spirit.welfare_score} />
            </div>
          )}
          {isRevoked && (
            <div className="px-4 pb-4">
              <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-2xl px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
                幼靈暫停服務：系統偵測到長期失聯或不當互動。如需恢復，請點此瞭解善待協議並提出申訴。
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-safe">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">哈囉！我是{spiritName}</h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                我具備九型人格的語氣調性，能記住你的習慣。你可以跟我聊天、設定提醒，或請我幫忙管理承諾。試試說「提醒我明天晚上運動」吧！
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-3xl px-4 py-3 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  {message.role === 'assistant' && message.tokens_used && (
                    <div className="mt-2 text-xs text-gray-400">
                      {message.model_used} · {message.tokens_used} tokens
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 max-w-xs">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {smartChips.length > 0 && (
          <div className="px-4 pb-2">
            <div className="flex flex-wrap gap-2">
              {smartChips.map((chip) => (
                <Badge
                  key={chip.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 border-blue-300 px-3 py-1"
                  onClick={() => handleChipClick(chip)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {chip.text}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 pb-safe">
          <div className="flex space-x-2">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(event) => setInputMessage(event.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isRevoked ? '幼靈已暫停服務' : '輸入訊息...'}
              disabled={loading || isRevoked}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={loading || !inputMessage.trim() || isRevoked}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <NameDialog
        open={nameDialogOpen}
        initialName={spirit?.name || ''}
        loading={naming}
        onOpenChange={setNameDialogOpen}
        onSubmit={handleNameSubmit}
      />
    </div>
  );
}
