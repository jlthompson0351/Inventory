-- Create reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    report_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS policies for reports table
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Policy for organization members to view reports
CREATE POLICY "Organization members can view reports"
ON reports FOR SELECT
USING (
    auth.uid() IN (
        SELECT user_id FROM organization_members
        WHERE organization_id = reports.organization_id
    )
);

-- Policy for organization members to insert reports
CREATE POLICY "Organization members can insert reports"
ON reports FOR INSERT
WITH CHECK (
    auth.uid() IN (
        SELECT user_id FROM organization_members
        WHERE organization_id = reports.organization_id
    )
);

-- Policy for organization members to update their own reports
CREATE POLICY "Organization members can update reports"
ON reports FOR UPDATE
USING (
    auth.uid() IN (
        SELECT user_id FROM organization_members
        WHERE organization_id = reports.organization_id
    )
)
WITH CHECK (
    auth.uid() IN (
        SELECT user_id FROM organization_members
        WHERE organization_id = reports.organization_id
    )
);

-- Policy for organization members to delete their own reports
CREATE POLICY "Organization members can delete reports"
ON reports FOR DELETE
USING (
    auth.uid() IN (
        SELECT user_id FROM organization_members
        WHERE organization_id = reports.organization_id
    )
);

-- Add updated_at trigger
CREATE TRIGGER set_reports_updated_at
BEFORE UPDATE ON reports
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column(); 