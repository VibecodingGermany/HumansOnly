-- Safe shared bootstrap: no fake Auth users and no public/demo tickets in live Supabase.
insert into public.spaces(id,slug,name,description,pinned_info,access_type,price_cents)
values ('10000000-0000-4000-8000-000000000001','vibecoding-germany','Vibecoding Germany',
 'Gute Ideen. Echte Menschen. Einfach machen.',
 '[{"title":"Offene Werkbank","text":"Zeig uns, woran du gerade baust. Unfertig ist ausdrücklich willkommen."},{"title":"Unser digitaler Stammtisch","text":"Termine und Infos bei Vibecoding Germany.","url":"https://vibecoding-germany.de"}]',
 'invite',0)
on conflict(slug) do nothing;
