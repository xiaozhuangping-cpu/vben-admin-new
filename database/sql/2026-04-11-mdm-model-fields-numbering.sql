begin;

alter table public.mdm_model_fields
  add column if not exists is_code_field boolean not null default false,
  add column if not exists numbering_segment_id uuid,
  add column if not exists dict_code text,
  add column if not exists related_definition_id uuid;

alter table public.mdm_model_fields
  drop constraint if exists mdm_model_fields_numbering_segment_id_fkey;

alter table public.mdm_model_fields
  add constraint mdm_model_fields_numbering_segment_id_fkey
  foreign key (numbering_segment_id) references public.mdm_numbering_segments(id) on delete set null;

create index if not exists idx_mdm_model_fields_numbering_segment_id
  on public.mdm_model_fields(numbering_segment_id);

alter table public.mdm_model_fields
  drop constraint if exists mdm_model_fields_dict_code_fkey;

alter table public.mdm_model_fields
  add constraint mdm_model_fields_dict_code_fkey
  foreign key (dict_code) references public.mdm_dicts(code) on delete set null;

alter table public.mdm_model_fields
  drop constraint if exists mdm_model_fields_related_definition_id_fkey;

alter table public.mdm_model_fields
  add constraint mdm_model_fields_related_definition_id_fkey
  foreign key (related_definition_id) references public.mdm_model_definitions(id) on delete set null;

alter table public.mdm_model_fields
  drop constraint if exists mdm_model_fields_data_type_check;

alter table public.mdm_model_fields
  add constraint mdm_model_fields_data_type_check
  check (
    data_type in (
      'text',
      'varchar',
      'int4',
      'numeric',
      'boolean',
      'date',
      'timestamptz',
      'attachment',
      'dict',
      'relation_master'
    )
  );

alter table public.mdm_model_fields
  drop constraint if exists mdm_model_fields_code_segment_check;

alter table public.mdm_model_fields
  add constraint mdm_model_fields_code_segment_check
  check (
    (is_code_field = false and numbering_segment_id is null)
    or (is_code_field = true and numbering_segment_id is not null)
  );

alter table public.mdm_model_fields
  drop constraint if exists mdm_model_fields_dict_relation_check;

alter table public.mdm_model_fields
  add constraint mdm_model_fields_dict_relation_check
  check (
    (
      data_type = 'dict' and dict_code is not null and related_definition_id is null
    )
    or (
      data_type = 'relation_master' and related_definition_id is not null and dict_code is null
    )
    or (
      data_type not in ('dict', 'relation_master')
      and dict_code is null
      and related_definition_id is null
    )
  );

commit;
