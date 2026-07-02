create policy "Allow authenticated uploads to report-photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'report-photos');

create policy "Allow authenticated reads from report-photos"
on storage.objects for select
to authenticated
using (bucket_id = 'report-photos');

create policy "Allow public reads from report-photos"
on storage.objects for select
to anon
using (bucket_id = 'report-photos');