-- Create pricing_settings table
CREATE TABLE IF NOT EXISTS public.pricing_settings (
  plan TEXT PRIMARY KEY CHECK (plan IN ('warrior', 'elite', 'champion', 'legend')),
  price_monthly NUMERIC NOT NULL,
  price_annual NUMERIC NOT NULL,
  stripe_monthly_price_id TEXT,
  stripe_annual_price_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed with default values in EGP
INSERT INTO public.pricing_settings (plan, price_monthly, price_annual, stripe_monthly_price_id, stripe_annual_price_id)
VALUES 
  ('warrior', 600, 5000, 'price_warrior_monthly', 'price_warrior_annual'),
  ('elite', 1500, 12500, 'price_elite_monthly', 'price_elite_annual'),
  ('champion', 4000, 33500, 'price_champion_monthly', 'price_champion_annual'),
  ('legend', 10000, 85000, 'price_legend_monthly', 'price_legend_annual')
ON CONFLICT (plan) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow public read access to pricing_settings" ON public.pricing_settings;
DROP POLICY IF EXISTS "Allow admin write access to pricing_settings" ON public.pricing_settings;

-- RLS Policies
CREATE POLICY "Allow public read access to pricing_settings" 
ON public.pricing_settings FOR SELECT USING (true);

CREATE POLICY "Allow admin write access to pricing_settings" 
ON public.pricing_settings FOR ALL USING (public.is_admin(auth.uid()));
