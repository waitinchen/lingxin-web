import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if we have a valid password reset token
    const checkToken = async () => {
      try {
        const hashFragment = location.hash;
        
        if (hashFragment && hashFragment.includes('type=recovery')) {
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Error checking session:', error);
            toast.error('重置連結無效或已過期');
            navigate('/login', { replace: true });
            return;
          }
          
          if (data.session) {
            setIsValidToken(true);
          } else {
            toast.error('重置連結無效或已過期');
            navigate('/login', { replace: true });
            return;
          }
        } else {
          toast.error('缺少重置令牌');
          navigate('/login', { replace: true });
          return;
        }
      } catch (error) {
        console.error('Token check error:', error);
        toast.error('驗證重置連結時發生錯誤');
        navigate('/login', { replace: true });
      } finally {
        setChecking(false);
      }
    };

    checkToken();
  }, [navigate, location]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast.error('請填寫所有欄位');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('密碼不匹配');
      return;
    }
    
    if (password.length < 6) {
      toast.error('密碼長度至少需要6個字符');
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) {
        throw error;
      }
      
      toast.success('密碼重置成功！請使用新密碼登入');
      navigate('/login', { replace: true });
      
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(error.message || '重置密碼失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span>驗證重置連結中...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidToken) {
    return null; // Will be redirected
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/70 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <h2 className="text-2xl font-bold text-gray-900">
            重置密碼
          </h2>
          <p className="text-gray-600">
            請輸入您的新密碼
          </p>
        </CardHeader>
        
        <CardContent className="pt-6">
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">新密碼</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="請輸入新密碼"
                  disabled={loading}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">確認新密碼</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="請再次輸入新密碼"
                disabled={loading}
                required
                minLength={6}
              />
              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-red-500">密碼不匹配</p>
              )}
            </div>
            
            <Button
              type="submit"
              className="w-full h-12"
              disabled={loading || password !== confirmPassword}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>重置中...</span>
                </div>
              ) : (
                '重置密碼'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-blue-600 hover:underline text-sm"
            >
              返回登入頁面
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
