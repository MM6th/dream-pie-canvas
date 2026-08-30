import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import NewUserUITestPage from '@/pages/NewUserUITestPage';
import ExperienceSwitcher from '@/components/ExperienceSwitcher';
import { Button } from '@/components/ui/button';

/**
 * The redesigned PIE app, running as a real experience (not the admin sandbox).
 * Identity comes from the signed-in user.
 */
const NewApp = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [identity, setIdentity] = useState<{ username: string; email: string } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/', { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      const p = data as { display_name?: string | null } | null;
      setIdentity({
        username: p?.display_name || user.email?.split('@')[0] || 'You',
        email: user.email ?? '',
      });
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading, navigate]);

  if (loading || !ready) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  return (
    <div className="relative">
      <div className="fixed top-3 right-3 z-50 flex items-center gap-2">
        <ExperienceSwitcher />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          aria-label="Sign out"
          title="Sign out"
          className="h-8 w-8 text-foreground hover:bg-destructive hover:text-destructive-foreground"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
      <NewUserUITestPage mode="app" identity={identity} stateKey={user ? `user-${user.id}` : undefined} />
    </div>
  );
};

export default NewApp;
