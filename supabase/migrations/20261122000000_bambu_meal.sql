-- Comida (22-nov-2026): colección nueva 'meal'. Solo amplía la lista permitida; no toca filas.
alter table public.bambu_records drop constraint if exists bambu_records_collection;
alter table public.bambu_records add constraint bambu_records_collection check (collection in (
  'reading', 'focus', 'task', 'bible', 'work', 'set', 'activity',
  'checkin', 'body', 'exercise', 'meal', 'habit', 'meta'));
