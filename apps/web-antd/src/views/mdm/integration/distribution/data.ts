import type { VxeGridProps } from '#/adapter/vxe-table';

export function useColumns() {
  return [
    { type: 'seq', width: 50 },
    { field: 'targetSystem', title: '分发目标系统', width: 140 },
    { field: 'model', title: '分发模型', width: 140 },
    {
      field: 'syncType',
      title: '同步方式',
      width: 120,
      slots: { default: 'syncType' },
    },
    {
      field: 'status',
      title: '分发状态',
      width: 120,
      slots: { default: 'status' },
    },
    { field: 'lastSync', title: '最后同步时间', width: 160 },
    {
      field: 'successRate',
      title: '成功率',
      width: 100,
      slots: { default: 'rate' },
    },
    {
      field: 'action',
      title: '操作',
      width: 160,
      slots: { default: 'action' },
      fixed: 'right',
    },
  ];
}

export function useSchema() {
  return [
    {
      field: 'targetSystem',
      label: '目标系统',
      component: 'Select',
      required: true,
      componentProps: {
        options: [
          { label: 'SAP ERP', value: 'erp' },
          { label: 'Salesforce CRM', value: 'crm' },
          { label: 'PLM 系统', value: 'plm' },
          { label: '电商中台', value: 'mall' },
        ],
      },
    },
    {
      field: 'model',
      label: '分发模型',
      component: 'Select',
      required: true,
      componentProps: {
        options: [
          { label: '客户主体', value: 'customer' },
          { label: '物料主数据', value: 'material' },
        ],
      },
    },
    {
      field: 'syncType',
      label: '同步方式',
      component: 'Select',
      componentProps: {
        options: [
          { label: '实时 (Webhook)', value: 'realtime' },
          { label: '定时同步 (Batch)', value: 'cron' },
          { label: '增量推送', value: 'delta' },
        ],
      },
    },
    {
      field: 'endpoint',
      label: '接收端 Endpoint',
      component: 'Input',
      required: true,
    },
  ];
}
