-- v11 (27-nov): la RPC del JSON único (v1/v2) ya respondía BAMBU_UPDATE_REQUIRED desde el 5-nov.
-- Se quita el permiso de ejecutarla: menos superficie. Reversible con un grant.
revoke execute on function public.save_my_bambu_data(jsonb, integer) from authenticated, anon, public;
