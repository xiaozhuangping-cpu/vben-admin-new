import type { VbenFormSchema } from '#/adapter/form';

export const useColumns = (): Array<any> => [
  { title: '序号', type: 'seq', width: 60 },
  { field: 'taskName', title: '任务名称', minWidth: 150 },
  { field: 'type', title: '归集类型', width: 100 },
  { field: 'sourceSystem', title: '源系统', width: 120 },
  { field: 'targetModel', title: '目标模块', width: 120 },
  { field: 'frequency', title: '执行频率', width: 100 },
  {
    field: 'status',
    slots: { default: 'status' },
    title: '状态',
    width: 100,
  },
  {
    field: 'lastRun',
    title: '最后执行时间',
    width: 160,
  },
  {
    fixed: 'right',
    slots: { default: 'action' },
    title: '操作',
    width: 200,
  },
];

export const useSchema = (): VbenFormSchema[] => [
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入任务名称',
    },
    fieldName: 'taskName',
    label: '任务名称',
    rules: 'required',
  },
  {
    component: 'Select',
    componentProps: {
      options: [
        { label: 'ETL拉取', value: 'ETL' },
        { label: 'API接口', value: 'API' },
        { label: '数据库直连', value: 'DB' },
      ],
      placeholder: '请选择归集类型',
    },
    fieldName: 'type',
    label: '归集类型',
    rules: 'required',
  },
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入源系统名称',
    },
    fieldName: 'sourceSystem',
    label: '源系统',
    rules: 'required',
  },
  {
    component: 'Select',
    componentProps: {
      options: [
        { label: '组织架构', value: 'org' },
        { label: '员工账号', value: 'user' },
        { label: '供应商主数据', value: 'supplier' },
      ],
      placeholder: '请选择目标模型',
    },
    fieldName: 'targetModel',
    label: '目标模型',
    rules: 'required',
  },
  {
    component: 'Select',
    componentProps: {
      options: [
        { label: '每小时', value: 'hourly' },
        { label: '每天', value: 'daily' },
        { label: '每周末', value: 'weekly' },
        { label: '手动', value: 'manual' },
      ],
      placeholder: '请选择执行频率',
    },
    fieldName: 'frequency',
    label: '执行频率',
    defaultValue: 'daily',
  },
  {
    component: 'Textarea',
    componentProps: {
      placeholder: '配置详情 (JSON or Script)...',
    },
    fieldName: 'config',
    label: '配置详情',
  },
];

export const useSearchSchema = (): VbenFormSchema[] => [
  {
    component: 'Input',
    fieldName: 'taskName',
    label: '任务名称',
  },
  {
    component: 'Select',
    componentProps: {
      options: [
        { label: 'ETL拉取', value: 'ETL' },
        { label: 'API接口', value: 'API' },
        { label: '数据库直连', value: 'DB' },
      ],
    },
    fieldName: 'type',
    label: '类型',
  },
];
