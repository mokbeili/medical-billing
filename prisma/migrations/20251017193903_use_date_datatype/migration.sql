-- Convert service_codes table columns
ALTER TABLE service_codes
  ALTER COLUMN service_date TYPE date
    USING (service_date AT TIME ZONE 'America/Regina')::date,
  ALTER COLUMN service_end_date TYPE date
    USING (service_end_date AT TIME ZONE 'America/Regina')::date;

-- Convert services table column
ALTER TABLE services
  ALTER COLUMN service_date TYPE date
    USING (service_date AT TIME ZONE 'America/Regina')::date;