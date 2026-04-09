import type { VbenFormSchema } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

import { getThemeListApi } from '#/api/mdm/theme';

export const useColumns = (): VxeGridProps<any>['columns'] => [
  { title: '序号', type: 'seq', width: 60 },
  { field: 'name', title: '模型名称', minWidth: 180 },
  { field: 'code', title: '模型编码', width: 160 },
  { field: 'themeName', title: '数据主题', width: 160 },
  { field: 'versionNo', title: '版本号', width: 100 },
  { field: 'tableName', title: '数据表', minWidth: 220 },
  {
    field: 'status',
    slots: { default: 'status' },
    title: '状态',
    width: 100,
  },
  { field: 'description', title: '描述', minWidth: 220 },
  { field: 'updatedAt', title: '更新时间', width: 180 },
  {
    fixed: 'right',
    showOverflow: false,
    slots: { default: 'action' },
    title: '操作',
    width: 360,
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
    component: 'ApiSelect',
    componentProps: {
      api: async () => {
        const { items } = await getThemeListApi({ pageSize: 1000 });
        return items.map((item: any) => ({
          label: item.name,
          value: item.id,
        }));
      },
      placeholder: '请选择数据主题',
    },
    fieldName: 'themeId',
    label: '数据主题',
    rules: 'required',
  },
  {
    component: 'Textarea',
    componentProps: {
      placeholder: '请输入描述',
    },
    fieldName: 'description',
    label: '描述',
  },
];
