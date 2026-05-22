alter table public.parking_reports
  add column if not exists ai_confidence_score integer,
  add column if not exists ai_confidence_reason text,
  add column if not exists ai_score_version text,
  add column if not exists ai_scored_at timestamptz;

create index if not exists parking_reports_ai_confidence_score_idx
  on public.parking_reports (ai_confidence_score desc);

create or replace view public.parking_report_ai_features as
select
  pr.id,
  pr.created_at,
  pr.expires_at,
  pr.status,
  pr.latitude,
  pr.longitude,
  pr.spot_type,
  coalesce(pr.confirm_count, 0) as confirm_count,
  coalesce(pr.taken_count, 0) as taken_count,
  coalesce(pr.successful_validation_count, 0) as successful_validation_count,
  coalesce(pr.author_penalized, false) as author_penalized,
  pr.claimed_by,
  pr.claimed_at,
  pr.claim_expires_at,
  pr.report_user_id,
  pr.ai_confidence_score,
  pr.ai_confidence_reason,
  pr.ai_score_version,
  pr.ai_scored_at,
  extract(epoch from (now() - coalesce(pr.created_at, now()))) as age_seconds,
  extract(hour from coalesce(pr.created_at, now()))::integer as created_hour,
  extract(dow from coalesce(pr.created_at, now()))::integer as created_dow,
  coalesce(p.trust_score, 0) as reporter_trust_score,
  coalesce(p.reports_count, 0) as reporter_reports_count,
  coalesce(p.confirms_count, 0) as reporter_confirms_count,
  coalesce(p.taken_marks_count, 0) as reporter_taken_marks_count,
  coalesce(p.points, 0) as reporter_points,
  (
    pr.status = 'taken'
    or coalesce(pr.taken_count, 0) > 0
    or pr.invalidated_at is not null
  ) as label_not_free,
  (
    pr.status = 'active'
    and pr.invalidated_at is null
    and coalesce(pr.taken_count, 0) = 0
  ) as label_likely_free
from public.parking_reports pr
left join public.profiles p on p.id::text = pr.report_user_id;

grant select on public.parking_report_ai_features to authenticated;