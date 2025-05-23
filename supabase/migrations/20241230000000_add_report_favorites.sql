-- Add favorite and template columns to reports table
ALTER TABLE reports 
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS template_category TEXT,
ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ;

-- Create index for faster favorite queries
CREATE INDEX IF NOT EXISTS idx_reports_is_favorite ON reports(organization_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_reports_is_template ON reports(organization_id, is_template) WHERE is_template = true;

-- Add check constraint for template category
ALTER TABLE reports ADD CONSTRAINT check_template_category 
CHECK (is_template = false OR template_category IS NOT NULL);

-- Create report_runs table to track report execution history
CREATE TABLE IF NOT EXISTS report_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    run_by UUID NOT NULL REFERENCES auth.users(id),
    run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    row_count INTEGER,
    execution_time_ms INTEGER,
    export_format TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'cancelled')),
    error_message TEXT
);

-- Add RLS policies for report_runs
ALTER TABLE report_runs ENABLE ROW LEVEL SECURITY;

-- Policy for viewing report runs
CREATE POLICY "Users can view report runs for their organization"
ON report_runs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM reports r
        JOIN organization_members om ON om.organization_id = r.organization_id
        WHERE r.id = report_runs.report_id
        AND om.user_id = auth.uid()
    )
);

-- Policy for inserting report runs
CREATE POLICY "Users can insert report runs for their organization"
ON report_runs FOR INSERT
WITH CHECK (
    run_by = auth.uid() AND
    EXISTS (
        SELECT 1 FROM reports r
        JOIN organization_members om ON om.organization_id = r.organization_id
        WHERE r.id = report_runs.report_id
        AND om.user_id = auth.uid()
    )
);

-- Function to update last_run_at when a report is executed
CREATE OR REPLACE FUNCTION update_report_last_run()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE reports 
    SET last_run_at = NEW.run_at 
    WHERE id = NEW.report_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_run_at
CREATE TRIGGER update_report_last_run_trigger
AFTER INSERT ON report_runs
FOR EACH ROW
EXECUTE FUNCTION update_report_last_run(); 