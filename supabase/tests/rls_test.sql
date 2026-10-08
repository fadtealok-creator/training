-- Two businesses, an owner of A and an HR user of B. Fails (raises) if either sees too much.
insert into auth.users values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
insert into orgs (id, name) values ('10000000-0000-0000-0000-000000000001', 'A'), ('10000000-0000-0000-0000-000000000002', 'B');
insert into memberships values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'hr');
insert into receivables_aging (org_id, month, region, bucket, amount) values
  ('10000000-0000-0000-0000-000000000001', '2022-01-01', 'MI', '90+', 5),
  ('10000000-0000-0000-0000-000000000002', '2022-01-01', 'MI', '90+', 7);
insert into people_moves (org_id, month, region, hires, exits) values
  ('10000000-0000-0000-0000-000000000002', '2022-01-01', 'MI', 1, 1);

create role app_user;
grant usage on schema public, auth to app_user;
grant select on all tables in schema public to app_user;
grant execute on all functions in schema public, auth to app_user;
set role app_user;

do $$ begin
  perform set_config('request.uid', '00000000-0000-0000-0000-000000000001', false);
  if (select count(*) from receivables_aging) <> 1 then raise exception 'owner of A should see only A receivables'; end if;
  if (select count(*) from people_moves) <> 0 then raise exception 'owner of A should not see B people rows'; end if;

  perform set_config('request.uid', '00000000-0000-0000-0000-000000000002', false);
  if (select count(*) from receivables_aging) <> 0 then raise exception 'HR user should not see receivables'; end if;
  if (select count(*) from people_moves) <> 1 then raise exception 'HR user should see own people rows'; end if;
  raise notice 'RLS checks passed';
end $$;
