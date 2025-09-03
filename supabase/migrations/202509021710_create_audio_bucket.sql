insert into storage.buckets (id, name, public) values ('audio', 'audio', true) on conflict (id) do nothing;

drop policy if exists "audio read" on storage.objects;
create policy "audio read"
on storage.objects for select
using (bucket_id = 'audio');

drop policy if exists "audio insert authenticated" on storage.objects;
create policy "audio insert authenticated"
on storage.objects for insert to authenticated
with check (bucket_id = 'audio');

notify pgrst, 'reload schema';
