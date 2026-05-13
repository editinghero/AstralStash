import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User as UserIcon, Mail, Lock, Palette, Loader2, Check, AlertTriangle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useAI } from '@/contexts/AIContext';
import { AISettingsDialog } from '@/components/AISettingsDialog';

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const { config, isConfigured } = useAI();

  const [name, setName] = useState(user?.name || '');
  const [selectedColor, setSelectedColor] = useState(user?.profile_color || '');
  const [colors, setColors] = useState<string[]>([]);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);

  useEffect(() => {
    const fetchColors = async () => {
      try {
        const { colors } = await api.getProfileColors();
        setColors(colors);
      } catch (error) {
        console.error('Failed to fetch colors:', error);
      }
    };
    fetchColors();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProfile(true);
    setProfileSaved(false);

    try {
      const updates: any = {};
      if (name !== user?.name) updates.name = name;
      if (selectedColor !== user?.profile_color) updates.profile_color = selectedColor;

      if (Object.keys(updates).length === 0) {
        toast.info('No changes to save');
        setLoadingProfile(false);
        return;
      }

      const { user: updatedUser } = await api.updateProfile(updates);
      updateUser(updatedUser);
      setProfileSaved(true);
      toast.success('Profile updated successfully');
      
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (error: any) {
      toast.error(error.error || 'Failed to update profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoadingPassword(true);

    try {
      await api.changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.error || 'Failed to change password');
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
    toast.success('Logged out successfully');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    setDeletingAccount(true);
    try {
      // Call delete account API endpoint
      await api.deleteAccount();
      logout();
      navigate('/');
      toast.success('Account deleted successfully');
    } catch (error: any) {
      toast.error(error.error || 'Failed to delete account');
      setDeletingAccount(false);
    }
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border/60">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/app')}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Logo />
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="container max-w-2xl py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div>
            <h1 className="font-display text-4xl font-semibold text-secondary mb-2">Profile Settings</h1>
            <p className="text-muted-foreground">Manage your account and preferences</p>
          </div>

          {/* Profile Section */}
          <div className="bg-card rounded-3xl shadow-soft p-8 border border-border/60">
            <h2 className="font-display text-2xl text-secondary mb-6">Profile Information</h2>
            
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={user.email}
                    disabled
                    className="pl-10 rounded-full bg-muted/50"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 rounded-full"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Profile Color
                </Label>
                <div className="grid grid-cols-6 gap-3">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className="relative aspect-square rounded-xl transition-all hover:scale-110"
                      style={{ backgroundColor: color }}
                    >
                      {selectedColor === color && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <div className="w-6 h-6 rounded-full bg-white dark:bg-black flex items-center justify-center shadow-lg">
                            <Check className="w-4 h-4 text-primary" />
                          </div>
                        </motion.div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                disabled={loadingProfile}
                className="rounded-full gradient-primary text-primary-foreground shadow-pink"
              >
                {loadingProfile ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : profileSaved ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Saved!
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </form>
          </div>

          {/* AI Features Section */}
          <div className="bg-card rounded-3xl shadow-soft p-8 border border-border/60">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="font-display text-2xl text-secondary">AI Features</h2>
              {isConfigured && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                  Configured ✓
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Connect an AI provider to unlock auto-tagging, summaries, smart search, and chat with your knowledge base.
              Your API key is encrypted and stored securely in the database.
            </p>
            {isConfigured && config && (
              <p className="text-xs text-muted-foreground font-mono mb-4 p-3 bg-muted/50 rounded-xl">
                Provider: {config.type === "gemini" ? `Gemini (${config.model})` : `${config.baseUrl} · ${config.modelId}`}
              </p>
            )}
            <Button onClick={() => setAiSettingsOpen(true)} className="rounded-full" variant="outline">
              <Sparkles className="w-4 h-4 mr-2" />
              {isConfigured ? "Update AI Settings" : "Set Up AI"}
            </Button>
          </div>

          {/* Password Section */}
          <div className="bg-card rounded-3xl shadow-soft p-8 border border-border/60">
            <h2 className="font-display text-2xl text-secondary mb-6">Change Password</h2>
            
            <form onSubmit={handleChangePassword} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pl-10 rounded-full"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 rounded-full"
                    required
                    minLength={8}
                  />
                </div>
                <p className="text-xs text-muted-foreground">At least 8 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 rounded-full"
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loadingPassword}
                className="rounded-full gradient-primary text-primary-foreground shadow-pink"
              >
                {loadingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Changing...
                  </>
                ) : (
                  'Change Password'
                )}
              </Button>
            </form>
          </div>

          {/* Danger Zone */}
          <div className="bg-card rounded-3xl shadow-soft p-8 border border-destructive/20">
            <h2 className="font-display text-2xl text-secondary mb-2">Danger Zone</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Irreversible actions that affect your account.
            </p>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/60">
                <div>
                  <h3 className="font-medium text-secondary mb-1">Log Out</h3>
                  <p className="text-sm text-muted-foreground">Sign out of your account on this device.</p>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="rounded-full shrink-0"
                >
                  Log Out
                </Button>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="font-medium text-destructive mb-1">Delete Account</h3>
                  <p className="text-sm text-muted-foreground">Permanently delete your account and all data. This cannot be undone.</p>
                </div>
                <Button
                  onClick={() => setShowDeleteDialog(true)}
                  variant="destructive"
                  className="rounded-full shrink-0"
                >
                  Delete Account
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <AlertDialogTitle className="font-display text-2xl">Delete Account?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base">
              This will permanently delete your account and all associated data including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All saved links, notes, and ideas</li>
                <li>Collections and tags</li>
                <li>Profile information</li>
              </ul>
              <p className="mt-4 font-medium text-destructive">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Label htmlFor="delete-confirm" className="text-sm font-medium">
              Type <span className="font-mono font-bold">DELETE</span> to confirm
            </Label>
            <Input
              id="delete-confirm"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="DELETE"
              className="mt-2 rounded-full"
              disabled={deletingAccount}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full" disabled={deletingAccount}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmation !== 'DELETE' || deletingAccount}
              className="rounded-full bg-destructive hover:bg-destructive/90"
            >
              {deletingAccount ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Account'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AI Settings Dialog */}
      <AISettingsDialog open={aiSettingsOpen} onOpenChange={setAiSettingsOpen} />
    </div>
  );
}
