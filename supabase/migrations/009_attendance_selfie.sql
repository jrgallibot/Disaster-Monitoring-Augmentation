-- Selfie photo on time in / time out records

ALTER TABLE employee_attendance ADD COLUMN IF NOT EXISTS photo_url TEXT;
