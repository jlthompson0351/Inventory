-- Update the reports table to ensure report_config contains subject
-- This migration ensures existing records have a subject field (defaulting to 'inventory_items')

-- First verify if reports table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'reports'
    ) THEN
        -- Update existing reports to add subject field if it doesn't exist
        UPDATE reports
        SET report_config = jsonb_set(
            COALESCE(report_config, '{}'::jsonb),
            '{subject}',
            '"inventory_items"',
            true
        )
        WHERE report_config -> 'subject' IS NULL;

        -- Add a trigger to ensure subject field is always present in future inserts/updates
        CREATE OR REPLACE FUNCTION ensure_report_subject()
        RETURNS TRIGGER AS $$
        BEGIN
            IF NEW.report_config -> 'subject' IS NULL THEN
                NEW.report_config = jsonb_set(
                    COALESCE(NEW.report_config, '{}'::jsonb),
                    '{subject}',
                    '"inventory_items"',
                    true
                );
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        -- Drop the trigger if it already exists
        DROP TRIGGER IF EXISTS ensure_report_subject_trigger ON reports;

        -- Create the trigger
        CREATE TRIGGER ensure_report_subject_trigger
        BEFORE INSERT OR UPDATE ON reports
        FOR EACH ROW
        EXECUTE FUNCTION ensure_report_subject();
    END IF;
END
$$; 