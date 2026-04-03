import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  BarChart3,
  BookMarked,
  BookOpen,
  CalendarDays,
  Code,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  Newspaper,
  Settings,
  Sparkles,
  Trophy,
  Users,
  X,
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/', label: 'Dashboard', icon: Home, helper: 'Your momentum hub' },
  { path: '/topics', label: 'Topics', icon: BookOpen, helper: 'Discover new tracks' },
  { path: '/my-learning', label: 'My Learning', icon: GraduationCap, helper: 'Continue active plans' },
  { path: '/feed', label: 'Feed', icon: Newspaper, helper: 'Share progress' },
  { path: '/connections', label: 'Connections', icon: Users, helper: 'Grow your network' },
  { path: '/messages', label: 'Messages', icon: MessageCircle, helper: 'Stay in sync' },
  { path: '/leaderboard', label: 'Leaderboard', icon: Trophy, helper: 'See top learners' },
  { path: '/playground', label: 'Playground', icon: Code, helper: 'Build and experiment' },
  { path: '/analytics', label: 'Analytics', icon: BarChart3, helper: 'Read your growth data' },
];

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const location = useLocation();
  const navigate = useNavigate();

  const currentSection =
    navItems.find((item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)) ||
    navItems[0];
  const levelProgress = profile ? Math.min(((profile.xp % 500) / 500) * 100, 100) : 0;
  const firstName = profile?.full_name?.split(' ')[0] || 'Learner';

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-transparent text-foreground">
      <header className="glass-panel fixed left-3 right-3 top-3 z-50 flex h-16 items-center rounded-2xl px-4 lg:hidden">
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex flex-1 items-center justify-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-2">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-[0.32em] text-slate-400">StepUp</p>
              <span className="text-sm font-semibold text-white">{currentSection.label}</span>
            </div>
          </Link>
        </div>
        <Link to={`/profile/${profile?.id}`}>
          <Avatar className="h-9 w-9 ring-2 ring-white/10">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback>{profile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
        </Link>
      </header>

      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-slate-950/75 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          'glass-panel fixed bottom-4 left-4 top-4 z-50 flex w-[18rem] transform flex-col rounded-[2rem] transition-transform duration-300 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-[115%]',
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
            <Link to="/" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
              <div className="rounded-2xl border border-primary/20 bg-primary/10 p-2.5 shadow-[0_0_30px_rgba(56,189,248,0.22)]">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Learning Hub</p>
                <span className="text-xl font-bold text-white">StepUp</span>
              </div>
            </Link>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="border-b border-white/10 p-5">
            <Link
              to={`/profile/${profile?.id}`}
              onClick={() => setSidebarOpen(false)}
              className="surface-outline block rounded-[1.5rem] p-4 transition duration-300 hover:border-primary/30 hover:bg-white/[0.05]"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 ring-2 ring-white/10">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback>{profile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{profile?.full_name || 'User'}</p>
                  <p className="text-sm text-slate-300/68">Welcome back, {firstName}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Level</p>
                  <p className="mt-1 font-semibold text-white">{profile?.level || 1}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">XP</p>
                  <p className="mt-1 font-semibold text-white">{profile?.xp || 0}</p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-400">
                  <span>Next level</span>
                  <span>{Math.round(levelProgress)}%</span>
                </div>
                <Progress value={levelProgress} />
              </div>
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-5">
            <div className="mb-3 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Demo Navigation
            </div>
            <ul className="space-y-2">
              {navItems.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== '/' && location.pathname.startsWith(`${item.path}/`));

                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        'group flex items-center gap-3 rounded-2xl border px-3 py-3 transition duration-300',
                        isActive
                          ? 'border-primary/20 bg-primary/12 text-white shadow-[0_18px_40px_-28px_rgba(56,189,248,0.95)]'
                          : 'border-transparent text-slate-300/68 hover:border-white/10 hover:bg-white/[0.05] hover:text-white',
                      )}
                    >
                      <div
                        className={cn(
                          'rounded-xl border border-white/10 bg-white/[0.05] p-2 transition duration-300',
                          isActive
                            ? 'border-primary/25 bg-primary/15 text-primary'
                            : 'group-hover:border-primary/20 group-hover:text-primary',
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium">{item.label}</p>
                        <p className="truncate text-xs text-slate-400">{item.helper}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="space-y-2 border-t border-white/10 p-4">
            <Link
              to="/settings"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 rounded-2xl border border-white/10 px-3 py-3 text-slate-300/72 transition duration-300 hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </Link>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/10 px-3 py-3 text-slate-300/72 transition duration-300 hover:border-destructive/30 hover:bg-destructive/10 hover:text-white"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="min-h-screen lg:pl-[21rem]">
        <div className="px-4 pb-8 pt-24 sm:px-6 lg:px-8 lg:pt-6">
          <div className="mx-auto max-w-7xl">
            <div className="glass-panel mb-6 hidden items-center justify-between rounded-[1.75rem] px-5 py-4 lg:flex">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">Current View</p>
                <div className="mt-2 flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-white">{currentSection.label}</h2>
                  <span className="metric-chip">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    Demo ready for tomorrow
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild variant="outline">
                  <Link to="/topics">
                    <BookMarked className="h-4 w-4" />
                    Explore Topics
                  </Link>
                </Button>
                <Button asChild>
                  <Link to="/playground">
                    <ArrowUpRight className="h-4 w-4" />
                    Open Playground
                  </Link>
                </Button>
              </div>
            </div>

            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              {children}
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
