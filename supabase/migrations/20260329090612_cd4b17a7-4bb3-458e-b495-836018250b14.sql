
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('retailer', 'customer', 'ngo');

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  discounted_price DECIMAL(10,2),
  quantity INTEGER NOT NULL DEFAULT 0,
  expiry_date DATE,
  category TEXT,
  image_url TEXT,
  is_donated BOOLEAN DEFAULT false,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products viewable by everyone" ON public.products FOR SELECT USING (true);
CREATE POLICY "Retailers can insert own products" ON public.products FOR INSERT WITH CHECK (auth.uid() = retailer_id);
CREATE POLICY "Retailers can update own products" ON public.products FOR UPDATE USING (auth.uid() = retailer_id);
CREATE POLICY "Retailers can delete own products" ON public.products FOR DELETE USING (auth.uid() = retailer_id);

-- Donations table
CREATE TABLE public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  retailer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ngo_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'requested', 'accepted', 'collected')),
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Donations viewable by everyone" ON public.donations FOR SELECT USING (true);
CREATE POLICY "Retailers can create donations" ON public.donations FOR INSERT WITH CHECK (auth.uid() = retailer_id);
CREATE POLICY "Retailers can update own donations" ON public.donations FOR UPDATE USING (auth.uid() = retailer_id);
CREATE POLICY "NGOs can update requested donations" ON public.donations FOR UPDATE USING (auth.uid() = ngo_id);

-- NGO documents
CREATE TABLE public.ngo_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ngo_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_url TEXT NOT NULL,
  document_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ngo_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "NGOs can view own documents" ON public.ngo_documents FOR SELECT USING (auth.uid() = ngo_id);
CREATE POLICY "NGOs can upload documents" ON public.ngo_documents FOR INSERT WITH CHECK (auth.uid() = ngo_id);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  type TEXT DEFAULT 'info',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_donations_updated_at BEFORE UPDATE ON public.donations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

CREATE POLICY "Product images are public" ON storage.objects FOR SELECT USING (bucket_id = 'products');
CREATE POLICY "Authenticated users can upload product images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');
CREATE POLICY "Users can view own documents" ON storage.objects FOR SELECT USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload own documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
