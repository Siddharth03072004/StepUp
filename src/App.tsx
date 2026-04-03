import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import { ThreeBackground } from "@/components/ui/ThreeBackground";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Topics from "./pages/Topics";
import TopicDetail from "./pages/TopicDetail";
import MyLearning from "./pages/MyLearning";
import StudyPlan from "./pages/StudyPlan";
import ModuleDetail from "./pages/ModuleDetail";
import Quiz from "./pages/Quiz";
import Feed from "./pages/Feed";
import Connections from "./pages/Connections";
import Messages from "./pages/Messages";
import Leaderboard from "./pages/Leaderboard";
import Playground from "./pages/Playground";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="relative isolate min-h-screen overflow-hidden">
            <ThreeBackground />
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<ProtectedRoute><MainLayout><Dashboard /></MainLayout></ProtectedRoute>} />
              <Route path="/topics" element={<ProtectedRoute><MainLayout><Topics /></MainLayout></ProtectedRoute>} />
              <Route path="/topics/:topicId" element={<ProtectedRoute><MainLayout><TopicDetail /></MainLayout></ProtectedRoute>} />
              <Route path="/my-learning" element={<ProtectedRoute><MainLayout><MyLearning /></MainLayout></ProtectedRoute>} />
              <Route path="/learn/:planId" element={<ProtectedRoute><MainLayout><StudyPlan /></MainLayout></ProtectedRoute>} />
              <Route path="/learn/:planId/module/:moduleId" element={<ProtectedRoute><MainLayout><ModuleDetail /></MainLayout></ProtectedRoute>} />
              <Route path="/quiz/:quizId" element={<ProtectedRoute><MainLayout><Quiz /></MainLayout></ProtectedRoute>} />
              <Route path="/feed" element={<ProtectedRoute><MainLayout><Feed /></MainLayout></ProtectedRoute>} />
              <Route path="/connections" element={<ProtectedRoute><MainLayout><Connections /></MainLayout></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><MainLayout><Messages /></MainLayout></ProtectedRoute>} />
              <Route path="/leaderboard" element={<ProtectedRoute><MainLayout><Leaderboard /></MainLayout></ProtectedRoute>} />
              <Route path="/playground" element={<ProtectedRoute><MainLayout><Playground /></MainLayout></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><MainLayout><Analytics /></MainLayout></ProtectedRoute>} />
              <Route path="/profile/:id" element={<ProtectedRoute><MainLayout><Profile /></MainLayout></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><MainLayout><Settings /></MainLayout></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
