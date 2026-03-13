-- community_posts table
CREATE TABLE public.community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    nickname TEXT NOT NULL DEFAULT '익명',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    view_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL
);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read posts" ON public.community_posts FOR SELECT USING (is_deleted = false);
CREATE POLICY "Logged in users can insert" ON public.community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.community_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.community_posts FOR DELETE USING (auth.uid() = user_id);

-- community_comments table
CREATE TABLE public.community_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    nickname TEXT NOT NULL DEFAULT '익명',
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    is_deleted BOOLEAN DEFAULT false NOT NULL
);

ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read comments" ON public.community_comments FOR SELECT USING (is_deleted = false);
CREATE POLICY "Logged in users can insert comments" ON public.community_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.community_comments FOR DELETE USING (auth.uid() = user_id);
