-- Create atomic RPC function for clearing sample data
-- This prevents race conditions by doing all deletes in a single transaction

CREATE OR REPLACE FUNCTION clear_sample_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_children_count INT;
  deleted_camps_count INT;
  result JSON;
BEGIN
  -- Delete sample scheduled_camps first (to avoid FK violations)
  DELETE FROM scheduled_camps
  WHERE user_id = auth.uid()
    AND is_sample = true;

  GET DIAGNOSTICS deleted_camps_count = ROW_COUNT;

  -- Delete sample children (CASCADE will handle any remaining references)
  DELETE FROM children
  WHERE user_id = auth.uid()
    AND is_sample = true;

  GET DIAGNOSTICS deleted_children_count = ROW_COUNT;

  -- Update profile to mark tour as completed
  UPDATE profiles
  SET tour_completed = true
  WHERE id = auth.uid();

  -- Return results
  result := json_build_object(
    'success', true,
    'deleted_children', deleted_children_count,
    'deleted_camps', deleted_camps_count
  );

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION clear_sample_data() TO authenticated;

COMMENT ON FUNCTION clear_sample_data() IS 'Atomically clear all sample data for the current user';
