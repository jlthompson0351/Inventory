-- Add a regular month_year column to inventory_history for monthly inventory management
ALTER TABLE public.inventory_history
  ADD COLUMN IF NOT EXISTS month_year TEXT;

-- Create a function to update month_year based on check_date
CREATE OR REPLACE FUNCTION public.set_month_year_inventory_history()
RETURNS TRIGGER AS $$
BEGIN
  NEW.month_year := TO_CHAR(NEW.check_date, 'YYYY-MM');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to set month_year on insert and update
DROP TRIGGER IF EXISTS trg_set_month_year_inventory_history ON public.inventory_history;
CREATE TRIGGER trg_set_month_year_inventory_history
  BEFORE INSERT OR UPDATE ON public.inventory_history
  FOR EACH ROW
  EXECUTE FUNCTION public.set_month_year_inventory_history();

-- Backfill existing data
UPDATE public.inventory_history SET month_year = TO_CHAR(check_date, 'YYYY-MM') WHERE month_year IS NULL;

-- Create an index for efficient filtering by month_year
CREATE INDEX IF NOT EXISTS inventory_history_month_year_idx ON public.inventory_history(month_year); 