-- =====================================================
-- StepUp Database Schema - Complete Setup
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE public.connection_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE public.difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE public.question_type AS ENUM ('mcq', 'true_false');

-- =====================================================
-- PROFILES TABLE
-- =====================================================

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    skills TEXT[] DEFAULT '{}',
    xp INTEGER DEFAULT 0 NOT NULL,
    level INTEGER DEFAULT 1 NOT NULL,
    current_streak INTEGER DEFAULT 0 NOT NULL,
    longest_streak INTEGER DEFAULT 0 NOT NULL,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    weekly_xp INTEGER DEFAULT 0 NOT NULL,
    total_study_time_minutes INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =====================================================
-- CONNECTIONS TABLE
-- =====================================================

CREATE TABLE public.connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    addressee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status connection_status DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(requester_id, addressee_id)
);

-- =====================================================
-- MESSAGES TABLE
-- =====================================================

CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =====================================================
-- POSTS TABLE
-- =====================================================

CREATE TABLE public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =====================================================
-- POST LIKES TABLE
-- =====================================================

CREATE TABLE public.post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(post_id, user_id)
);

-- =====================================================
-- POST COMMENTS TABLE
-- =====================================================

CREATE TABLE public.post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =====================================================
-- TOPICS TABLE
-- =====================================================

CREATE TABLE public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    difficulty difficulty_level DEFAULT 'beginner' NOT NULL,
    estimated_hours INTEGER DEFAULT 10 NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =====================================================
-- ENROLLMENTS TABLE
-- =====================================================

CREATE TABLE public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    progress_percentage INTEGER DEFAULT 0 NOT NULL,
    UNIQUE(user_id, topic_id)
);

-- =====================================================
-- STUDY PLANS TABLE
-- =====================================================

CREATE TABLE public.study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    estimated_hours INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(user_id, topic_id)
);

-- =====================================================
-- MODULES TABLE
-- =====================================================

CREATE TABLE public.modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_plan_id UUID REFERENCES public.study_plans(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    estimated_minutes INTEGER DEFAULT 30,
    is_completed BOOLEAN DEFAULT false NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =====================================================
-- NOTES TABLE
-- =====================================================

CREATE TABLE public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL UNIQUE,
    content TEXT NOT NULL,
    key_points TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =====================================================
-- QUIZZES TABLE
-- =====================================================

CREATE TABLE public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL UNIQUE,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =====================================================
-- QUIZ QUESTIONS TABLE
-- =====================================================

CREATE TABLE public.quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
    question_text TEXT NOT NULL,
    question_type question_type DEFAULT 'mcq' NOT NULL,
    options JSONB NOT NULL,
    correct_answer TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =====================================================
-- QUIZ ATTEMPTS TABLE
-- =====================================================

CREATE TABLE public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    answers JSONB NOT NULL,
    feedback TEXT,
    xp_earned INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =====================================================
-- ACHIEVEMENTS TABLE
-- =====================================================

CREATE TABLE public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    xp_reward INTEGER DEFAULT 0 NOT NULL,
    requirement_type TEXT NOT NULL,
    requirement_value INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =====================================================
-- USER ACHIEVEMENTS TABLE
-- =====================================================

CREATE TABLE public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE NOT NULL,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(user_id, achievement_id)
);

-- =====================================================
-- USER PROGRESS TABLE
-- =====================================================

CREATE TABLE public.user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    topic_id UUID REFERENCES public.topics(id) ON DELETE CASCADE NOT NULL,
    modules_completed INTEGER DEFAULT 0 NOT NULL,
    total_modules INTEGER DEFAULT 0 NOT NULL,
    quizzes_taken INTEGER DEFAULT 0 NOT NULL,
    average_score DECIMAL(5,2) DEFAULT 0 NOT NULL,
    study_time_minutes INTEGER DEFAULT 0 NOT NULL,
    last_studied_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(user_id, topic_id)
);

-- =====================================================
-- CODE SNIPPETS TABLE
-- =====================================================

