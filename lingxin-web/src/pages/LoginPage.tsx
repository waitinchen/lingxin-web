import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, MessageCircle, Clock, Shield, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, loading } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'reset') {
      if (!email) {
        return;
      }
      setEmailLoading(true);
      try {
        await resetPassword(email);
        setMode('signin');
        setEmail('');
      } finally {
        setEmailLoading(false);
      }
      return;
    }
    
    if (!email || !password) {
      return;
    }
    
    if (mode === 'signup' && password !== confirmPassword) {
      return;
    }
    
    setEmailLoading(true);
    try {
      if (mode === 'signup') {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } finally {
      setEmailLoading(false);
    }
  };

  const features = [
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: '智能對話',
      description: '溫暖、有個性的AI助理，能記住你的偏好和習慣'
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: '承諾管理',
      description: 'Mark-1引擎幫你管理承諾和提醒，永不忘記'
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: '智能啟動',
      description: '三選一智能啟動詞，讓對話更加流暢自然'
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: '隐私安全',
      description: '所有數據都加密储存，保障你的隐私安全'
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left side - Branding and Features */}
          <div className="text-center md:text-left">
            <div className="mb-8">
              <div className="flex justify-center md:justify-start mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                靈信 2.0
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                具備九靈記憶的智能對話助理
              </p>
            </div>
            
            <div className="grid gap-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3 text-left">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Right side - Login Card */}
          <div className="flex justify-center">
            <Card className="w-full max-w-md shadow-2xl border-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
              <CardHeader className="text-center pb-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  歡迎使用靈信
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  請登入以開始你的智能對話體驗
                </p>
              </CardHeader>
              
              <CardContent className="pt-6">
                <Button
                  onClick={signInWithGoogle}
                  disabled={loading || emailLoading}
                  className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 shadow-sm"
                  variant="outline"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                      <span>登入中...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span>使用 Google 登入</span>
                    </div>
                  )}
                </Button>
                
                {/* Divider */}
                <div className="my-6 flex items-center">
                  <div className="flex-grow border-t border-gray-300"></div>
                  <span className="px-4 text-sm text-gray-500">或使用電子郵件</span>
                  <div className="flex-grow border-t border-gray-300"></div>
                </div>
                
                {/* Email Auth Form */}
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">電子郵件</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your-email@example.com"
                      disabled={loading || emailLoading}
                      required
                    />
                  </div>
                  
                  {mode !== 'reset' && (
                    <div className="space-y-2">
                      <Label htmlFor="password">密碼</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="請輸入密碼"
                          disabled={loading || emailLoading}
                          required
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
                  )}
                  
                  {mode === 'signup' && (
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">確認密碼</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="請再次輸入密碼"
                        disabled={loading || emailLoading}
                        required
                      />
                      {password && confirmPassword && password !== confirmPassword && (
                        <p className="text-sm text-red-500">密碼不匹配</p>
                      )}
                    </div>
                  )}
                  
                  <Button
                    type="submit"
                    className="w-full h-12"
                    disabled={loading || emailLoading || (mode === 'signup' && password !== confirmPassword)}
                  >
                    {emailLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>
                          {mode === 'signin' && '登入中...'}
                          {mode === 'signup' && '註冊中...'}
                          {mode === 'reset' && '發送中...'}
                        </span>
                      </div>
                    ) : (
                      <span>
                        {mode === 'signin' && '登入'}
                        {mode === 'signup' && '註冊'}
                        {mode === 'reset' && '發送重置連結'}
                      </span>
                    )}
                  </Button>
                </form>
                
                {/* Mode Switch */}
                <div className="mt-6 text-center text-sm">
                  {mode === 'signin' && (
                    <div className="space-y-2">
                      <p className="text-gray-600">
                        還沒有帳戶？
                        <button
                          type="button"
                          onClick={() => {
                            setMode('signup');
                            setPassword('');
                            setConfirmPassword('');
                          }}
                          className="text-blue-600 hover:underline ml-1"
                        >
                          註冊
                        </button>
                      </p>
                      <p className="text-gray-600">
                        忘記密碼？
                        <button
                          type="button"
                          onClick={() => {
                            setMode('reset');
                            setPassword('');
                            setConfirmPassword('');
                          }}
                          className="text-blue-600 hover:underline ml-1"
                        >
                          重置密碼
                        </button>
                      </p>
                    </div>
                  )}
                  
                  {mode === 'signup' && (
                    <p className="text-gray-600">
                      已有帳戶？
                      <button
                        type="button"
                        onClick={() => {
                          setMode('signin');
                          setPassword('');
                          setConfirmPassword('');
                        }}
                        className="text-blue-600 hover:underline ml-1"
                      >
                        登入
                      </button>
                    </p>
                  )}
                  
                  {mode === 'reset' && (
                    <p className="text-gray-600">
                      想起密碼了？
                      <button
                        type="button"
                        onClick={() => {
                          setMode('signin');
                          setPassword('');
                          setConfirmPassword('');
                        }}
                        className="text-blue-600 hover:underline ml-1"
                      >
                        返回登入
                      </button>
                    </p>
                  )}
                </div>
                
                <div className="mt-6 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    登入即表示你同意我們的
                    <span className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer mx-1">
                      使用條款
                    </span>
                    和
                    <span className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer ml-1">
                      隱私政策
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}