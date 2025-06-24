
-- Create user profiles table with roles
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('level1', 'level2', 'admin')) DEFAULT 'level1',
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create trigger to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'level1')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create quote fields configuration table
CREATE TABLE public.quote_fields (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'number', 'select', 'textarea', 'date')),
  required BOOLEAN NOT NULL DEFAULT FALSE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  options JSONB,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create products table
CREATE TABLE public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  cost DECIMAL(10,2),
  category TEXT,
  subcategory TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create quotes table
CREATE TABLE public.quotes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  oracle_customer_id TEXT NOT NULL,
  sfdc_opportunity TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'under-review')) DEFAULT 'pending',
  original_quote_value DECIMAL(12,2) NOT NULL,
  requested_discount DECIMAL(5,2) NOT NULL,
  discounted_value DECIMAL(12,2) NOT NULL,
  total_cost DECIMAL(12,2) NOT NULL,
  original_margin DECIMAL(5,2) NOT NULL,
  discounted_margin DECIMAL(5,2) NOT NULL,
  gross_profit DECIMAL(12,2) NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('High', 'Medium', 'Low', 'Urgent')) DEFAULT 'Medium',
  payment_terms TEXT NOT NULL,
  shipping_terms TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_rep_involved BOOLEAN NOT NULL DEFAULT FALSE,
  discount_justification TEXT,
  quote_fields JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES public.profiles(id),
  rejection_reason TEXT
);

-- Create BOM items table
CREATE TABLE public.bom_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  part_number TEXT,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(12,2) NOT NULL,
  total_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  margin DECIMAL(5,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create application settings table
CREATE TABLE public.app_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create user registration requests table
CREATE TABLE public.user_registration_requests (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  department TEXT NOT NULL,
  job_title TEXT NOT NULL,
  phone_number TEXT,
  business_justification TEXT NOT NULL,
  requested_role TEXT NOT NULL CHECK (requested_role IN ('level1', 'level2')),
  manager_email TEXT NOT NULL,
  company_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'under_review')) DEFAULT 'pending',
  ip_address TEXT NOT NULL,
  user_agent TEXT NOT NULL,
  agreed_to_terms BOOLEAN NOT NULL DEFAULT FALSE,
  agreed_to_privacy_policy BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES public.profiles(id),
  rejection_reason TEXT
);

-- Insert default quote fields
INSERT INTO public.quote_fields (id, label, type, required, enabled, options, display_order) VALUES
('customerName', 'Customer Name', 'text', true, true, null, 1),
('oracleCustomerId', 'Oracle Customer ID', 'text', true, true, null, 2),
('sfdcOpportunity', 'SFDC Opportunity', 'text', true, true, null, 3),
('contactPerson', 'Contact Person', 'text', false, true, null, 4),
('contactEmail', 'Contact Email', 'text', false, true, null, 5),
('projectName', 'Project Name', 'text', false, true, null, 6),
('expectedCloseDate', 'Expected Close Date', 'date', false, true, null, 7),
('competitorInfo', 'Competitor Information', 'textarea', false, true, null, 8),
('paymentTerms', 'Payment Terms', 'select', true, true, '["Prepaid", "15 days", "30 days", "60 days", "90 days", "120 days"]', 9),
('shippingTerms', 'Shipping Terms', 'select', true, true, '["Ex-Works", "CFR", "CIF", "CIP", "CPT", "DDP", "DAP", "FCA", "Prepaid"]', 10),
('currency', 'Currency', 'select', true, true, '["USD", "EURO", "GBP", "CAD"]', 11);

-- Insert default application settings
INSERT INTO public.app_settings (key, value, description) VALUES
('ordersTeamEmail', '"orders@qualitrolcorp.com"', 'Primary email for orders team'),
('ccEmails', '["orders-backup@qualitrolcorp.com"]', 'CC emails for notifications'),
('emailSubjectPrefix', '"[PowerQuotePro]"', 'Email subject prefix'),
('marginWarningThreshold', '25', 'Margin warning threshold percentage'),
('minimumMargin', '25', 'Minimum allowed margin percentage'),
('standardMargin', '40', 'Standard margin percentage');

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_registration_requests ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for quote_fields
CREATE POLICY "Authenticated users can view quote fields" ON public.quote_fields
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage quote fields" ON public.quote_fields
  FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for products
CREATE POLICY "Authenticated users can view products" ON public.products
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for quotes
CREATE POLICY "Users can view their own quotes" ON public.quotes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quotes" ON public.quotes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quotes" ON public.quotes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all quotes" ON public.quotes
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update all quotes" ON public.quotes
  FOR UPDATE USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for bom_items
CREATE POLICY "Users can view BOM items for their quotes" ON public.bom_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quotes 
      WHERE id = bom_items.quote_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage BOM items for their quotes" ON public.bom_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.quotes 
      WHERE id = bom_items.quote_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all BOM items" ON public.bom_items
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for app_settings
CREATE POLICY "Authenticated users can view settings" ON public.app_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage settings" ON public.app_settings
  FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

-- RLS Policies for user_registration_requests
CREATE POLICY "Admins can view registration requests" ON public.user_registration_requests
  FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can manage registration requests" ON public.user_registration_requests
  FOR ALL USING (public.get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Anyone can create registration requests" ON public.user_registration_requests
  FOR INSERT WITH CHECK (true);
