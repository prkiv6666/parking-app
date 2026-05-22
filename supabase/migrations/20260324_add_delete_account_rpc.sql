create or replace function public.delete_my_account_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  delete from public.notification_preferences
  where user_id = v_user_id;

  delete from public.parking_reports
  where report_user_id = v_user_id::text;

  delete from public.profiles
  where id = v_user_id;

  return jsonb_build_object(
    'deleted', true,
    'user_id', v_user_id
  );
end;
$$;

grant execute on function public.delete_my_account_data() to authenticated;