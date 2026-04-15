import type { VbenFormSchema } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

export function useTargetColumns(): VxeGridProps<any>['columns'] {
  return [
    { type: 'seq', width: 60 },
    { field: 'name', title: '目标名称', minWidth: 160 },
    { field: 'code', title: '目标编码', width: 160 },
    {
      field: 'targetType',
      title: '目标类型',
      width: 120,
      slots: { default: 'targetType' },
    },
    {
      field: 'authType',
      title: '认证方式',
      width: 120,
      slots: { default: 'authType' },
    },
    { field: 'baseUrl', title: '连接地址', minWidth: 240 },
    {
      field: 'status',
      title: '状态',
      width: 100,
      slots: { default: 'status' },
    },
    { field: 'updatedAt', title: '更新时间', width: 180 },
    {
      field: 'action',
      title: '操作',
      width: 240,
      slots: { default: 'action' },
      fixed: 'right',
    },
  ];
}

export function useSchemeColumns(): VxeGridProps<any>['columns'] {
  return [
    { type: 'seq', width: 60 },
    { field: 'name', title: '方案名称', minWidth: 160 },
    { field: 'code', title: '方案编码', width: 160 },
    { field: 'definitionName', title: '数据模型', minWidth: 180 },
    { field: 'targetName', title: '分发目标', minWidth: 160 },
    {
      field: 'dispatchMode',
      title: '分发方式',
      width: 120,
      slots: { default: 'dispatchMode' },
    },
    {
      field: 'status',
      title: '方案状态',
      width: 110,
      slots: { default: 'schemeStatus' },
    },
    { field: 'lastDispatchedAt', title: '最近分发时间', width: 180 },
    {
      field: 'action',
      title: '操作',
      width: 260,
      slots: { default: 'action' },
      fixed: 'right',
    },
  ];
}

export function useFieldMappingColumns(): VxeGridProps<any>['columns'] {
  return [
    { type: 'seq', width: 60 },
    { field: 'sourceFieldCode', title: '源字段编码', minWidth: 180 },
    { field: 'targetFieldCode', title: '目标字段编码', minWidth: 180 },
    {
      field: 'mappingType',
      title: '映射方式',
      width: 120,
      slots: { default: 'mappingType' },
    },
    { field: 'fixedValue', title: '固定值', minWidth: 160 },
    { field: 'sortNo', title: '排序', width: 90 },
    {
      field: 'action',
      title: '操作',
      width: 160,
      slots: { default: 'action' },
      fixed: 'right',
    },
  ];
}

export function useTaskColumns(): VxeGridProps<any>['columns'] {
  return [
    { type: 'seq', width: 60 },
    { field: 'schemeName', title: '方案名称', minWidth: 160 },
    { field: 'definitionName', title: '数据模型', minWidth: 160 },
    { field: 'targetName', title: '分发目标', minWidth: 160 },
    { field: 'operationType', title: '任务类型', width: 120 },
    { field: 'triggerMode', title: '触发方式', width: 110 },
    {
      field: 'status',
      title: '执行状态',
      width: 110,
      slots: { default: 'taskStatus' },
    },
    { field: 'retryCount', title: '重试次数', width: 100 },
    { field: 'createdAt', title: '创建时间', width: 180 },
    { field: 'errorMessage', title: '错误信息', minWidth: 220 },
    {
      field: 'action',
      title: '操作',
      width: 140,
      slots: { default: 'action' },
      fixed: 'right',
    },
  ];
}

export function useLogColumns(): VxeGridProps<any>['columns'] {
  return [
    { type: 'seq', width: 60 },
    { field: 'taskSummary', title: '关联任务', minWidth: 180 },
    {
      field: 'level',
      title: '级别',
      width: 100,
      slots: { default: 'logLevel' },
    },
    {
      field: 'success',
      title: '结果',
      width: 100,
      slots: { default: 'logResult' },
    },
    { field: 'message', title: '日志内容', minWidth: 320 },
    { field: 'createdAt', title: '记录时间', width: 180 },
  ];
}

