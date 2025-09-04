-- Create a function to save Level 4 configuration
CREATE OR REPLACE FUNCTION public.save_level4_configuration(
  p_product_id text,
  p_field_label text,
  p_mode text,
  p_fixed_number_of_inputs integer,
  p_options jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_config_id uuid;
  v_field_id uuid;
  v_option jsonb;
  v_option_id uuid;
BEGIN
  -- Start a transaction
  BEGIN
    -- Check if config already exists for this product
    SELECT id INTO v_config_id 
    FROM public.level4_configurations 
    WHERE level3_product_id = p_product_id
    LIMIT 1;

    -- Create or update the configuration
    IF v_config_id IS NOT NULL THEN
      -- Update existing configuration
      UPDATE public.level4_configurations
      SET 
        name = p_field_label,
        updated_at = now()
      WHERE id = v_config_id
      RETURNING id INTO v_config_id;

      -- Delete existing fields and options
      DELETE FROM public.level4_dropdown_options
      WHERE level4_configuration_field_id IN (
        SELECT id FROM public.level4_configuration_fields 
        WHERE level4_configuration_id = v_config_id
      );

      DELETE FROM public.level4_configuration_fields
      WHERE level4_configuration_id = v_config_id;
    ELSE
      -- Create new configuration
      INSERT INTO public.level4_configurations (
        level3_product_id,
        name
      ) VALUES (
        p_product_id,
        p_field_label
      )
      RETURNING id INTO v_config_id;
    END IF;

    -- Add the field
    INSERT INTO public.level4_configuration_fields (
      level4_configuration_id,
      label,
      field_type,
      display_order
    ) VALUES (
      v_config_id,
      p_field_label,
      'dropdown',
      1
    )
    RETURNING id INTO v_field_id;

    -- Add options
    IF p_options IS NOT NULL THEN
      FOR v_option IN SELECT * FROM jsonb_array_elements(p_options)
      LOOP
        INSERT INTO public.level4_dropdown_options (
          level4_configuration_field_id,
          label,
          value,
          display_order
        ) VALUES (
          v_field_id,
          v_option->>'name',
          v_option->>'id',
          COALESCE((v_option->>'display_order')::integer, 1)
        )
        RETURNING id INTO v_option_id;
      END LOOP;
    END IF;

    -- Return the saved configuration
    RETURN jsonb_build_object(
      'id', v_config_id,
      'field_label', p_field_label,
      'mode', p_mode,
      'fixed_number_of_inputs', p_fixed_number_of_inputs,
      'options', p_options
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error saving Level 4 configuration: %', SQLERRM;
  END;
END;
$$;
