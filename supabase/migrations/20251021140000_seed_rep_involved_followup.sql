-- Configure Rep Involved field with conditional Rep Spec Change Bonus follow-up
WITH rep_followup AS (
  SELECT jsonb_build_array(
    jsonb_build_object(
      'id', 'rep-involved-yes',
      'triggerValues', jsonb_build_array('Yes'),
      'displayMode', 'modal',
      'title', 'Rep Spec Change Bonus',
      'description', 'Confirm whether a Rep Spec Change Bonus applies when a rep is involved.',
      'fields', jsonb_build_array(
        jsonb_build_object(
          'id', 'rep_spec_change_bonus',
          'label', 'Rep Spec Change Bonus',
          'type', 'select',
          'required', true,
          'include_in_pdf', true,
          'enabled', true,
          'options', jsonb_build_array('Yes', 'No')
        )
      )
    )
  ) AS rules
)
UPDATE public.quote_fields
SET
  type = 'select',
  options = '["Yes","No"]',
  conditional_logic = rep_followup.rules,
  include_in_pdf = COALESCE(include_in_pdf, true),
  enabled = COALESCE(enabled, true)
FROM rep_followup
WHERE id = 'is-rep-involved';
