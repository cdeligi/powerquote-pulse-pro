-- Create the role_metadata table
CREATE TABLE public.role_metadata (
    role_name public.user_role PRIMARY KEY, -- Links directly to the user_role ENUM
    display_name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Insert initial data
INSERT INTO public.role_metadata (role_name, display_name, description) VALUES
('LEVEL_1', 'Level 1 - Channel Partners', 'Access for external channel partners.'),
('LEVEL_2', 'Level 2 - Qualitrol Sales', 'Access for Qualitrol sales team members.'),
('LEVEL_3', 'Level 3 - Directors', 'Access for department directors and managers.'),
('ADMIN', 'Admin - Administrators', 'Full administrative access to the system.'),
('FINANCE', 'Finance - Finance Team', 'Access for the finance department.');

-- Set up Row Level Security (RLS)
ALTER TABLE public.role_metadata ENABLE ROW LEVEL SECURITY;

-- Policy for full access for admins
CREATE POLICY "Admins can manage role metadata" ON public.role_metadata
FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Policy for read access for all authenticated users
CREATE POLICY "Authenticated users can view role metadata" ON public.role_metadata
FOR SELECT USING (auth.role() = 'authenticated');