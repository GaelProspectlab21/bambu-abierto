begin;

select plan(9);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('7c67a25b-4583-42b1-a778-6bb22724cf77', 'authenticated', 'authenticated', 'bambu-owner@example.invalid', '', now(), now(), now()),
  ('ace0bd3e-60bb-4891-903e-832c2170e65f', 'authenticated', 'authenticated', 'bambu-other@example.invalid', '', now(), now(), now());

insert into public.bambu_user_data (user_id, revision, payload)
values (
  '7c67a25b-4583-42b1-a778-6bb22724cf77',
  1,
  '{"version":2,"schemaRevision":2,"tasks":[],"activeReading":null,"profile":{"name":"Test","onboardingComplete":true},"habits":{},"reading":[],"training":[],"focus":[],"activeFocus":null}'::jsonb
);

select ok((select relrowsecurity from pg_class where oid = 'public.bambu_user_data'::regclass), 'RLS is enabled');
select ok(not has_table_privilege('anon', 'public.bambu_user_data', 'select'), 'anonymous role cannot read the table');
select ok(not has_table_privilege('authenticated', 'public.bambu_user_data', 'insert,update,delete'), 'authenticated clients cannot bypass the revision-checked RPC');
select ok(not has_function_privilege('anon', 'public.save_my_bambu_data(jsonb,integer)', 'execute'), 'anonymous role cannot call the save function');

set local role authenticated;
select set_config('request.jwt.claim.sub', '7c67a25b-4583-42b1-a778-6bb22724cf77', true);
select set_config('request.jwt.claims', '{"sub":"7c67a25b-4583-42b1-a778-6bb22724cf77","role":"authenticated"}', true);
select is((select count(*) from public.bambu_user_data), 1::bigint, 'account can read its own row');

select set_config('request.jwt.claim.sub', 'ace0bd3e-60bb-4891-903e-832c2170e65f', true);
select set_config('request.jwt.claims', '{"sub":"ace0bd3e-60bb-4891-903e-832c2170e65f","role":"authenticated"}', true);
select is((select count(*) from public.bambu_user_data), 0::bigint, 'another account cannot see that row');
select throws_ok(
  $$insert into public.bambu_user_data (user_id, revision, payload) values ('7c67a25b-4583-42b1-a778-6bb22724cf77', 1, '{"version":2,"schemaRevision":2,"tasks":[],"activeReading":null,"profile":{"name":"Test","onboardingComplete":true},"habits":{},"reading":[],"training":[],"focus":[],"activeFocus":null}'::jsonb)$$,
  '42501', null, 'another account cannot write a row for the owner'
);

select set_config('request.jwt.claim.sub', '7c67a25b-4583-42b1-a778-6bb22724cf77', true);
select set_config('request.jwt.claims', '{"sub":"7c67a25b-4583-42b1-a778-6bb22724cf77","role":"authenticated"}', true);
select is(public.save_my_bambu_data('{"version":2,"schemaRevision":2,"tasks":[],"activeReading":null,"profile":{"name":"Test","onboardingComplete":true},"habits":{},"reading":[],"training":[],"focus":[],"activeFocus":null}'::jsonb, 1), 2, 'save increments the revision');
select throws_ok(
  $$select public.save_my_bambu_data('{"version":2,"schemaRevision":2,"tasks":[],"activeReading":null,"profile":{"name":"Test","onboardingComplete":true},"habits":{},"reading":[],"training":[],"focus":[],"activeFocus":null}'::jsonb, 1)$$,
  '40001', 'BAMBU_REVISION_CONFLICT', 'stale writes fail instead of overwriting newer data'
);

select * from finish();
rollback;
