import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Sparkles, ArrowRight, User } from 'lucide-react';

export default function WelcomePage() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSkip = () => {
    navigate('/chat');
  };

  const handleComplete = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Update or create user profile
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          full_name: fullName.trim() || user.user_metadata?.full_name || user.email?.split('@')[0],
          avatar_url: user.user_metadata?.avatar_url,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        throw error;
      }

      // Refresh profile in context
      await refreshProfile();
      
      toast.success('歡迎加入靈信！');
      navigate('/chat');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('更新資料失敗：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="shadow-2xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              歡迎使用靈信！
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              讓我們先設定你的個人資料，讓靈信更了解你
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Profile setup */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  {user?.user_metadata?.avatar_url ? (
                    <img 
                      src={user.user_metadata.avatar_url} 
                      alt="Avatar" 
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">登入帳號</p>
                  <p className="font-medium text-gray-900 dark:text-white">{user?.email}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fullName">顯示名稱</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="請輸入你的名稱"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  這將成為靈信稱呼你的方式
                </p>
              </div>
            </div>
            
            {/* Features preview */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                靈信的特色功能：
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• 九靈記憶系統：記住你的偏好和習慣</li>
                <li>• Mark-1 承諾引擎：幫你管理提醒和任務</li>
                <li>• 智能啟動詞：三選一快捷操作</li>
                <li>• 行事曆同步：承諾自動同步到行事曆</li>
              </ul>
            </div>
            
            {/* Action buttons */}
            <div className="space-y-3">
              <Button 
                onClick={handleComplete}
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>設定中...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>完成設定</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={handleSkip}
                className="w-full text-gray-600 dark:text-gray-400"
              >
                略過，直接使用
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}