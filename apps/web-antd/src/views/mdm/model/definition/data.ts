import type { VbenFormSchema } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

export const useColumns = (): VxeGridProps<any>['columns'] => [
  { title: '序号', type: 'seq', width: 60 },
  { field: 'name', title: '模型名称', minWidth: 160 },
  { field: 'code', title: '模型编码', width: 140 },
  { field: 'tableName', title: '表名称', width: 140 },
  { field: 'type', title: '模型类型', width: 100, slots: { default: 'type' } },
  { field: 'org', title: '组织机构', width: 120 },
  { field: 'version', title: '当前版本', width: 100 },
  {
    field: 'status',
    slots: { default: 'status' },
    title: '状态',
    width: 100,
  },
  {
    fixed: 'right',
    slots: { default: 'action' },
    title: '操作',
    width: 240,
  },
];

export const useSchema = (): VbenFormSchema[] => [
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入模型名称',
    },
    fieldName: 'name',
    label: '模型名称',
    rules: 'required',
  },
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入模型编码',
    },
    fieldName: 'code',
    label: '模型编码',
    rules: 'required',
  },
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入表名称 (留空则与编码一致)',
    },
    fieldName: 'tableName',
    label: '表名称',
  },
  {
    component: 'Select',
    componentProps: {
      options: [
        { label: '普通模型', value: 'normal' },
        { label: '组合模型', value: 'composite' },
        { label: '继承模型', value: 'inherited' },
        { label: '关联模型', value: 'related' },
      ],
      placeholder: '请选择模型类型',
    },
    fieldName: 'type',
    label: '模型类型',
    rules: 'required',
    defaultValue: 'normal',
  },
  {
    component: 'Input',
    componentProps: {
      placeholder: '请选择组织机构',
    },
    fieldName: 'org',
    label: '组织机构',
    rules: 'required',
  },
  {
    component: 'RadioGroup',
    componentProps: {
      options: [
        { label: '是', value: true },
        { label: '否', value: false },
      ],
    },
    fieldName: 'isAudit',
    label: '是否审核',
    defaultValue: false,
  },
  {
    component: 'Input',
    componentProps: {
      placeholder: '请输入排序号',
    },
    fieldName: 'sort',
    label: '排序号',
    defaultValue: 10,
  },
  {
    component: 'InputTextArea',
    componentProps: {
      placeholder: '请输入备注',
    },
    fieldName: 'remarks',
    label: '备注',
  },
];
