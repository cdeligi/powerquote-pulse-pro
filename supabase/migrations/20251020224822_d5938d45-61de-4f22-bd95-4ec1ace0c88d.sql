-- Add conditional_logic column to quote_fields table
ALTER TABLE quote_fields 
ADD COLUMN IF NOT EXISTS conditional_logic JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN quote_fields.conditional_logic IS 
'Array of conditional rules that trigger follow-up questions based on field values';

-- Configure Rep Involved → Partner Spec Change Bonus
UPDATE quote_fields 
SET conditional_logic = '[
  {
    "id": "rep-bonus-rule",
    "triggerValues": ["Yes"],
    "displayMode": "inline",
    "title": "Rep Bonus Information",
    "description": "Please specify if there is a partner spec change bonus",
    "fields": [
      {
        "id": "partner-spec-change-bonus",
        "label": "Partner Spec Change Bonus",
        "type": "select",
        "required": true,
        "include_in_pdf": false,
        "options": ["YES", "NO"],
        "enabled": true
      }
    ]
  }
]'::jsonb
WHERE id = 'is-rep-involved';

-- Delete standalone bonus field (now conditional)
DELETE FROM quote_fields WHERE id = 'field-1760880453484';

-- Configure Product Line → Project Type (5 rules for 5 product lines)
UPDATE quote_fields 
SET conditional_logic = '[
  {
    "id": "ap-project-type",
    "triggerValues": ["AP"],
    "displayMode": "inline",
    "title": "AP Project Type",
    "description": "Select the project type for AP product line",
    "fields": [
      {
        "id": "project-type-ap",
        "label": "Project Type (AP)",
        "type": "select",
        "required": true,
        "include_in_pdf": true,
        "options": ["Circuit Breaker", "Monitoring", "TX Monitor", "TX BM", "TX Acessories", "TX OSP", "Transformer", "Monitoring CBM", "Services AP", "Expert Services"],
        "enabled": true
      }
    ]
  },
  {
    "id": "neo-project-type",
    "triggerValues": ["NEO"],
    "displayMode": "inline",
    "title": "NEO Project Type",
    "description": "Select the project type for NEO product line",
    "fields": [
      {
        "id": "project-type-neo",
        "label": "Project Type (NEO)",
        "type": "select",
        "required": true,
        "include_in_pdf": true,
        "options": ["NEO Monitors", "Fibers Only", "TWP, JBOX, FT", "Fibers, TWP, JBOX & FT", "Monitor, Fibers, TWP, JBOX & FT", "Services Neoptix"],
        "enabled": true
      }
    ]
  },
  {
    "id": "srv-project-type",
    "triggerValues": ["SRV"],
    "displayMode": "inline",
    "title": "SRV Project Type",
    "description": "Select the project type for SRV product line",
    "fields": [
      {
        "id": "project-type-srv",
        "label": "Project Type (SRV)",
        "type": "select",
        "required": true,
        "include_in_pdf": true,
        "options": ["TX SRV", "TX SRV DGA LT1", "Services SRV", "Expert Services", "Transformer", "Monitoring CBM", "SRV Parts"],
        "enabled": true
      }
    ]
  },
  {
    "id": "ip-project-type",
    "triggerValues": ["IP"],
    "displayMode": "inline",
    "title": "IP Project Type",
    "description": "Select the project type for IP product line",
    "fields": [
      {
        "id": "project-type-ip",
        "label": "Project Type (IP)",
        "type": "select",
        "required": true,
        "include_in_pdf": true,
        "options": ["Grid FL1/FL8", "Grid PMU", "Grid Informa", "Grid IDM DFR", "Grid IDM DSM", "Grid IDM DFR + PQ", "Grid IDM DFR + PMU", "Grid IDM DFR + FL", "Grid IDM DFR + 61850", "Grid IDM >2 licenses", "Grid Cabinet system", "Grid BEN", "Grid Betalarm", "Grid Software - iQ+", "Grid Software – iQ+ AI", "Expert Services", "Multi-Asset CBM Monitoring", "Services IP"],
        "enabled": true
      }
    ]
  },
  {
    "id": "dms-project-type",
    "triggerValues": ["DMS"],
    "displayMode": "inline",
    "title": "DMS Project Type",
    "description": "Select the project type for DMS product line",
    "fields": [
      {
        "id": "project-type-dms",
        "label": "Project Type (DMS)",
        "type": "select",
        "required": true,
        "include_in_pdf": true,
        "options": ["Expert Services", "GIS Couplers", "GIS PDM", "GIS PDM+SF6", "GIS PDM+ARC", "GIS PDM+BREAKER", "GIS PDM+BREAKER+SF6", "GIS PDM+ARC+SF6", "GIS PDM+ARC+SF6+BREAKER", "SF6 + BREAKER", "SMARTSUB stand-alone", "GIS SF6", "Multi-Asset CBM Monitoring", "Services DMS", "Transformer Monitoring CBM", "TX Couplers", "TX PDM", "UHF Portable"],
        "enabled": true
      }
    ]
  }
]'::jsonb
WHERE id = 'field-1760874644107';