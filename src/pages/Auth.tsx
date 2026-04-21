import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type Mode = 'login' | 'register' | 'forgot';

export default function Auth() {
  const [mode, setMode] = useState<Mode>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [lockInfo, setLockInfo] = useState<{ locked: boolean; minutes?: number } | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const { login, register, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in (but wait for auth to finish loading)
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/app', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setRemainingAttempts(null);
    setLockInfo(null);

    try {
      if (mode === 'forgot') {
        const { api } = await import('@/lib/api');
        await api.requestPasswordReset(email);
        setResetSent(true);
        toast.success('Password reset link sent to your email');
      } else if (mode === 'register') {
        await register(email, password, name);
        toast.success('Account created successfully!');
        navigate('/app');
      } else {
        await login(email, password);
        toast.success('Welcome back!');
        navigate('/app');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      
      if (err.locked) {
        setLockInfo({ locked: true, minutes: err.remainingMinutes });
        setError(`Account locked for ${err.remainingMinutes} minutes due to too many failed attempts`);
      } else if (err.remainingAttempts !== undefined) {
        setRemainingAttempts(err.remainingAttempts);
        setError(err.error || 'Invalid credentials');
      } else {
        setError(err.error || 'An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError('');
    setRemainingAttempts(null);
    setLockInfo(null);
    setResetSent(false);
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border/60">
        <div className="container flex items-center justify-between h-16">
          <Logo />
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-card rounded-3xl shadow-lift p-8 border border-border/60">
            <div className="text-center mb-8">
              <h1 className="font-display text-3xl font-semibold text-secondary mb-2">
                {mode === 'login' && 'Welcome back'}
                {mode === 'register' && 'Create account'}
                {mode === 'forgot' && 'Reset password'}
              </h1>
              <p className="text-muted-foreground">
                {mode === 'login' && 'Sign in to access your stash'}
                {mode === 'register' && 'Start saving your favorite things'}
                {mode === 'forgot' && 'We\'ll send you a reset link'}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {resetSent ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="text-center py-8"
                >
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-display text-xl text-secondary mb-2">Check your email</h3>
                  <p className="text-muted-foreground text-sm mb-6">
                    We've sent a password reset link to {email}
                  </p>
                  <Button onClick={() => switchMode('login')} variant="outline" className="rounded-full">
                    Back to login
                  </Button>
                </motion.div>
              ) : (
                <motion.form
                  key={mode}
                  initial={{ opacity: 0, x: mode === 'register' ? 20 : mode === 'forgot' ? -20 : 0 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: mode === 'register' ? -20 : 20 }}
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >
                  {mode === 'register' && (
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="name"
                          type="text"
                          placeholder="Your name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="pl-10 rounded-full"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 rounded-full"
                        required
                      />
                    </div>
                  </div>

                  {mode !== 'forgot' && (
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 rounded-full"
                          required
                          minLength={8}
                        />
                      </div>
                      {mode === 'register' && (
                        <p className="text-xs text-muted-foreground">At least 8 characters</p>
                      )}
                    </div>
                  )}

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2"
                      >
                        <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-destructive">{error}</p>
                          {remainingAttempts !== null && remainingAttempts > 0 && (
                            <p className="text-xs text-destructive/80 mt-1">
                              {remainingAttempts} {remainingAttempts === 1 ? 'attempt' : 'attempts'} remaining
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Button
                    type="submit"
                    disabled={loading || lockInfo?.locked}
                    className="w-full rounded-full gradient-primary text-primary-foreground shadow-pink h-11"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Please wait...
                      </>
                    ) : (
                      <>
                        {mode === 'login' && 'Sign in'}
                        {mode === 'register' && 'Create account'}
                        {mode === 'forgot' && 'Send reset link'}
                      </>
                    )}
                  </Button>

                  <div className="text-center space-y-2 pt-2">
                    {mode === 'login' && (
                      <>
                        <button
                          type="button"
                          onClick={() => switchMode('forgot')}
                          className="text-sm text-muted-foreground hover:text-secondary transition-colors"
                        >
                          Forgot password?
                        </button>
                        <div className="text-sm text-muted-foreground">
                          Don't have an account?{' '}
                          <button
                            type="button"
                            onClick={() => switchMode('register')}
                            className="text-primary hover:underline font-medium"
                          >
                            Sign up
                          </button>
                        </div>
                      </>
                    )}
                    {mode === 'register' && (
                      <div className="text-sm text-muted-foreground">
                        Already have an account?{' '}
                        <button
                          type="button"
                          onClick={() => switchMode('login')}
                          className="text-primary hover:underline font-medium"
                        >
                          Sign in
                        </button>
                      </div>
                    )}
                    {mode === 'forgot' && (
                      <button
                        type="button"
                        onClick={() => switchMode('login')}
                        className="text-sm text-muted-foreground hover:text-secondary transition-colors"
                      >
                        Back to login
                      </button>
                    )}
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            By continuing, you agree to our{' '}
            <Link to="/terms" className="hover:text-secondary transition-colors">Terms</Link>
            {' & '}
            <Link to="/privacy" className="hover:text-secondary transition-colors">Privacy Policy</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
