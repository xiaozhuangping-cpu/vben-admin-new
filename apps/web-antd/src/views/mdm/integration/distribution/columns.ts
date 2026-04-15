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
