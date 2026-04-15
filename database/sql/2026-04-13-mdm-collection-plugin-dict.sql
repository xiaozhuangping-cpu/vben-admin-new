begin;

with upsert_dict as (
  insert into public.mdm_dicts (
    code,
    name,
    remark,
    sort_no,
    status,
    system_flag
  )
  values (
    'mdm_model_plugin',
    '模型归集插件',
    '数据归集任务的插件选项字典',
    0,
    true,
    true
  )
  on conflict (code) do update
    set
      name = excluded.name,
      remark = excluded.remark,
      status = excluded.status,
      system_flag = excluded.system_flag,
      updated_at = now()
  returning id
)
insert into public.mdm_dict_items (
  code,
  dict_id,
  name,
  remark,
  sort_no,
  status,
  value
)
select
  'example_plugin',
  id,
  '示例插件',
  '用于验证插件型归集任务执行链路',
  0,
  true,
  'example_plugin'
from upsert_dict
on conflict do nothing;

commit;
