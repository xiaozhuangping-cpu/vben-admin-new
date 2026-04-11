import type { VbenFormSchema } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

import { getDictItemOptionsApi } from '#/api/mdm/dict';
import { getThemeListApi } from '#/api/mdm/theme';
import { getUserGroupListApi } from '#/api/mdm/user-group';

export const useColumns = (): VxeGridProps<any>['columns'] => [
  { title: '序号', type: 'seq', width: 60 },
  { field: 'name', title: '模型名称', minWidth: 180 },
  { field: 'code', title: '模型编码', width: 160 },
  { field: 'modelTypeLabel', title: '模型类型', width: 120 },
  { field: 'themeName', title: '数据主题', width: 160 },
  { field: 'versionNo', title: '版本号', width: 100 },
  { field: 'sortNo', title: '排序号', width: 100 },
  { field: 'tableName', title: '数据表', minWidth: 220 },
  {
    field: 'status',
    slots: { default: 'status' },
    title: '状态',
    width: 100,
  },
  {
    field: 'enabled',
    slots: { default: 'enabled' },
    title: '是否启用',
    width: 100,
  },
  {
    field: 'needAudit',
    slots: { default: 'needAudit' },
    title: '需要审核',
    width: 100,
  },
  { field: 'auditGroupName', title: '审核人', width: 140 },
  { field: 'remark', title: '备注', minWidth: 220 },
  { field: 'updatedAt', title: '更新时间', width: 180 },
  {
    fixed: 'right',
    showOverflow: false,
    slots: { default: 'action' },
    title: '操作',
    width: 420,
  },
];

export const useSchema = ({
  isReadonly = false,
}: {
  isReadonly?: boolean;
} = {}): VbenFormSchema[] => [
  {
    component: 'Input',
    componentProps: {
      disabled: isReadonly,
      placeholder: '请输入模型名称',
    },
    fieldName: 'name',
    label: '模型名称',
    rules: 'required',
  },
  {
    component: 'Input',
    componentProps: {
      disabled: isReadonly,
      placeholder: '请输入模型编码',
    },
    fieldName: 'code',
    label: '模型编码',
    rules: 'required',
  },
  {
    component: 'ApiSelect',
    componentProps: {
      api: async () => await getDictItemOptionsApi('mdm_model_type'),
      disabled: isReadonly,
      placeholder: '请选择模型类型',
    },
    fieldName: 'modelType',
    label: '模型类型',
    rules: 'required',
  },
  {
    component: 'ApiSelect',
    componentProps: {
      api: async () => {
        const { items } = await getThemeListApi({ pageSize: 1000 });
        return items.map((item: any) => ({
          label: item.name,
          value: item.id,
        }));
      },
      disabled: isReadonly,
      placeholder: '请选择数据主题',
    },
    fieldName: 'themeId',
    label: '数据主题',
    rules: 'required',
  },
  {
    component: 'InputNumber',
    componentProps: {
      disabled: isReadonly,
      min: 0,
      placeholder: '请输入排序号',
    },
    defaultValue: 0,
    fieldName: 'sortNo',
    label: '排序号',
    rules: 'required',
  },
  {
    component: 'Switch',
    componentProps: {
      disabled: isReadonly,
    },
    defaultValue: true,
    fieldName: 'enabled',
    label: '是否启用',
  },
  {
    component: 'Switch',
    defaultValue: false,
    fieldName: 'needAudit',
    label: '是否需要审核',
  },
  {
    component: 'ApiSelect',
    componentProps: {
      api: async () => {
        const { items } = await getUserGroupListApi({ pageSize: 1000 });
        return items.map((item: any) => ({
          label: item.name,
          value: item.id,
        }));
      },
      placeholder: '请选择审核人',
    },
    fieldName: 'auditGroupId',
    label: '审核人',
  },
  {
    component: 'Textarea',
    componentProps: {
      placeholder: '请输入备注',
    },
    fieldName: 'remark',
    label: '备注',
  },
];
