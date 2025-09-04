-- Create the departments table
CREATE TABLE public.departments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Policy for full access for admins
CREATE POLICY "Admins can manage departments" ON public.departments
FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Policy for read access for all authenticated users
CREATE POLICY "Authenticated users can view departments" ON public.departments
FOR SELECT USING (auth.role() = 'authenticated');