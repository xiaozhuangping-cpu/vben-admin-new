alter table public.mdm_model_fields
  add column if not exists is_title boolean not null default false;

comment on column public.mdm_model_fields.is_title is '是否标题字段，用于关联主数据选择时显示名称';
