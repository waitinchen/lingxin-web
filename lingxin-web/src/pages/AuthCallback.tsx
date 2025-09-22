import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import LoadingScreen from '@/components/LoadingScreen';
import toast from 'react-hot-toast';

export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    async function handleCallback() {
      try {
        console.log('Handling OAuth callback...');
        
        // Check if there's a token in the URL parameters
        const urlParams = new URLSearchParams(location.search);
        const token = urlParams.get('token');
        const isNewUser = urlParams.get('new_user') === 'true';
        
        if (token) {
          // If we have a token, verify it with our backend
          const { data, error } = await supabase.functions.invoke('google-oauth', {
            body: { action: 'verify', token }
          });
          
          if (error || !data?.data?.user) {
            throw new Error('驗證登入狀態失敗');
          }
          
          console.log('Token verified successfully');
          toast.success('登入成功！');
          
          // Redirect based on whether user is new
          if (isNewUser) {
            navigate('/auth/welcome', { replace: true });
          } else {
            navigate('/chat', { replace: true });
          }
          return;
        }
        
        // If no token, check for standard OAuth callback parameters
        const hashFragment = location.hash;
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        
        if (error) {
          console.error('OAuth error:', error);
          toast.error('登入失敗：' + error);
          navigate('/login', { replace: true });
          return;
        }
        
        if (hashFragment && hashFragment.length > 1) {
          // Handle Supabase OAuth callback
          const { data, error } = await supabase.auth.exchangeCodeForSession(hashFragment);
          
          if (error) {
            console.error('Error exchanging code for session:', error);
            toast.error('登入失敗：' + error.message);
            navigate('/login', { replace: true });
            return;
          }
          
          if (data.session) {
            console.log('Session established successfully');
            toast.success('登入成功！');
            navigate('/chat', { replace: true });
            return;
          }
        }
        
        // If we get here, something went wrong
        console.warn('No valid OAuth data found');
        toast.error('登入狀態異常，請重新登入');
        navigate('/login', { replace: true });
        
      } catch (error: any) {
        console.error('Callback handling error:', error);
        toast.error(error.message || '登入失敗，請稍後再試');
        navigate('/login', { replace: true });
      } finally {
        setProcessing(false);
      }
    }

    handleCallback();
  }, [navigate, location]);

  if (processing) {
    return <LoadingScreen message="正在處理登入資訊..." />;
  }

  return null;
}