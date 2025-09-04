-- Add requires_level4 field to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS requires_level4_config boolean DEFAULT false;

-- Update existing products that need Level 4 configuration
UPDATE products 
SET requires_level4_config = true
WHERE id IN ('bushing-card', 'bushing-card-mtx', 'bushing-card-stx', 
             'analog-card-multi', 'analog-card-multi-mtx', 'analog-card-multi-stx');

-- Create table for Level 4 configuration templates
CREATE TABLE IF NOT EXISTS level4_config_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    config_type TEXT NOT NULL, -- 'analog' or 'bushing'
    max_inputs INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for configuration options
CREATE TABLE IF NOT EXISTS level4_config_options (
    id TEXT PRIMARY KEY,
    template_id TEXT REFERENCES level4_config_templates(id) ON DELETE CASCADE,
    option_key TEXT NOT NULL,
    option_value TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for product configurations
CREATE TABLE IF NOT EXISTS level4_product_configs (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    template_id TEXT REFERENCES level4_config_templates(id) ON DELETE SET NULL,
    config_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_level4_config_templates_type ON level4_config_templates(config_type);
CREATE INDEX IF NOT EXISTS idx_level4_config_options_template ON level4_config_options(template_id);
CREATE INDEX IF NOT EXISTS idx_level4_product_configs_product ON level4_product_configs(product_id);

-- Insert default templates for analog and bushing cards
INSERT INTO level4_config_templates (id, name, description, config_type, max_inputs)
VALUES 
    ('default-analog', 'Default Analog Card', '8-input analog card configuration', 'analog', 8),
    ('default-bushing', 'Default Bushing Card', 'Configurable bushing monitoring', 'bushing', 12)
ON CONFLICT (id) DO NOTHING;

-- Insert default options for analog card
INSERT INTO level4_config_options (template_id, option_key, option_value, display_order, is_default)
SELECT 'default-analog', 'input_type', '4-20mA', 1, true
WHERE NOT EXISTS (SELECT 1 FROM level4_config_options WHERE template_id = 'default-analog' AND option_key = 'input_type' AND option_value = '4-20mA');

-- Insert default options for bushing card
INSERT INTO level4_config_options (template_id, option_key, option_value, display_order, is_default)
VALUES 
    ('default-bushing', 'bushing_type', 'Standard Bushing', 1, true),
    ('default-bushing', 'bushing_type', 'High-Voltage Bushing', 2, false),
    ('default-bushing', 'bushing_type', 'Oil-Filled Bushing', 3, false)
ON CONFLICT DO NOTHING;