CREATE TABLE public.code_snippets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    language TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_xp ON public.profiles(xp DESC);
CREATE INDEX idx_profiles_weekly_xp ON public.profiles(weekly_xp DESC);
CREATE INDEX idx_connections_requester ON public.connections(requester_id);
CREATE INDEX idx_connections_addressee ON public.connections(addressee_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX idx_posts_author ON public.posts(author_id);
CREATE INDEX idx_posts_created ON public.posts(created_at DESC);
CREATE INDEX idx_enrollments_user ON public.enrollments(user_id);
CREATE INDEX idx_enrollments_topic ON public.enrollments(topic_id);
CREATE INDEX idx_modules_study_plan ON public.modules(study_plan_id);
CREATE INDEX idx_quiz_attempts_user ON public.quiz_attempts(user_id);
CREATE INDEX idx_user_achievements_user ON public.user_achievements(user_id);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_snippets ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - PROFILES
-- =====================================================

CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES - CONNECTIONS
-- =====================================================

CREATE POLICY "Users can view their connections"
ON public.connections FOR SELECT
USING (
    requester_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR addressee_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can create connection requests"
ON public.connections FOR INSERT
WITH CHECK (requester_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update connection status they received"
ON public.connections FOR UPDATE
USING (addressee_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their connection requests"
ON public.connections FOR DELETE
USING (
    requester_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR addressee_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- =====================================================
-- RLS POLICIES - MESSAGES
-- =====================================================

CREATE POLICY "Users can view their messages"
ON public.messages FOR SELECT
USING (
    sender_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR receiver_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
WITH CHECK (sender_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their sent messages"
ON public.messages FOR UPDATE
USING (sender_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- =====================================================
-- RLS POLICIES - POSTS
-- =====================================================

CREATE POLICY "Posts are viewable by everyone"
ON public.posts FOR SELECT
USING (true);

CREATE POLICY "Users can create posts"
ON public.posts FOR INSERT
WITH CHECK (author_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own posts"
ON public.posts FOR UPDATE
USING (author_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own posts"
ON public.posts FOR DELETE
USING (author_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- =====================================================
-- RLS POLICIES - POST LIKES
-- =====================================================

CREATE POLICY "Post likes are viewable by everyone"
ON public.post_likes FOR SELECT
USING (true);

CREATE POLICY "Users can like posts"
ON public.post_likes FOR INSERT
WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can unlike posts"
ON public.post_likes FOR DELETE
USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- =====================================================
-- RLS POLICIES - POST COMMENTS
-- =====================================================

CREATE POLICY "Post comments are viewable by everyone"
ON public.post_comments FOR SELECT
USING (true);

CREATE POLICY "Users can create comments"
ON public.post_comments FOR INSERT
WITH CHECK (author_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own comments"
ON public.post_comments FOR UPDATE
USING (author_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own comments"
ON public.post_comments FOR DELETE
USING (author_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- =====================================================
-- RLS POLICIES - TOPICS
-- =====================================================

CREATE POLICY "Topics are viewable by everyone"
ON public.topics FOR SELECT
USING (true);

-- =====================================================
-- RLS POLICIES - ENROLLMENTS
-- =====================================================

CREATE POLICY "Users can view their enrollments"
ON public.enrollments FOR SELECT
USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can enroll in topics"
ON public.enrollments FOR INSERT
WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their enrollments"
ON public.enrollments FOR UPDATE
USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can unenroll from topics"
ON public.enrollments FOR DELETE
USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- =====================================================
-- RLS POLICIES - STUDY PLANS
-- =====================================================

CREATE POLICY "Users can view their study plans"
ON public.study_plans FOR SELECT
USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create study plans"
ON public.study_plans FOR INSERT
WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their study plans"
ON public.study_plans FOR UPDATE
USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- =====================================================
-- RLS POLICIES - MODULES
-- =====================================================

CREATE POLICY "Users can view their modules"
ON public.modules FOR SELECT
USING (
    study_plan_id IN (
        SELECT id FROM public.study_plans 
        WHERE user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Users can create modules"
ON public.modules FOR INSERT
WITH CHECK (
    study_plan_id IN (
        SELECT id FROM public.study_plans 
        WHERE user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Users can update their modules"
ON public.modules FOR UPDATE
USING (
    study_plan_id IN (
        SELECT id FROM public.study_plans 
        WHERE user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
);

-- =====================================================
-- RLS POLICIES - NOTES
-- =====================================================

CREATE POLICY "Users can view their notes"
ON public.notes FOR SELECT
USING (
    module_id IN (
        SELECT m.id FROM public.modules m
        JOIN public.study_plans sp ON m.study_plan_id = sp.id
        WHERE sp.user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Users can create notes"
ON public.notes FOR INSERT
WITH CHECK (
    module_id IN (
        SELECT m.id FROM public.modules m
        JOIN public.study_plans sp ON m.study_plan_id = sp.id
        WHERE sp.user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Users can update their notes"
ON public.notes FOR UPDATE
USING (
    module_id IN (
        SELECT m.id FROM public.modules m
        JOIN public.study_plans sp ON m.study_plan_id = sp.id
        WHERE sp.user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
);

-- =====================================================
-- RLS POLICIES - QUIZZES
-- =====================================================

CREATE POLICY "Users can view their quizzes"
ON public.quizzes FOR SELECT
USING (
    module_id IN (
        SELECT m.id FROM public.modules m
        JOIN public.study_plans sp ON m.study_plan_id = sp.id
        WHERE sp.user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Users can create quizzes"
ON public.quizzes FOR INSERT
WITH CHECK (
    module_id IN (
        SELECT m.id FROM public.modules m
        JOIN public.study_plans sp ON m.study_plan_id = sp.id
        WHERE sp.user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
);

-- =====================================================
-- RLS POLICIES - QUIZ QUESTIONS
-- =====================================================

CREATE POLICY "Users can view quiz questions"
ON public.quiz_questions FOR SELECT
USING (
    quiz_id IN (
        SELECT q.id FROM public.quizzes q
        JOIN public.modules m ON q.module_id = m.id
        JOIN public.study_plans sp ON m.study_plan_id = sp.id
        WHERE sp.user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
);

CREATE POLICY "Users can create quiz questions"
ON public.quiz_questions FOR INSERT
WITH CHECK (
    quiz_id IN (
        SELECT q.id FROM public.quizzes q
        JOIN public.modules m ON q.module_id = m.id
        JOIN public.study_plans sp ON m.study_plan_id = sp.id
        WHERE sp.user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
);

-- =====================================================
-- RLS POLICIES - QUIZ ATTEMPTS
-- =====================================================

CREATE POLICY "Users can view their quiz attempts"
ON public.quiz_attempts FOR SELECT
USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create quiz attempts"
ON public.quiz_attempts FOR INSERT
WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- =====================================================
-- RLS POLICIES - ACHIEVEMENTS
-- =====================================================

CREATE POLICY "Achievements are viewable by everyone"
ON public.achievements FOR SELECT
USING (true);

-- =====================================================
-- RLS POLICIES - USER ACHIEVEMENTS
-- =====================================================

CREATE POLICY "User achievements are viewable by everyone"
ON public.user_achievements FOR SELECT
USING (true);

CREATE POLICY "System can grant achievements"
ON public.user_achievements FOR INSERT
WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- =====================================================
-- RLS POLICIES - USER PROGRESS
-- =====================================================

CREATE POLICY "Users can view their progress"
ON public.user_progress FOR SELECT
USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create progress"
ON public.user_progress FOR INSERT
WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their progress"
ON public.user_progress FOR UPDATE
USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- =====================================================
-- RLS POLICIES - CODE SNIPPETS
-- =====================================================

CREATE POLICY "Users can view their code snippets"
ON public.code_snippets FOR SELECT
USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create code snippets"
ON public.code_snippets FOR INSERT
WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their code snippets"
ON public.code_snippets FOR UPDATE
USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their code snippets"
ON public.code_snippets FOR DELETE
USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to calculate level from XP
CREATE OR REPLACE FUNCTION public.calculate_level(xp_amount INTEGER)
RETURNS INTEGER AS $$
BEGIN
    IF xp_amount <= 500 THEN RETURN 1;
    ELSIF xp_amount <= 1500 THEN RETURN 2;
    ELSIF xp_amount <= 3500 THEN RETURN 3;
    ELSIF xp_amount <= 7000 THEN RETURN 4;
    ELSIF xp_amount <= 12000 THEN RETURN 5;
    ELSIF xp_amount <= 20000 THEN RETURN 6;
    ELSIF xp_amount <= 32000 THEN RETURN 7;
    ELSIF xp_amount <= 50000 THEN RETURN 8;
    ELSIF xp_amount <= 75000 THEN RETURN 9;
    ELSIF xp_amount <= 100000 THEN RETURN 10;
    ELSE RETURN 10 + ((xp_amount - 100000) / 25000);
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to add XP and update level
CREATE OR REPLACE FUNCTION public.add_xp(profile_id UUID, xp_to_add INTEGER)
RETURNS void AS $$
DECLARE
    new_xp INTEGER;
    new_level INTEGER;
BEGIN
    UPDATE public.profiles
    SET 
        xp = xp + xp_to_add,
        weekly_xp = weekly_xp + xp_to_add,
        level = public.calculate_level(xp + xp_to_add),
        updated_at = now()
    WHERE id = profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Create profile on new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamps
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_connections_updated_at
    BEFORE UPDATE ON public.connections
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON public.posts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_post_comments_updated_at
    BEFORE UPDATE ON public.post_comments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_topics_updated_at
    BEFORE UPDATE ON public.topics
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_study_plans_updated_at
    BEFORE UPDATE ON public.study_plans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_modules_updated_at
    BEFORE UPDATE ON public.modules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON public.notes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at
    BEFORE UPDATE ON public.user_progress
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_code_snippets_updated_at
    BEFORE UPDATE ON public.code_snippets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ENABLE REALTIME FOR MESSAGES
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.connections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;

-- =====================================================
-- INSERT DEFAULT ACHIEVEMENTS
-- =====================================================

INSERT INTO public.achievements (name, description, icon, xp_reward, requirement_type, requirement_value) VALUES
('First Steps', 'Complete your first module', '🏅', 50, 'modules_completed', 1),
('Bookworm', 'Complete 10 modules', '📚', 200, 'modules_completed', 10),
('Scholar', 'Complete 25 modules', '🎓', 500, 'modules_completed', 25),
('Quiz Master', 'Score 100% on 5 quizzes', '🧠', 300, 'perfect_quizzes', 5),
('On Fire', 'Maintain a 7-day streak', '🔥', 150, 'streak', 7),
('Dedicated Learner', 'Maintain a 30-day streak', '⭐', 500, 'streak', 30),
('Rising Star', 'Reach Level 10', '🌟', 400, 'level', 10),
('Networker', 'Make 10 connections', '👥', 100, 'connections', 10),
('Social Butterfly', 'Make 50 connections', '🦋', 300, 'connections', 50),
('Code Warrior', 'Run 50 programs', '💻', 200, 'code_runs', 50),
('Topic Explorer', 'Enroll in 5 topics', '🗺️', 100, 'topics_enrolled', 5),
('Knowledge Seeker', 'Complete 3 topics', '📖', 400, 'topics_completed', 3);

-- =====================================================
-- INSERT SAMPLE TOPICS
-- =====================================================

INSERT INTO public.topics (title, description, category, difficulty, estimated_hours, image_url) VALUES
('Python Fundamentals', 'Learn the basics of Python programming including variables, data types, control flow, and functions.', 'Programming', 'beginner', 20, 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=400'),
('JavaScript Essentials', 'Master JavaScript from the ground up - variables, functions, DOM manipulation, and ES6+ features.', 'Programming', 'beginner', 25, 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400'),
('React Development', 'Build modern web applications with React - components, hooks, state management, and routing.', 'Web Development', 'intermediate', 30, 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400'),
('Data Science with Python', 'Explore data analysis, visualization, and machine learning with Python libraries.', 'Data Science', 'intermediate', 40, 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400'),
('Machine Learning Basics', 'Introduction to ML algorithms, model training, and evaluation techniques.', 'Data Science', 'advanced', 50, 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400'),
('Web Design Principles', 'Learn UI/UX design fundamentals, color theory, typography, and responsive design.', 'Design', 'beginner', 15, 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400'),
('SQL & Database Design', 'Master SQL queries, database design, normalization, and optimization techniques.', 'Database', 'intermediate', 25, 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400'),
('TypeScript Mastery', 'Level up your JavaScript with TypeScript - types, interfaces, generics, and advanced patterns.', 'Programming', 'intermediate', 20, 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=400'),
('Node.js Backend', 'Build scalable backend services with Node.js, Express, and RESTful APIs.', 'Web Development', 'intermediate', 35, 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400'),
('Algorithms & Data Structures', 'Essential algorithms and data structures for coding interviews and problem solving.', 'Computer Science', 'advanced', 45, 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400'),
('Cloud Computing Basics', 'Introduction to cloud services, deployment, and infrastructure management.', 'DevOps', 'intermediate', 30, 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400'),
('Mobile App Development', 'Build cross-platform mobile apps using React Native fundamentals.', 'Mobile', 'intermediate', 35, 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400');