alter table public.mdm_model_fields
  add column if not exists attachment_mode varchar(32);

update public.mdm_model_fields
set attachment_mode = case
  when coalesce(is_multiple, false) then 'multiple'
  else 'single'
end
where data_type = 'attachment'
  and (attachment_mode is null or attachment_mode = '');

alter table public.mdm_model_fields
  drop constraint if exists mdm_model_fields_attachment_mode_check;

alter table public.mdm_model_fields
  add constraint mdm_model_fields_attachment_mode_check
  check (
    (data_type = 'attachment' and attachment_mode in ('single', 'multiple'))
    or
    (data_type <> 'attachment' and attachment_mode is null)
  );

insert into public.mdm_dicts (name, code, sort_no, status, system_flag, remark)
values ('附件方式', 'mdm_model_attachment', 10, true, true, '数据模型附件方式字典')
on conflict (code) do update
set name = excluded.name,
    sort_no = excluded.sort_no,
    status = excluded.status,
    system_flag = excluded.system_flag,
    remark = excluded.remark,
    updated_at = now();

insert into public.mdm_dict_items (dict_id, name, code, value, sort_no, status, remark)
select d.id, v.name, v.code, v.value, v.sort_no, true, v.remark
from public.mdm_dicts d
cross join (
  values
    ('单附件', 'single', 'single', 10, '每个字段仅允许上传一个附件'),
    ('多附件', 'multiple', 'multiple', 20, '每个字段允许上传多个附件')
) as v(name, code, value, sort_no, remark)
where d.code = 'mdm_model_attachment'
on conflict (dict_id, code) do update
set name = excluded.name,
    value = excluded.value,
    sort_no = excluded.sort_no,
    status = excluded.status,
    remark = excluded.remark,
    updated_at = now();
