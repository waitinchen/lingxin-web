import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import confetti from 'canvas-confetti';
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

type SpiritStageKey = 'infant' | 'growing' | 'mature';

const STAGE_DESCRIPTIONS: Record<SpiritStageKey, string> = {
  infant: '新生期：以陪伴與好奇建立信任。',
  growing: '成長期：開始提供建議與小挑戰。',
  mature: '成熟期：能回顧記憶並一起規劃長程承諾。'
};

function deriveStageKey(dialogueCount = 0, trustLevel = 0): SpiritStageKey {
  if (dialogueCount >= 500 && trustLevel >= 20) {
    return 'mature';
  }
  if (dialogueCount >= 100 && trustLevel >= 5) {
    return 'growing';
  }
  return 'infant';
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
  const [memorySnippets, setMemorySnippets] = useState<string[]>([]);

  const previousBadgesRef = useRef<string[]>([]);
  const previousSpiritIdRef = useRef<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isRevoked = spirit?.status === 'revoked';
  const spiritId = spirit?.id || null;
  const spiritBadges = useMemo(() => (spirit?.persona_badges ? [...spirit.persona_badges] : []), [spirit?.persona_badges]);
  const spiritDialogueCount = spirit?.dialogue_count ?? 0;
  const spiritTrustLevel = spirit?.trust_level ?? 0;

  const triggerCelebration = useCallback(() => {
    if (typeof window === 'undefined') return;
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
  }, []);

  const stageInfo = useMemo(() => {
    if (!spiritId) return null;
    const key = deriveStageKey(spiritDialogueCount, spiritTrustLevel);
    return {
      key,
      label: key === 'infant' ? '新生期' : key === 'growing' ? '成長期' : '成熟期',
      description: STAGE_DESCRIPTIONS[key]
    };
  }, [spiritId, spiritDialogueCount, spiritTrustLevel]);

  const previousStageRef = useRef<SpiritStageKey | null>(null);

  const loadMemorySnippets = useCallback(async () => {
    if (!user?.id || !spiritId) {
      setMemorySnippets([]);
      return;
    }

    const targetConversation = conversationId || spiritId;
    if (!targetConversation) {
      setMemorySnippets([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('memory_summaries')
        .select('summary_content')
        .eq('user_id', user.id)
        .eq('conversation_id', targetConversation)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Error loading memory snippets:', error);
        return;
      }

      const snippets = (data || [])
        .map((entry: any) => (entry?.summary_content?.summary ? String(entry.summary_content.summary) : ''))
        .filter((snippet) => snippet.trim().length > 0);
      setMemorySnippets(snippets);
    } catch (error) {
      console.error('Error loading memory snippets:', error);
    }
  }, [user?.id, spiritId, conversationId]);

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

  useEffect(() => {
    loadMemorySnippets();
  }, [loadMemorySnippets]);

  useEffect(() => {
    const previous = previousBadgesRef.current;

    if (spiritBadges.length > previous.length) {
      triggerCelebration();
      const unlocked = spiritBadges.filter((badge) => !previous.includes(badge));
      if (unlocked.length > 0) {
        toast.success(`獲得徽章：${unlocked.join('、')}`);
      }
    }

    previousBadgesRef.current = spiritBadges;
  }, [spiritBadges, triggerCelebration]);

  useEffect(() => {
    if (!spiritId) {
      previousSpiritIdRef.current = null;
      previousBadgesRef.current = [];
      previousStageRef.current = null;
      return;
    }
    if (previousSpiritIdRef.current === spiritId) {
      return;
    }
    previousSpiritIdRef.current = spiritId;
    previousBadgesRef.current = spiritBadges;
    previousStageRef.current = deriveStageKey(spiritDialogueCount, spiritTrustLevel);
  }, [spiritId, spiritBadges, spiritDialogueCount, spiritTrustLevel]);

  useEffect(() => {
    const currentStage = stageInfo?.key || null;
    if (currentStage && previousStageRef.current && previousStageRef.current !== currentStage) {
      triggerCelebration();
      toast.success(`幼靈進入${stageInfo?.label}！`);
    }
    previousStageRef.current = currentStage;
  }, [stageInfo?.key, stageInfo?.label, triggerCelebration]);

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

        if (Array.isArray(data.data.spirit_context?.memory_snippets)) {
          const snippets = (data.data.spirit_context.memory_snippets as string[])
            .filter((snippet) => typeof snippet === 'string' && snippet.trim().length > 0);
          setMemorySnippets(snippets);
        }

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

          <div className="flex-1 p-4 space-y-6 overflow-y-auto">
            {!isRevoked && spirit && (
              <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-xs text-blue-700 dark:text-blue-200">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-100">成長進度</p>
                <div className="mt-2 space-y-1">
                  <p>對話累積：{spirit.dialogue_count}</p>
                  <p>信任值：{spirit.trust_level}</p>
                  {stageInfo && <p>當前階段：{stageInfo.label}</p>}
                </div>
              </div>
            )}

            {spirit && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">人格徽章</h3>
                {spiritBadges.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {spiritBadges.map((badge) => (
                      <Badge key={badge} variant="outline" className="px-3 py-1 text-xs">
                        {badge}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    尚未獲得徽章，持續互動即可解鎖新特質。
                  </p>
                )}
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">回憶片段</h3>
              {memorySnippets.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {memorySnippets.map((snippet, index) => (
                    <li
                      key={`${snippet}-${index}`}
                      className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs text-gray-700 dark:text-gray-200"
                    >
                      {snippet}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">一起創造屬於你們的回憶吧！</p>
              )}
            </div>

            <nav className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
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
                <div className="flex items-center space-x-2">
                  <h1 className="font-semibold text-gray-900 dark:text-white">
                    {spiritName}
                    {isRevoked && <span className="ml-2 text-xs text-red-500">（服務暫停）</span>}
                  </h1>
                  {!isRevoked && stageInfo && (
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                      {stageInfo.label}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isRevoked
                    ? '官方已暫停此幼靈服務，請查看善待協議。'
                    : stageInfo?.description || '在線中'}
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
