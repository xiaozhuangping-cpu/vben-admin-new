import type { VxeTableGridOptions } from '@vben/plugins/vxe-table';

import { h } from 'vue';

import {
  setupVbenVxeTable,
  useVbenVxeGrid as useRawVbenVxeGrid,
} from '@vben/plugins/vxe-table';

import { Button, Image } from 'ant-design-vue';

import { formatDateTime } from '#/utils/date';

import { useVbenForm } from './form';

const DATE_TIME_FIELD_PATTERN =
  /(?:authExpiry|createTime|createdAt|created_at|publishTime|submitTime|updateTime|updatedAt|updated_at)$/i;

function normalizeColumns(columns: any[] = []) {
  return columns.map((column) => {
    const nextColumn = { ...column };

    if (Array.isArray(nextColumn.children) && nextColumn.children.length > 0) {
      nextColumn.children = normalizeColumns(nextColumn.children);
    }

    const field = typeof nextColumn.field === 'string' ? nextColumn.field : '';
    if (
      field &&
      DATE_TIME_FIELD_PATTERN.test(field) &&
      !nextColumn.formatter &&
      !nextColumn.slots
    ) {
      nextColumn.formatter = ({ cellValue }: { cellValue?: string }) =>
        formatDateTime(cellValue);
    }

    return nextColumn;
  });
}

setupVbenVxeTable({
  configVxeTable: (vxeUI) => {
    vxeUI.setConfig({
      grid: {
        align: 'center',
        border: false,
        columnConfig: {
          resizable: true,
        },
        minHeight: 180,
        formConfig: {
          // 全局禁用vxe-table的表单配置，使用formOptions
          enabled: false,
        },
        proxyConfig: {
          autoLoad: true,
          response: {
            result: 'items',
            total: 'total',
            list: 'items',
          },
          showActiveMsg: true,
          showResponseMsg: false,
        },
        round: true,
        showOverflow: true,
        size: 'small',
      } as VxeTableGridOptions,
    });

    // 表格配置项可以用 cellRender: { name: 'CellImage' },
    vxeUI.renderer.add('CellImage', {
      renderTableDefault(renderOpts, params) {
        const { props } = renderOpts;
        const { column, row } = params;
        return h(Image, { src: row[column.field], ...props });
      },
    });

    // 表格配置项可以用 cellRender: { name: 'CellLink' },
    vxeUI.renderer.add('CellLink', {
      renderTableDefault(renderOpts) {
        const { props } = renderOpts;
        return h(
          Button,
          { size: 'small', type: 'link' },
          { default: () => props?.text },
        );
      },
    });

    // 这里可以自行扩展 vxe-table 的全局配置，比如自定义格式化
    // vxeUI.formats.add
  },
  useVbenForm,
});

function useVbenVxeGrid(options: any) {
  const nextOptions = {
    ...options,
    gridOptions: {
      ...options.gridOptions,
      columns: normalizeColumns(options.gridOptions?.columns ?? []),
    },
  };

  return useRawVbenVxeGrid(nextOptions);
}

export { useVbenVxeGrid };

export type * from '@vben/plugins/vxe-table';
