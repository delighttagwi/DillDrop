-- Drop the existing restrictive policy and add a public read policy
DROP POLICY IF EXISTS "NGOs can view own documents" ON public.ngo_documents;

CREATE POLICY "Anyone authenticated can view ngo documents"
ON public.ngo_documents
FOR SELECT
TO authenticated
USING (true);