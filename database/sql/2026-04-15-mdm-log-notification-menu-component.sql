begin;

update public.rbac_menus
set
  title = '日志提醒配置',
  path = '/mdm/integration/log-notification',
  component = 'mdm/integration/log-notification/index.vue'
where name = 'MdmIntegrationLogNotification';

notify pgrst, 'reload schema';

commit;
