<script lang="ts" setup>
import { useVbenForm } from '#/adapter/form';
import { message, Card, Button, Typography, Space, Tooltip } from 'ant-design-vue';
import { createMenuApi, updateMenuApi } from '#/api/mdm/rbac-menu';
import { useSchema } from '../data';
import { watch, ref } from 'vue';
import { IconifyIcon } from '@vben/icons';
import type { RouteCandidate } from '#/utils/route-scanner';

const props = defineProps<{
  menuData: any[];
  componentOptions: any[];
  routeCandidates: RouteCandidate[];
  currentData: any;
}>();

const emit = defineEmits(['success', 'cancel']);

const loading = ref(false);

function normalizeMenuFormValues(values: Record<string, any> = {}) {
  return {
    ...values,
    parent_id: values.parent_id ?? null,
  };
}

function applyRouteSuggestion(component?: string) {
  if (!component || component === 'BasicLayout') {
    return;
  }

  const found = props.routeCandidates.find((candidate) => {
    return (
      candidate.component === component ||
      candidate.relative === component
    );
  });

  if (!found) {
    return;
  }

  const values = formApi.getValues() as Record<string, any>;
  const isNew = !props.currentData?.id;

  formApi.setValues({
    title: isNew || !values.title ? found.title : values.title,
    path: isNew || !values.path ? found.path : values.path,
    name: isNew || !values.name ? found.name : values.name,
    permission:
      isNew || !values.permission ? found.permission : values.permission,
  });
}

const [Form, formApi] = useVbenForm({
  handleSubmit: onSubmit,
  schema: useSchema(props.menuData, props.componentOptions, applyRouteSuggestion),
  showDefaultActions: false,
  wrapperClass: 'grid-cols-1 md:grid-cols-2 gap-x-8',
});

// 监听当前编辑的数据
watch(
  () => props.currentData,
  (val) => {
    if (val) {
      formApi.resetForm();
      formApi.setValues(normalizeMenuFormValues(val));
      if (val.component) {
        applyRouteSuggestion(val.component);
      }
    } else {
      formApi.resetForm();
    }
  },
  { immediate: true },
);

// 监听菜单库更新下拉选项
watch(
  () => props.menuData,
  (val) => {
    formApi.updateSchema([
      {
        fieldName: 'parent_id',
        componentProps: {
          fieldNames: { label: 'title', value: 'id', children: 'children' },
          treeData: val,
          placeholder: '请选择上级菜单 (不选为顶级)',
          allowClear: true,
          showSearch: true,
          treeDefaultExpandAll: true,
          style: { width: '100%' },
        },
      },
    ]);
  },
);

async function onSubmit(values: any) {
  try {
    loading.value = true;
    const payload = normalizeMenuFormValues(values);
    if (props.currentData?.id) {
      await updateMenuApi(props.currentData.id, payload);
      message.success('菜单配置已更新');
    } else {
      await createMenuApi(payload);
      message.success('新菜单创建成功');
    }
    formApi.resetForm();
    emit('success');
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
}

function handleSave() {
  formApi.validateAndSubmitForm();
}

function handleReset() {
  formApi.resetForm();
  emit('cancel');
}
</script>

<template>
  <Card 
    class="h-full flex flex-col shadow-sm border-border" 
    :body-style="{ flex: 1, overflow: 'hidden', padding: '16px', display: 'flex', flexDirection: 'column' }"
  >
    <template #title>
      <div class="flex items-center gap-2">
        <div class="w-1 h-4 bg-primary rounded-full"></div>
        <span>{{ currentData?.id ? '编辑节点详情' : '页面节点配置' }}</span>
        <Typography.Text v-if="currentData?.id" type="secondary" class="text-[11px] font-normal opacity-60 ml-1">
          (ID: {{ currentData.id }})
        </Typography.Text>
      </div>
    </template>
    
    <template #extra>
      <Space v-if="currentData && !currentData.autoManaged" :size="8">
        <Tooltip title="清空表单">
          <Button @click="handleReset" class="flex items-center justify-center">
            <template #icon><IconifyIcon icon="lucide:eraser" /></template>
          </Button>
        </Tooltip>
        <div class="w-px h-4 bg-border mx-1"></div>
        <Button :loading="loading" type="primary" @click="handleSave" class="flex items-center gap-2">
          <template #icon><IconifyIcon icon="lucide:save" /></template>
          保存配置
        </Button>
      </Space>
    </template>

    <div class="flex-1 overflow-hidden flex flex-col pt-2">
      <div 
        v-if="!currentData" 
        class="flex-1 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-background-deep text-gray-400 m-2"
      >
        <IconifyIcon icon="lucide:layout-template" class="text-4xl text-gray-200 mb-4" />
        <div class="text-sm px-12 text-center">点击左侧树节点或“新增顶级”来配置您的系统导航</div>
      </div>
      <div
        v-else-if="currentData.autoManaged"
        class="flex-1 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-100 bg-blue-50/50 text-blue-700 m-2"
      >
        <IconifyIcon icon="lucide:wand-sparkles" class="text-4xl text-blue-300 mb-4" />
        <div class="text-base font-semibold">{{ currentData.title }}</div>
        <div class="mt-2 max-w-md text-center text-sm leading-6 text-blue-700/80">
          这是系统根据已发布数据定义自动生成的菜单项。这里不需要单独编辑，您可以直接在左侧拖拽调整它在菜单中的位置。
        </div>
      </div>
      <div v-else class="flex-1 overflow-auto custom-scrollbar px-2">
        <div class="mb-6 flex items-start gap-3 px-4 py-3 bg-blue-50/60 border border-blue-100 rounded-xl text-blue-700 text-xs shadow-sm shadow-blue-500/5">
          <IconifyIcon icon="lucide:zap" class="mt-0.5 flex-shrink-0 animate-pulse text-blue-500" />
          <span>
            <strong class="block mb-0.5">智能填充已就绪</strong>
            当您选择组件路径时，系统将自动基于文件元数据注入标题、路由名及权限标识。
          </span>
        </div>
        <Form />
      </div>
    </div>
  </Card>
</template>

<style scoped>
:deep(.ant-card) {
  border-radius: 16px;
  overflow: hidden;
}

:deep(.ant-card-head) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  padding: 0 16px;
  min-height: 52px;
}

:deep(.vben-form) {
  padding: 0 !important;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
</style>
