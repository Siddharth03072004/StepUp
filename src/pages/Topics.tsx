import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Clock3,
  Filter,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

const categories = [
  'All',
  'Programming',
  'Web Development',
  'Data Science',
  'Computer Science',
  'DevOps',
  'Mobile',
  'Design',
  'Database',
];

const difficulties = ['All', 'beginner', 'intermediate', 'advanced'];

const difficultyStyles: Record<string, string> = {
  beginner: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  intermediate: 'border-amber-300/20 bg-amber-300/10 text-amber-100',
  advanced: 'border-rose-400/20 bg-rose-400/10 text-rose-100',
};

export default function Topics() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');

  const { data: topics, isLoading } = useQuery({
    queryKey: ['topics'],
    queryFn: async () => {
      const { data, error } = await supabase.from('topics').select('*').order('title');
      if (error) throw error;
      return data;
    },
  });

  const { data: enrollmentCounts } = useQuery({
    queryKey: ['enrollment-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('enrollments').select('topic_id');
      if (error) throw error;

      const counts: Record<string, number> = {};
      data.forEach((enrollment: any) => {
        counts[enrollment.topic_id] = (counts[enrollment.topic_id] || 0) + 1;
      });

      return counts;
    },
  });

  const filteredTopics = topics?.filter((topic: any) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      topic.title.toLowerCase().includes(query) || topic.description?.toLowerCase().includes(query);
    const matchesCategory = selectedCategory === 'All' || topic.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'All' || topic.difficulty === selectedDifficulty;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const totalHours = filteredTopics?.reduce((sum: number, topic: any) => sum + (topic.estimated_hours || 0), 0) || 0;
  const activeFilterCount = [selectedCategory !== 'All', selectedDifficulty !== 'All', !!searchQuery].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Discovery Deck"
        title="Explore topic"
        highlight="experiences"
        description="Browse polished learning tracks, filter by depth and category, and surface the next topic that will make tomorrow's demo feel thoughtful and complete."
        badge={activeFilterCount ? `${activeFilterCount} filters active` : 'Full catalog'}
        metrics={[
          { label: 'Topics found', value: `${filteredTopics?.length || 0}`, icon: BookOpen },
          { label: 'Categories', value: `${categories.length - 1}`, icon: Filter },
          { label: 'Hours mapped', value: `${totalHours}h`, icon: Clock3 },
          { label: 'Trending', value: selectedDifficulty === 'All' ? 'All levels' : selectedDifficulty, icon: Sparkles },
        ]}
        actions={
          <Link
            to="/my-learning"
            className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-[linear-gradient(135deg,rgba(103,232,249,0.98)_0%,rgba(56,189,248,0.95)_45%,rgba(251,191,36,0.9)_100%)] px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_-18px_rgba(56,189,248,0.9)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-18px_rgba(56,189,248,0.85)]"
          >
            <Sparkles className="h-4 w-4" />
            View My Queue
          </Link>
        }
      />

      <Card>
        <CardContent className="p-5">
          <div className="grid gap-4 lg:grid-cols-[1.5fr,0.7fr,0.55fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by title, concept, or outcome"
                className="pl-11"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger>
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                {difficulties.map((difficulty) => (
                  <SelectItem key={difficulty} value={difficulty}>
                    {difficulty === 'All' ? 'All levels' : difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="secondary">{filteredTopics?.length || 0} results</Badge>
            <Badge variant="secondary">{activeFilterCount ? 'Focused search' : 'Showing full catalog'}</Badge>
            {selectedCategory !== 'All' ? <Badge variant="secondary">{selectedCategory}</Badge> : null}
            {selectedDifficulty !== 'All' ? <Badge variant="secondary">{selectedDifficulty}</Badge> : null}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <div className="h-44 animate-pulse bg-white/[0.05]" />
              <CardContent className="space-y-3 p-5">
                <div className="h-5 w-2/5 animate-pulse rounded-full bg-white/[0.06]" />
                <div className="h-8 animate-pulse rounded-xl bg-white/[0.06]" />
                <div className="h-4 w-5/6 animate-pulse rounded-full bg-white/[0.06]" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTopics && filteredTopics.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filteredTopics.map((topic: any, index: number) => (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.35 }}
            >
              <Link to={`/topics/${topic.id}`} className="group block h-full">
                <Card className="h-full overflow-hidden">
                  <div className="relative h-48 overflow-hidden border-b border-white/10">
                    {topic.image_url ? (
                      <img
                        src={topic.image_url}
                        alt={topic.title}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.2),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.16),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.95),rgba(15,23,42,0.7))]" />
                    )}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(3,7,18,0.92))]" />
                    <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                      <Badge variant="secondary">{topic.category}</Badge>
                      <Badge className={difficultyStyles[topic.difficulty] || ''}>{topic.difficulty}</Badge>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-300/70">StepUp Track</p>
                        <h3 className="mt-2 text-2xl font-semibold text-white">{topic.title}</h3>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3 text-white transition duration-300 group-hover:border-primary/30 group-hover:text-primary">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  <CardContent className="space-y-5 p-5">
                    <p className="line-clamp-3 text-sm leading-6 text-slate-300/70">
                      {topic.description || 'An AI-assisted path that turns core concepts into guided notes, quizzes, and progress milestones.'}
                    </p>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                        <div className="flex items-center gap-2 text-slate-300/70">
                          <Clock3 className="h-4 w-4 text-primary" />
                          Duration
                        </div>
                        <p className="mt-2 font-semibold text-white">{topic.estimated_hours} hours</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                        <div className="flex items-center gap-2 text-slate-300/70">
                          <Users className="h-4 w-4 text-primary" />
                          Enrolled
                        </div>
                        <p className="mt-2 font-semibold text-white">{enrollmentCounts?.[topic.id] || 0} learners</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-300/70">Open the topic to preview the full learning journey.</p>
                      <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200/80">
                        View Track
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-white/10 bg-white/[0.05]">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mt-6 text-2xl font-semibold text-white">No topics match this filter set</h3>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-300/68">
              Widen the search, reset a filter, or try a broader category to bring more study tracks back into view.
            </p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setSelectedDifficulty('All');
              }}
            >
              Reset Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
