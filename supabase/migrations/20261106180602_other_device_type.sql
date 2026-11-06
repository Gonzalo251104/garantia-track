-- Extend the existing allowlist; retain NOT NULL, RLS, grants and RPCs.
alter table public.repair_orders
  drop constraint repair_orders_device_check,
  add constraint repair_orders_device_check check (device in ('console','controller','other'));
