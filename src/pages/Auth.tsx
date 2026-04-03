import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Brain,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Lock,
  Mail,
  Sparkles,
  Target,
  User,
} from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const nameSchema = z.string().min(2, 'Name must be at least 2 characters');

const highlights = [
  {
    icon: Brain,
    title: 'AI-guided study plans',
    copy: 'Turn any topic into a paced, structured learning path in seconds.',
  },
  {
    icon: Target,
    title: 'Track real progress',
    copy: 'Show milestones, streaks, and quiz outcomes with visual clarity.',
  },
  {
    icon: Sparkles,
    title: 'Presentation-ready experience',
    copy: 'Modern motion, polished surfaces, and a cleaner academic brand feel.',
  },
];

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const validateForm = (isSignUp: boolean) => {
    const nextErrors: Record<string, string> = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      nextErrors.email = emailResult.error.errors[0].message;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      nextErrors.password = passwordResult.error.errors[0].message;
    }

    if (isSignUp) {
      const nameResult = nameSchema.safeParse(fullName);
      if (!nameResult.success) {
        nextErrors.fullName = nameResult.error.errors[0].message;
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm(false)) return;

    setIsLoading(true);
    const { error } = await signIn(email, password);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Welcome back!');
    }

    setIsLoading(false);
  };

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm(true)) return;

    setIsLoading(true);
    const { error } = await signUp(email, password, fullName);

    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('This email is already registered. Please sign in.');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Account created successfully! Welcome to StepUp.');
    }

    setIsLoading(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(160deg,rgba(15,23,42,0.84),rgba(8,15,30,0.72))] shadow-[0_40px_120px_-55px_rgba(15,23,42,0.95)] backdrop-blur-2xl lg:grid-cols-[1.05fr,0.95fr]">
        <div className="relative hidden overflow-hidden border-r border-white/10 p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.16),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(251,191,36,0.14),transparent_24%)]" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="rounded-[1.2rem] border border-primary/20 bg-primary/10 p-3">
                <GraduationCap className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-slate-400">StepUp</p>
                <h1 className="text-2xl font-bold text-white">Learning Hub</h1>
              </div>
            </div>

            <div className="mt-10 max-w-xl space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200/75">Tomorrow's Demo</p>
              <h2 className="text-5xl font-bold leading-tight text-white">
                Make the platform feel
                <span className="text-gradient"> unforgettable.</span>
              </h2>
              <p className="text-lg leading-8 text-slate-200/72">
                Step into a cleaner, richer learning experience built to showcase AI planning, guided practice, and visible learner momentum.
              </p>
            </div>

            <div className="mt-10 grid gap-4">
              {highlights.map((highlight, index) => {
                const Icon = highlight.icon;

                return (
                  <motion.div
                    key={highlight.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index, duration: 0.4 }}
                    className="surface-outline rounded-[1.5rem] p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{highlight.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-300/68">{highlight.copy}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="relative flex flex-wrap gap-3">
            <div className="metric-chip">AI plans in minutes</div>
            <div className="metric-chip">Streaks and analytics</div>
            <div className="metric-chip">Better visual polish</div>
          </div>
        </div>

        <div className="flex items-center justify-center p-6 sm:p-8 lg:p-10">
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md"
          >
            <div className="mb-8 text-center lg:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200/75">Access Portal</p>
              <h2 className="mt-3 text-4xl font-bold text-white">Sign in to continue</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300/68">
                Jump back into your study cockpit, open your latest plan, and keep the interface feeling sharp from the very first screen.
              </p>
            </div>

            <Card className="overflow-hidden">
              <Tabs defaultValue="signin">
                <CardHeader className="border-b border-white/10 bg-white/[0.04] pb-5">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="signin">Sign In</TabsTrigger>
                    <TabsTrigger value="signup">Create Account</TabsTrigger>
                  </TabsList>
                </CardHeader>

                <CardContent className="p-6">
                  <TabsContent value="signin" className="mt-0">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email">Email</Label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                          <Input
                            id="signin-email"
                            type="email"
                            placeholder="you@example.com"
                            className="pl-11"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                          />
                        </div>
                        {errors.email ? <p className="text-sm text-destructive">{errors.email}</p> : null}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signin-password">Password</Label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                          <Input
                            id="signin-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter your password"
                            className="pl-11 pr-11"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                          />
                          <button
                            type="button"
                            className="absolute right-4 top-3 text-slate-400 transition hover:text-white"
                            onClick={() => setShowPassword((value) => !value)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {errors.password ? <p className="text-sm text-destructive">{errors.password}</p> : null}
                      </div>

                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                        Sign In
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="mt-0">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Full Name</Label>
                        <div className="relative">
                          <User className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                          <Input
                            id="signup-name"
                            type="text"
                            placeholder="Jane Learner"
                            className="pl-11"
                            value={fullName}
                            onChange={(event) => setFullName(event.target.value)}
                          />
                        </div>
                        {errors.fullName ? <p className="text-sm text-destructive">{errors.fullName}</p> : null}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="you@example.com"
                            className="pl-11"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                          />
                        </div>
                        {errors.email ? <p className="text-sm text-destructive">{errors.email}</p> : null}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                          <Input
                            id="signup-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="At least 6 characters"
                            className="pl-11 pr-11"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                          />
                          <button
                            type="button"
                            className="absolute right-4 top-3 text-slate-400 transition hover:text-white"
                            onClick={() => setShowPassword((value) => !value)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {errors.password ? <p className="text-sm text-destructive">{errors.password}</p> : null}
                      </div>

                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Create Account
                      </Button>
                    </form>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>

            <p className="mt-5 text-center text-sm text-slate-300/60">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
