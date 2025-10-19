-- Upsert a Product Line field with conditional Project Type follow-up selections
WITH product_line_rules AS (
  SELECT jsonb_build_array(
    jsonb_build_object(
      'id', 'product-line-ap',
      'triggerValues', jsonb_build_array('AP'),
      'displayMode', 'inline',
      'title', 'Project Type Details',
      'description', 'Select the project type details for the AP product line.',
      'fields', jsonb_build_array(
        jsonb_build_object(
          'id', 'project_type',
          'label', 'Project Type',
          'type', 'select',
          'required', true,
          'include_in_pdf', true,
          'enabled', true,
          'options', jsonb_build_array(
            'Circuit Breaker',
            'Monitoring',
            'TX Monitor',
            'TX BM',
            'TX Acessories',
            'TX OSP',
            'Transformer',
            'Monitoring CBM',
            'Services AP',
            'Expert Services'
          )
        )
      )
    ),
    jsonb_build_object(
      'id', 'product-line-neo',
      'triggerValues', jsonb_build_array('NEO'),
      'displayMode', 'inline',
      'title', 'Project Type Details',
      'description', 'Select the project type details for the NEO product line.',
      'fields', jsonb_build_array(
        jsonb_build_object(
          'id', 'project_type',
          'label', 'Project Type',
          'type', 'select',
          'required', true,
          'include_in_pdf', true,
          'enabled', true,
          'options', jsonb_build_array(
            'NEO Monitors',
            'Fibers Only',
            'TWP, JBOX, FT',
            'Fibers, TWP, JBOX & FT',
            'Monitor, Fibers, TWP, JBOX & FT',
            'Services Neoptix'
          )
        )
      )
    ),
    jsonb_build_object(
      'id', 'product-line-srv',
      'triggerValues', jsonb_build_array('SRV'),
      'displayMode', 'inline',
      'title', 'Project Type Details',
      'description', 'Select the project type details for the SRV product line.',
      'fields', jsonb_build_array(
        jsonb_build_object(
          'id', 'project_type',
          'label', 'Project Type',
          'type', 'select',
          'required', true,
          'include_in_pdf', true,
          'enabled', true,
          'options', jsonb_build_array(
            'TX SRV',
            'TX SRV DGA LT1',
            'Services SRV',
            'Expert Services',
            'Transformer',
            'Monitoring CBM',
            'SRV Parts'
          )
        )
      )
    ),
    jsonb_build_object(
      'id', 'product-line-ip',
      'triggerValues', jsonb_build_array('IP'),
      'displayMode', 'inline',
      'title', 'Project Type Details',
      'description', 'Select the project type details for the IP product line.',
      'fields', jsonb_build_array(
        jsonb_build_object(
          'id', 'project_type',
          'label', 'Project Type',
          'type', 'select',
          'required', true,
          'include_in_pdf', true,
          'enabled', true,
          'options', jsonb_build_array(
            'Grid FL1/FL8',
            'Grid PMU',
            'Grid Informa',
            'Grid IDM DFR',
            'Grid IDM DSM',
            'Grid IDM DFR + PQ',
            'Grid IDM DFR + PMU',
            'Grid IDM DFR + FL',
            'Grid IDM DFR + 61850',
            'Grid IDM >2 licenses',
            'Grid Cabinet system',
            'Grid BEN',
            'Grid Betalarm',
            'Grid Software - iQ+',
            'Grid Software - iQ+ AI',
            'Expert Services',
            'Multi-Asset CBM',
            'Monitoring',
            'Services IP'
          )
        )
      )
    ),
    jsonb_build_object(
      'id', 'product-line-dms',
      'triggerValues', jsonb_build_array('DMS'),
      'displayMode', 'inline',
      'title', 'Project Type Details',
      'description', 'Select the project type details for the DMS product line.',
      'fields', jsonb_build_array(
        jsonb_build_object(
          'id', 'project_type',
          'label', 'Project Type',
          'type', 'select',
          'required', true,
          'include_in_pdf', true,
          'enabled', true,
          'options', jsonb_build_array(
            'Expert Services',
            'GIS Couplers',
            'GIS PDM',
            'GIS PDM+SF6',
            'GIS PDM+ARC',
            'GIS PDM+BREAKER',
            'GIS SF6',
            'GIS PDM+BREAKER+GIS',
            'GIS PDM+ARC+SF6',
            'GIS PDM+ARC+SF6+BREAKER',
            'SF6 + BREAKER',
            'SMARTSUB stand-alone',
            'Multi-Asset CBM',
            'Monitoring',
            'Services DMS',
            'Transformer',
            'Monitoring CBM',
            'TX Couplers',
            'TX PDM',
            'UHF Portable'
          )
        )
      )
    )
  ) AS rules
)
INSERT INTO public.quote_fields (
  id,
  label,
  type,
  required,
  enabled,
  options,
  display_order,
  include_in_pdf,
  conditional_logic
)
VALUES (
  'product_line',
  'Product Line',
  'select',
  true,
  true,
  '["AP","NEO","SRV","IP","DMS"]',
  30,
  true,
  (SELECT rules FROM product_line_rules)
)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  type = EXCLUDED.type,
  required = EXCLUDED.required,
  enabled = EXCLUDED.enabled,
  options = EXCLUDED.options,
  display_order = EXCLUDED.display_order,
  include_in_pdf = EXCLUDED.include_in_pdf,
  conditional_logic = EXCLUDED.conditional_logic;
