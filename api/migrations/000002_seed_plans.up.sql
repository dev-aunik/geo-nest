INSERT INTO plans (name, price_cents, daily_quota, per_min_limit, max_keys, max_levels, features) VALUES
  ('free',       0,      500,    10,  1,  3, '{"formats":["json"],"search":false}'::jsonb),
  ('starter',    900,    50000,  100, 3,  4, '{"formats":["json","csv"],"search":true,"reverse_geocode":true}'::jsonb),
  ('pro',        2900,   500000, 600, 10, 4, '{"formats":["json","csv","xml"],"search":true,"reverse_geocode":true,"bulk_export":true}'::jsonb),
  ('enterprise', 0,      -1,     -1,  -1, 4, '{"formats":["json","csv","xml"],"search":true,"custom":true}'::jsonb);
