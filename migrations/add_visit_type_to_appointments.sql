-- Add visit_type column to appointments table
-- This migration adds the visitType field with a default value of 'new visit'

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS visit_type TEXT NOT NULL DEFAULT 'new visit';

-- Add a comment to document the valid values
COMMENT ON COLUMN appointments.visit_type IS 'Valid values: new visit, follow up, review, first visit after discharge, drug refill';
