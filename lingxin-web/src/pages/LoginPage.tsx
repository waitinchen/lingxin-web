import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import './LoginPage.css';

type AuthMode = 'signin' | 'signup' | 'reset';

type NotificationState = {
  message: string;
  type: 'success' | 'error' | 'info';
  show: boolean;
};

export default function LoginPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, loading } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [notification, setNotification] = useState<NotificationState | null>(null);

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotification = useCallback((message: string, type: NotificationState['type'] = 'info') => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    if (removeTimerRef.current) {
      clearTimeout(removeTimerRef.current);
    }

    setNotification({ message, type, show: true });

    hideTimerRef.current = setTimeout(() => {
      setNotification((prev) => (prev ? { ...prev, show: false } : prev));
    }, 3600);

    removeTimerRef.current = setTimeout(() => {
      setNotification(null);
    }, 4000);
  }, []);

  useEffect(() => {
    const welcomeTimer = setTimeout(() => {
      showNotification('歡迎來到 LINchat！', 'info');
    }, 500);

    return () => {
      clearTimeout(welcomeTimer);
    };
  }, [showNotification]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
      if (removeTimerRef.current) {
        clearTimeout(removeTimerRef.current);
      }
    };
  }, []);

  const handleModeSwitch = useCallback((nextMode: AuthMode) => {
    setMode(nextMode);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setEmailLoading(false);

    if (nextMode === 'reset') {
      showNotification('請輸入註冊時的電子郵件，我們會寄送重置連結。', 'info');
    }
  }, [showNotification]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'reset') {
      if (!email) {
        showNotification('請輸入電子郵件地址。', 'error');
        return;
      }

      setEmailLoading(true);
      try {
        await resetPassword(email);
        setMode('signin');
        setPassword('');
        setConfirmPassword('');
      } catch (error) {
        console.error(error);
      } finally {
        setEmailLoading(false);
      }
      return;
    }

    if (!email) {
      showNotification('請輸入電子郵件地址。', 'error');
      return;
    }

    if (!password) {
      showNotification('請輸入密碼。', 'error');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      showNotification('兩次輸入的密碼不一致。', 'error');
      return;
    }

    setEmailLoading(true);
    try {
      if (mode === 'signup') {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setEmailLoading(false);
    }
  };

  const isGoogleLoading = loading && !emailLoading;
  const isEmailSubmitting = emailLoading || (loading && mode !== 'reset');

  return (
    <div className="lin-login-page">
      <div className="lin-golden-spiral-bg">
        <svg className="lin-spiral-svg" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M 400 300 Q 350 250 400 200 Q 500 200 500 300 Q 500 400 400 400 Q 300 400 300 300 Q 300 250 350 250"
            fill="none"
            stroke="rgba(214,180,80,0.4)"
            strokeWidth="2"
          />
          <path
            d="M 400 300 Q 320 220 400 140 Q 580 140 580 300 Q 580 460 400 460 Q 220 460 220 300 Q 220 180 340 180"
            fill="none"
            stroke="rgba(214,180,80,0.3)"
            strokeWidth="1"
          />
          <circle cx="400" cy="300" r="80" fill="none" stroke="rgba(183,157,247,0.2)" strokeWidth="1" />
          <circle cx="350" cy="275" r="30" fill="none" stroke="rgba(183,157,247,0.3)" strokeWidth="1" />
        </svg>

        <svg className="lin-spiral-svg-2" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M 50 300 Q 50 50 300 50 Q 750 50 750 300 Q 750 550 500 550 Q 150 550 150 300 Q 150 150 300 150"
            fill="none"
            stroke="rgba(214,180,80,0.2)"
            strokeWidth="1"
          />
        </svg>

        <div className="lin-golden-lines">
          <div className="lin-golden-line-h"></div>
          <div className="lin-golden-line-v"></div>
        </div>
      </div>

      <div className="lin-login-container">
        <div className="lin-logo">
          <p className="lin-subtitle">Your soul companion!</p>
          <h1>
            LINchat <span className="lin-beta">[Beta]</span>
          </h1>
        </div>

        <form className="lin-login-form" onSubmit={handleEmailAuth}>
          <div className="lin-form-group">
            <label htmlFor="email">電子郵件</label>
            <div className="lin-input-wrapper">
              <input
                id="email"
                type="email"
                className="lin-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="請輸入您的電子郵件"
                disabled={loading || emailLoading}
                required
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div className="lin-form-group">
              <label htmlFor="password">密碼</label>
              <div className="lin-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="lin-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="請輸入您的密碼"
                  disabled={loading || emailLoading}
                  required
                />
                <div className="lin-password-toggle">
                  <button type="button" onClick={() => setShowPassword((prev) => !prev)} aria-label="切換密碼可見性">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div className="lin-form-group">
              <label htmlFor="confirmPassword">確認密碼</label>
              <div className="lin-input-wrapper">
                <input
                  id="confirmPassword"
                  type="password"
                  className="lin-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="請再次輸入密碼"
                  disabled={loading || emailLoading}
                  required
                />
              </div>
              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-red-300">密碼不匹配</p>
              )}
            </div>
          )}

          {mode !== 'reset' ? (
            <div className="lin-options">
              <label className="lin-remember-me">
                <span className="lin-checkbox">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    aria-label="記住我"
                  />
                  <span className="lin-checkmark"></span>
                </span>
                記住我
              </label>
              <button type="button" className="lin-forgot-link" onClick={() => handleModeSwitch('reset')}>
                忘記密碼？
              </button>
            </div>
          ) : (
            <div className="lin-reset-hint">請輸入註冊時的電子郵件地址，我們將寄送重置密碼連結。</div>
          )}

          <button
            type="submit"
            className={`lin-login-btn${isEmailSubmitting ? ' lin-loading' : ''}`}
            disabled={loading || emailLoading || (mode === 'signup' && password !== confirmPassword)}
          >
            {mode === 'signin' && (isEmailSubmitting ? '登入中…' : '登入 LINchat')}
            {mode === 'signup' && (isEmailSubmitting ? '註冊中…' : '註冊 LINchat')}
            {mode === 'reset' && (isEmailSubmitting ? '發送中…' : '發送重置連結')}
          </button>
        </form>

        {mode !== 'reset' && (
          <>
            <div className="lin-divider">或</div>
            <button
              type="button"
              className={`lin-google-btn${isGoogleLoading ? ' lin-loading' : ''}`}
              onClick={() => void signInWithGoogle()}
              disabled={loading || emailLoading}
            >
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M21.35 11.1h-9.17v2.98h5.26c-.23 1.27-.93 2.34-1.98 3.06v2.54h3.2c1.88-1.73 2.96-4.28 2.96-7.2 0-.7-.06-1.38-.17-2.04z"
                />
                <path
                  fill="#34A853"
                  d="M12.18 22c2.69 0 4.94-.89 6.58-2.43l-3.2-2.54c-.89.6-2.03.96-3.38.96-2.6 0-4.8-1.76-5.59-4.13H3.29v2.6C4.91 19.78 8.27 22 12.18 22z"
                />
                <path
                  fill="#FBBC05"
                  d="M6.59 13.86c-.2-.6-.32-1.24-.32-1.9s.12-1.3.32-1.9V7.46H3.29C2.53 8.92 2.09 10.5 2.09 12.21c0 1.7.44 3.29 1.2 4.75l3.3-3.1z"
                />
                <path
                  fill="#EA4335"
                  d="M12.18 6.4c1.46 0 2.78.5 3.82 1.47l2.86-2.86C16.01 2.93 13.77 2 11.39 2 7.48 2 4.12 4.22 2.5 7.46l3.3 3.1c.8-2.37 2.99-4.16 5.58-4.16z"
                />
              </svg>
              <span>{isGoogleLoading ? '連線中…' : '使用 Google 登入'}</span>
            </button>
          </>
        )}

        <div className="lin-bottom-links">
          {mode === 'signin' && (
            <>
              還沒有帳戶？
              <button type="button" onClick={() => handleModeSwitch('signup')}>
                立即註冊
              </button>
            </>
          )}
          {mode === 'signup' && (
            <>
              已有帳戶？
              <button type="button" onClick={() => handleModeSwitch('signin')}>
                立即登入
              </button>
            </>
          )}
          {mode === 'reset' && (
            <>
              想起密碼了？
              <button type="button" onClick={() => handleModeSwitch('signin')}>
                返回登入
              </button>
            </>
          )}
        </div>
      </div>

      {notification && (
        <div className={`lin-notification lin-${notification.type}${notification.show ? ' lin-show' : ''}`}>
          {notification.message}
        </div>
      )}
    </div>
  );
}

