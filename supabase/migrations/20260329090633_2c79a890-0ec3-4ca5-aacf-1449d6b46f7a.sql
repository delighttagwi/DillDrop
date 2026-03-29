
-- Fix overly permissive notification insert policy
DROP POLICY "Anyone can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');
