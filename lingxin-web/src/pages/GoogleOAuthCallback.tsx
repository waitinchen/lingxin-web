import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import LoadingScreen from '../components/LoadingScreen';
import { supabase } from '../lib/supabase';

const GoogleOAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // 從 URL 參數取得授權碼
        const urlParams = new URLSearchParams(location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const state = urlParams.get('state');

        if (error) {
          console.error('OAuth 錯誤:', error);
          toast.error(`登入失敗: ${error}`);
          navigate('/login');
          return;
        }

        if (!code) {
          console.error('未收到授權碼');
          toast.error('Google 登入過程中出現錯誤');
          navigate('/login');
          return;
        }

        // 呼叫後端進行代碼交換
        const currentUrl = window.location.origin;
        const redirectUri = `${currentUrl}/oauth/google/callback`;

        const { data, error: exchangeError } = await supabase.functions.invoke('google-oauth', {
          body: {
            action: 'exchange',
            code: code,
            redirect_uri: redirectUri
          }
        });

        if (exchangeError) {
          console.error('代碼交換錯誤:', exchangeError);
          toast.error('Google 登入處理失敗');
          navigate('/login');
          return;
        }

        if (data?.data) {
          const { user, token, is_new_user } = data.data;
          
          // 儲存認證 token
          localStorage.setItem('auth_token', token);
          
          // 更新 auth context
          await login(user, token);
          
          // 顯示成功訊息
          if (is_new_user) {
            toast.success(`歡迎 ${user.name || user.email}！您的帳戶已建立成功。`);
            navigate('/auth/welcome');
          } else {
            toast.success(`歡迎回來，${user.name || user.email}！`);
            navigate('/chat');
          }
        } else {
          throw new Error('無效的回應格式');
        }

      } catch (error) {
        console.error('Google OAuth 回調處理錯誤:', error);
        toast.error('登入過程中發生錯誤，請重試');
        navigate('/login');
      } finally {
        setProcessing(false);
      }
    };

    handleOAuthCallback();
  }, [location.search, navigate, login]);

  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900">
        <div className="text-center space-y-4">
          <LoadingScreen />
          <div className="text-lg font-medium text-gray-700 dark:text-gray-300">
            正在處理 Google 登入...
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            請稍候，我們正在驗證您的帳戶
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default GoogleOAuthCallback;