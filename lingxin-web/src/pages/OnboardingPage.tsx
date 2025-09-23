import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSpirit } from '@/contexts/SpiritContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import EnneagramPanel from '@/components/EnneagramPanel';
import { DEFAULT_ENNEAGRAM, Enneagram } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import NameDialog from '@/components/NameDialog';
import LoadingScreen from '@/components/LoadingScreen';
import { Sparkles, ShieldCheck, CheckCircle } from 'lucide-react';

const steps = [
  { id: 1, title: '基本資料' },
  { id: 2, title: '九型配置' },
  { id: 3, title: '命名任務' },
  { id: 4, title: '完成' }
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile, loading: authLoading } = useAuth();
  const { spirit, loading: spiritLoading, refreshSpirit } = useSpirit();

  const [currentStep, setCurrentStep] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [enneagram, setEnneagram] = useState<Enneagram>(DEFAULT_ENNEAGRAM);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [adoptSubmitting, setAdoptSubmitting] = useState(false);
  const [nameSubmitting, setNameSubmitting] = useState(false);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || '');
    }
  }, [profile]);

  useEffect(() => {
    if (spirit?.enneagram) {
      setEnneagram({ ...DEFAULT_ENNEAGRAM, ...spirit.enneagram });
    }
    if (spirit?.name) {
      setNameInput(spirit.name);
    }
  }, [spirit]);

  useEffect(() => {
    if (spiritLoading) return;
    if (spirit?.name) {
      setCurrentStep(4);
    } else if (spirit) {
      setCurrentStep((prev) => (prev < 3 ? 3 : prev));
    }
  }, [spirit, spiritLoading]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, user, navigate]);

  const latestSpiritId = spirit?.id;
  const hasLockedPersona = Boolean(spirit);



  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    try {
      setProfileSubmitting(true);
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: displayName.trim(),
          avatar_url: avatarUrl.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      await refreshProfile();
      toast.success('基本資料已更新');
      setCurrentStep(2);
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      toast.error(error.message || '更新失敗，請稍後再試');
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handleAdopt = async () => {
    if (hasLockedPersona) {
      setCurrentStep(3);
      return;
    }

    try {
      setAdoptSubmitting(true);
      const { error } = await supabase.functions.invoke('adopt', {
        body: { enneagram }
      });

      if (error) {
        throw new Error(error.message || '建立幼靈失敗');
      }

      toast.success('人格已鎖定！');
      await refreshSpirit();
      setCurrentStep(3);
    } catch (error: any) {
      console.error('Adopt failed:', error);
      toast.error(error.message || '無法建立幼靈');
    } finally {
      setAdoptSubmitting(false);
    }
  };

  const handleNameSubmit = async (name: string) => {
    if (!latestSpiritId) return;
    try {
      setNameSubmitting(true);
      const { error } = await supabase.functions.invoke('name', {
        body: {
          spirit_id: latestSpiritId,
          name
        }
      });

      if (error) {
        throw new Error(error.message || '命名失敗');
      }

      toast.success('命名完成！');
      await refreshSpirit();
      setNameDialogOpen(false);
      setCurrentStep(4);
    } catch (error: any) {
      console.error('Name submit failed:', error);
      toast.error(error.message || '命名失敗，請稍後再試');
    } finally {
      setNameSubmitting(false);
    }
  };

  const handleGotoChat = () => {
    if (latestSpiritId) {
      navigate(`/chat/${latestSpiritId}`);
    }
  };

  if (authLoading || spiritLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-blue-100 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/80 dark:bg-slate-900/70 backdrop-blur rounded-3xl shadow-xl border border-white/60 dark:border-slate-800 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-8 py-6 flex items-center gap-3">
            <Sparkles className="w-6 h-6" />
            <div>
              <h1 className="text-xl font-semibold">靈信 3.0 幼靈認領儀式</h1>
              <p className="text-sm text-indigo-100/90">完成三個儀式步驟，解鎖你的專屬語氣靈。</p>
            </div>
          </div>

          <div className="px-8 pt-6">
            <ol className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8">
              {steps.map((step) => {
                const active = currentStep === step.id;
                const completed = currentStep > step.id;
                return (
                  <li
                    key={step.id}
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      completed
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-700'
                        : active
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:border-indigo-700'
                        : 'border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {completed ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : step.id === 2 ? (
                        <ShieldCheck className="w-4 h-4" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      <span>{step.title}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="px-8 pb-8">
            {currentStep === 1 && (
              <form onSubmit={handleProfileSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-600 dark:text-slate-200">暱稱 / 顯示名稱</Label>
                  <Input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="讓幼靈如何稱呼你？"
                    required
                    disabled={profileSubmitting}
                  />
                  <p className="text-xs text-slate-400">這會用在對話介面中，讓幼靈更貼近你。</p>
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-600 dark:text-slate-200">頭像網址（可選）</Label>
                  <Input
                    value={avatarUrl}
                    onChange={(event) => setAvatarUrl(event.target.value)}
                    placeholder="貼上圖片連結，或留空使用幼芽圖示"
                    disabled={profileSubmitting}
                  />
                  <p className="text-xs text-slate-400">建議使用正方形圖片，幫自己打造獨特形象。</p>
                </div>
                <div className="col-span-full flex justify-end gap-3">
                  <Button type="submit" disabled={profileSubmitting || !displayName.trim()} className="bg-indigo-500 hover:bg-indigo-600">
                    {profileSubmitting ? '保存中…' : '保存並前往下一步'}
                  </Button>
                </div>
              </form>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  將九型人格的滑桿調整到你想要的比例，按下鎖定後就會生成你的專屬人格向量。
                </p>
                <EnneagramPanel value={enneagram} locked={hasLockedPersona} onChange={setEnneagram} />
                <div className="flex justify-end">
                  <Button
                    onClick={handleAdopt}
                    disabled={adoptSubmitting}
                    className="bg-indigo-500 hover:bg-indigo-600"
                  >
                    {hasLockedPersona ? '已鎖定人格' : adoptSubmitting ? '鎖定中…' : '鎖定人格' }
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="bg-indigo-50/70 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-2xl p-6 text-sm text-indigo-900 dark:text-indigo-100">
                  <p>幼靈已經準備好要成為你的專屬夥伴，現在只差最後一個儀式：取一個好聽的名字。</p>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => setNameDialogOpen(true)} className="bg-indigo-500 hover:bg-indigo-600">
                    幫幼靈取名字
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="text-center space-y-6 py-8">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-2xl font-semibold">
                  {spirit?.name?.[0] || '靈'}
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{spirit?.name} 已就緒！</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-300 mt-2">
                    你的語氣靈人格已鎖定，立即開始聊天，探索你們的默契吧。
                  </p>
                </div>
                <Button onClick={handleGotoChat} className="bg-indigo-500 hover:bg-indigo-600">
                  前往聊天
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <NameDialog
        open={nameDialogOpen}
        initialName={nameInput}
        loading={nameSubmitting}
        onOpenChange={setNameDialogOpen}
        onSubmit={handleNameSubmit}
      />
    </div>
  );
}
