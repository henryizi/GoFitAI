-- Create data_deletion_requests table for PDPO compliance
-- This table logs all user data deletion requests for compliance purposes

CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
    deletion_reason TEXT,
    compliance_notes TEXT,
    processing_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for data deletion requests
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - only allow users to see their own deletion requests
CREATE POLICY "Users can view their own deletion requests" 
ON public.data_deletion_requests FOR SELECT
USING (auth.uid() = user_id);

-- Create RLS policy - only allow users to insert their own deletion requests
CREATE POLICY "Users can create their own deletion requests" 
ON public.data_deletion_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user_id ON public.data_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_status ON public.data_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_requested_at ON public.data_deletion_requests(requested_at);

-- Add comments for documentation
COMMENT ON TABLE public.data_deletion_requests IS 'Logs all user data deletion requests for PDPO compliance';
COMMENT ON COLUMN public.data_deletion_requests.user_id IS 'Reference to the user requesting deletion (nullable after user deletion)';
COMMENT ON COLUMN public.data_deletion_requests.user_email IS 'Email of the user requesting deletion (for compliance records)';
COMMENT ON COLUMN public.data_deletion_requests.status IS 'Status of the deletion request: pending, completed, or failed';
COMMENT ON COLUMN public.data_deletion_requests.deletion_reason IS 'Optional reason provided by user for the deletion';
COMMENT ON COLUMN public.data_deletion_requests.compliance_notes IS 'PDPO compliance notes and legal basis';
COMMENT ON COLUMN public.data_deletion_requests.processing_notes IS 'Technical notes about the deletion process';

-- Create function to update updated_at automatically
CREATE OR REPLACE FUNCTION update_data_deletion_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_data_deletion_requests_updated_at
    BEFORE UPDATE ON public.data_deletion_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_data_deletion_requests_updated_at();

-- Verify table creation
SELECT 'data_deletion_requests table created successfully' as status;
