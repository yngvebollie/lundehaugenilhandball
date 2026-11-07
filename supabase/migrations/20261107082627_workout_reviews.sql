create table public.beta_workout_reviews (
  assignment uuid primary key references public.beta_assignments on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  exercise_stars smallint[] not null check (array_ndims(exercise_stars)=1 and array_lower(exercise_stars,1)=1 and cardinality(exercise_stars) between 1 and 40 and array_position(exercise_stars,null) is null and 0<=all(exercise_stars) and 5>=all(exercise_stars)),
  comment text not null default '' check (length(comment)<=1000)
);
alter table public.beta_workout_reviews enable row level security;
revoke all on public.beta_workout_reviews from public,anon,authenticated;
grant select, insert(assignment,stars,exercise_stars,comment), update(stars,exercise_stars,comment) on public.beta_workout_reviews to authenticated;
create policy review_read on public.beta_workout_reviews for select to authenticated using (
  exists(select from public.beta_assignments p where p.id=assignment)
);
create policy review_owner on public.beta_workout_reviews as restrictive for all to authenticated using (true) with check (
  exists(select from public.beta_assignments p where p.id=assignment and p.athlete=(select auth.uid())
    and cardinality(p.exercises)=cardinality(exercise_stars)
    and cardinality(p.exercises)=(select count(*) from public.beta_checks c where c.assignment=p.id))
);
create policy review_create on public.beta_workout_reviews for insert to authenticated with check(true);
create policy review_edit on public.beta_workout_reviews for update to authenticated using (
  exists(select from public.beta_assignments p where p.id=assignment and p.athlete=(select auth.uid()))
) with check(true);
