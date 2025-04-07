-- Clear existing data
TRUNCATE organizations CASCADE;
TRUNCATE organization_members CASCADE;

-- Insert test organizations
INSERT INTO organizations (id, name, invite_code, allowed_domain) VALUES
  ('d4a90817-9d5f-4235-8d5c-40c2f8c2952d', 'Dental Clinic A', 'DENTAL123', 'dentalclinic.com'),
  ('f7b1764f-9a6d-4cd8-a0cd-f6ebf9e0c75b', 'Dental School B', 'SCHOOL456', 'dentalschool.edu');

-- You can use these values to sign up:

-- For Dental Clinic A:
-- Organization ID: d4a90817-9d5f-4235-8d5c-40c2f8c2952d
-- Invite Code: DENTAL123
-- Email Domain: anything@dentalclinic.com

-- For Dental School B:
-- Organization ID: f7b1764f-9a6d-4cd8-a0cd-f6ebf9e0c75b
-- Invite Code: SCHOOL456
-- Email Domain: anything@dentalschool.edu