export function useTargetSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        placeholder: '例如：供应链 ERP',
      },
      fieldName: 'name',
      label: '目标名称',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '例如：SCM_ERP',
      },
      fieldName: 'code',
      label: '目标编码',
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        options: [
          { label: 'HTTP API', value: 'http' },
          { label: '数据库', value: 'database' },
          { label: '消息队列', value: 'mq' },
        ],
        placeholder: '请选择目标类型',
      },
      defaultValue: 'http',
      fieldName: 'targetType',
      label: '目标类型',
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        options: [
          { label: '无认证', value: 'none' },
          { label: 'Bearer Token', value: 'bearer' },
          { label: 'Basic Auth', value: 'basic' },
          { label: '自定义 Header', value: 'header' },
        ],
        placeholder: '请选择认证方式',
      },
      defaultValue: 'none',
      fieldName: 'authType',
      label: '认证方式',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '例如：https://erp.example.com/api/vendors',
      },
      fieldName: 'baseUrl',
      label: '连接地址',
    },
    {
      component: 'Select',
      componentProps: {
        options: [
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'PATCH', value: 'PATCH' },
        ],
        placeholder: '请选择分发请求方法',
      },
      defaultValue: 'POST',
      fieldName: 'dispatchMethod',
      label: '分发请求方法',
    },
    {
      component: 'Input',
      componentProps: {
        autoComplete: 'off',
        placeholder: 'Bearer 认证时填写 token',
      },
      defaultValue: '',
      fieldName: 'bearerToken',
      label: 'Bearer Token',
    },
    {
      component: 'Input',
      componentProps: {
        autoComplete: 'off',
        placeholder: 'Basic Auth 用户名，留空表示保持原值',
      },
      defaultValue: '',
      fieldName: 'basicUsername',
      label: 'Basic 用户名',
    },
    {
      component: 'InputPassword',
      componentProps: {
        autoComplete: 'new-password',
        placeholder: 'Basic Auth 密码，留空表示保持原值',
      },
      defaultValue: '',
      fieldName: 'basicPassword',
      label: 'Basic 密码',
    },
    {
      component: 'Textarea',
      componentProps: {
        placeholder:
          '自定义请求头 JSON，例如：{"X-Tenant":"demo","X-App":"mdm"}',
      },
      defaultValue: '{}',
      fieldName: 'headersText',
      label: '自定义请求头',
    },
    {
      component: 'Select',
      componentProps: {
        options: [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'HEAD', value: 'HEAD' },
        ],
        placeholder: '请选择测试请求方法',
      },
      defaultValue: 'GET',
      fieldName: 'testMethod',
      label: '测试请求方法',
    },
    {
      component: 'Textarea',
      componentProps: {
        placeholder:
          '测试连接时发送的 JSON 报文，例如：{"ping":true,"source":"mdm"}',
      },
      defaultValue: '{}',
      fieldName: 'testPayloadText',
      label: '测试请求报文',
    },
    {
      component: 'Textarea',
      componentProps: {
        placeholder: '高级 JSON 配置，会与上面的可视化配置合并',
      },
      defaultValue: '{}',
      fieldName: 'authConfigText',
      label: '高级配置',
    },
    {
      component: 'Textarea',
      componentProps: {
        placeholder: '描述这个目标系统的用途或约束',
      },
      fieldName: 'description',
      label: '说明',
    },
    {
      component: 'RadioGroup',
      componentProps: {
        options: [
          { label: '启用', value: true },
          { label: '停用', value: false },
        ],
      },
      defaultValue: true,
      fieldName: 'status',
      label: '状态',
    },
  ];
}

export function useSchemeSchema(
  definitionOptions: Array<{ label: string; value: string }>,
  targetOptions: Array<{ label: string; value: string }>,
): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      componentProps: {
        placeholder: '例如：供应商主数据到 ERP',
      },
      fieldName: 'name',
      label: '方案名称',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '例如：SUPPLIER_TO_ERP',
      },
      fieldName: 'code',
      label: '方案编码',
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        options: definitionOptions,
        placeholder: '请选择已发布模型',
      },
      fieldName: 'definitionId',
      label: '数据模型',
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        options: targetOptions,
        placeholder: '请选择分发目标',
      },
      fieldName: 'targetId',
      label: '分发目标',
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        options: [
          { label: '手工触发', value: 'manual' },
          { label: '实时分发', value: 'realtime' },
          { label: '定时分发', value: 'cron' },
        ],
        placeholder: '请选择分发方式',
      },
      defaultValue: 'manual',
      fieldName: 'dispatchMode',
      label: '分发方式',
      rules: 'required',
    },
    {
      component: 'CheckboxGroup',
      componentProps: {
        options: [
          { label: '新增', value: 'create' },
          { label: '修改', value: 'update' },
          { label: '删除', value: 'delete' },
        ],
      },
      defaultValue: ['create', 'update'],
      fieldName: 'triggerEvents',
      label: '触发事件',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '例如：0 */2 * * *',
      },
      fieldName: 'cronExpr',
      label: 'Cron 表达式',
    },
    {
      component: 'Textarea',
      componentProps: {
        placeholder: "只填写 WHERE 条件表达式，例如：status = 'published'",
      },
      fieldName: 'filterSql',
      label: '分发过滤条件',
    },
    {
      component: 'Switch',
      defaultValue: false,
      fieldName: 'includeDataAuth',
      label: '继承数据授权',
    },
    {
      component: 'Select',
      componentProps: {
        options: [
          { label: '草稿', value: 'draft' },
          { label: '启用', value: 'enabled' },
          { label: '停用', value: 'disabled' },
        ],
      },
      defaultValue: 'draft',
      fieldName: 'status',
      label: '方案状态',
      rules: 'required',
    },
    {
      component: 'Textarea',
      componentProps: {
        placeholder: '补充分发说明或备注',
      },
      fieldName: 'remark',
      label: '备注',
    },
  ];
}

export function useMappingSchema(
  sourceFieldOptions: Array<{ label: string; value: string }>,
): VbenFormSchema[] {
  return [
    {
      component: 'Select',
      componentProps: {
        options: sourceFieldOptions,
        placeholder: '请选择源字段',
      },
      fieldName: 'sourceFieldCode',
      label: '源字段编码',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入目标字段编码',
      },
      fieldName: 'targetFieldCode',
      label: '目标字段编码',
      rules: 'required',
    },
    {
      component: 'Select',
      componentProps: {
        options: [
          { label: '直接映射', value: 'direct' },
          { label: '固定值', value: 'fixed' },
          { label: '脚本转换', value: 'script' },
        ],
      },
      defaultValue: 'direct',
      fieldName: 'mappingType',
      label: '映射方式',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '当映射方式为固定值时填写',
      },
      fieldName: 'fixedValue',
      label: '固定值',
    },
    {
      component: 'Textarea',
      componentProps: {
        placeholder: '当映射方式为脚本转换时填写',
      },
      fieldName: 'transformScript',
      label: '转换脚本',
    },
    {
      component: 'InputNumber',
      componentProps: {
        min: 0,
      },
      defaultValue: 10,
      fieldName: 'sortNo',
      label: '排序',
    },
  ];
}
