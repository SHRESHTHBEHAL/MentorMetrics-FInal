-- MentorMetrics Database Schema

-- 1. Create sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'uploaded',
    stages_completed JSONB DEFAULT '[]'::jsonb,
    mentor_score FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create transcripts table
CREATE TABLE IF NOT EXISTS public.transcripts (
    session_id UUID PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    segments JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create audio_features table
CREATE TABLE IF NOT EXISTS public.audio_features (
    session_id UUID PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
    wpm FLOAT NOT NULL,
    silence_ratio FLOAT NOT NULL,
    clarity_score FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create visual_evaluations table
CREATE TABLE IF NOT EXISTS public.visual_evaluations (
    session_id UUID PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
    face_visibility_score FLOAT NOT NULL,
    gaze_forward_score FLOAT NOT NULL,
    gesture_score FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create text_evaluations table
CREATE TABLE IF NOT EXISTS public.text_evaluations (
    session_id UUID PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
    clarity FLOAT NOT NULL,
    structure FLOAT NOT NULL,
    technical_correctness FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create final_scores table
CREATE TABLE IF NOT EXISTS public.final_scores (
    session_id UUID PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
    engagement FLOAT NOT NULL,
    communication_clarity FLOAT NOT NULL,
    technical_correctness FLOAT NOT NULL,
    pacing_structure FLOAT NOT NULL,
    interactive_quality FLOAT NOT NULL,
    mentor_score FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create reports table
CREATE TABLE IF NOT EXISTS public.reports (
    session_id UUID PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
    improvements JSONB NOT NULL DEFAULT '[]'::jsonb,
    actionable_tips JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security) and add basic policies to allow public access for now
-- (Since the app currently doesn't enforce strict auth matching per user_id yet)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visual_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.text_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all operations on sessions" ON public.sessions FOR ALL USING (true);
CREATE POLICY "Allow public all operations on transcripts" ON public.transcripts FOR ALL USING (true);
CREATE POLICY "Allow public all operations on audio_features" ON public.audio_features FOR ALL USING (true);
CREATE POLICY "Allow public all operations on visual_evaluations" ON public.visual_evaluations FOR ALL USING (true);
CREATE POLICY "Allow public all operations on text_evaluations" ON public.text_evaluations FOR ALL USING (true);
CREATE POLICY "Allow public all operations on final_scores" ON public.final_scores FOR ALL USING (true);
CREATE POLICY "Allow public all operations on reports" ON public.reports FOR ALL USING (true);
