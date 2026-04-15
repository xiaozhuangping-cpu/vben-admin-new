begin;

create or replace function public.enqueue_mdm_distribution_tasks(
  p_definition_id uuid,
  p_record_id text default null,
  p_operation_type text default 'update',
  p_trigger_mode text default 'event'
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_scheme record;
  v_task_id uuid;
  v_items jsonb := '[]'::jsonb;
begin
  for v_scheme in
    select
      s.id,
      s.name,
      s.target_id,
      s.dispatch_mode
    from public.mdm_distribution_schemes s
    join public.mdm_distribution_targets t
      on t.id = s.target_id
    where s.definition_id = p_definition_id
      and s.status = 'enabled'
      and t.status = true
      and (
        coalesce(array_length(s.trigger_events, 1), 0) = 0
        or coalesce(s.trigger_events, '{}'::text[]) @> array[p_operation_type]
      )
  loop
    insert into public.mdm_distribution_tasks (
      scheme_id,
      definition_id,
      target_id,
      task_type,
      trigger_mode,
      operation_type,
      record_id,
      request_payload,
      status,
      created_by,
      updated_by
    )
    values (
      v_scheme.id,
      p_definition_id,
      v_scheme.target_id,
      'dispatch',
      p_trigger_mode,
      p_operation_type,
      p_record_id,
      jsonb_build_object(
        'definitionId', p_definition_id,
        'dispatchMode', v_scheme.dispatch_mode,
        'operationType', p_operation_type,
        'recordId', p_record_id,
        'triggerMode', p_trigger_mode
      ),
      'pending',
      public.current_mdm_user_id(),
      public.current_mdm_user_id()
    )
    returning id into v_task_id;

    insert into public.mdm_distribution_task_logs (
      task_id,
      level,
      message,
      request_payload,
      success
    )
    values (
      v_task_id,
      'info',
      format('已根据分发方案[%s]创建任务。', coalesce(v_scheme.name, v_scheme.id::text)),
      jsonb_build_object(
        'definitionId', p_definition_id,
        'operationType', p_operation_type,
        'recordId', p_record_id,
        'schemeId', v_scheme.id,
        'triggerMode', p_trigger_mode
      ),
      true
    );

    v_items := v_items || jsonb_build_array(
      jsonb_build_object(
        'taskId', v_task_id,
        'schemeId', v_scheme.id,
        'targetId', v_scheme.target_id,
        'dispatchMode', v_scheme.dispatch_mode
      )
    );
  end loop;

  return jsonb_build_object(
    'items', v_items,
    'total', jsonb_array_length(v_items)
  );
end;
$$;

grant execute on function public.enqueue_mdm_distribution_tasks(uuid, text, text, text) to authenticated;

commit;
