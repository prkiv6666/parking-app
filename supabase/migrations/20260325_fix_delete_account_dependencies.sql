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

  update public.profiles
  set
    referred_by = null,
    referral_redeemed_at = null
  where referred_by = v_user_id;

  update public.parking_reports
  set
    claimed_by = null,
    claimed_at = null,
    claim_expires_at = null
  where claimed_by = v_user_id::text;

  update public.parking_reports
  set invalidated_by = null
  where invalidated_by = v_user_id;

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