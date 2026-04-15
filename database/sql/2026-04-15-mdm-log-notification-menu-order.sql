begin;

update public.rbac_menus
set order_no = coalesce((
  select max(sibling.order_no) + 10
  from public.rbac_menus sibling
  where sibling.parent_id = public.rbac_menus.parent_id
    and sibling.name <> 'MdmIntegrationLogNotification'
), 999)
where name = 'MdmIntegrationLogNotification';

notify pgrst, 'reload schema';

commit;
