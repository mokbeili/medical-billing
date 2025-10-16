ALTER TABLE service_codes
  ALTER COLUMN service_start_time TYPE timestamptz USING service_start_time AT TIME ZONE 'America/Regina',
  ALTER COLUMN service_end_time   TYPE timestamptz USING service_end_time   AT TIME ZONE 'America/Regina',
  ALTER COLUMN service_date       TYPE timestamptz USING service_date       AT TIME ZONE 'America/Regina',
  ALTER COLUMN service_end_date   TYPE timestamptz USING service_end_date   AT TIME ZONE 'America/Regina';

ALTER TABLE services
  ALTER COLUMN service_date TYPE timestamptz USING service_date AT TIME ZONE 'America/Regina';