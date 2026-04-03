-- Fix function search path mutable warning
-- Update calculate_level function with explicit search_path
DROP FUNCTION IF EXISTS public.calculate_level(INTEGER);
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
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;

-- Create storage bucket for post images
INSERT INTO storage.buckets (id, name, public) VALUES ('post-images', 'post-images', true) ON CONFLICT DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for post images
CREATE POLICY "Post images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'post-images');

CREATE POLICY "Users can upload post images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their post images"
ON storage.objects FOR DELETE
USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);