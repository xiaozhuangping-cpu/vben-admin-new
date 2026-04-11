<script lang="ts" setup>
import { computed, reactive, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import {
  Alert,
  Form,
  Input,
  InputNumber,
  message,
  Select,
  Switch,
} from 'ant-design-vue';

import {
  buildNumberingPreview,
  createNumberingSegmentApi,
  DATE_FORMAT_OPTIONS,
  NUMBERING_TYPE_OPTIONS,
  RESET_POLICY_OPTIONS,
  updateNumberingSegmentApi,
  validateNumberingSegmentInput,
} from '#/api/mdm/numbering';

const emit = defineEmits(['success']);

const currentData = ref<any>(null);
const formState = reactive({
  currentValue: 0,
  dateFormat: undefined as string | undefined,
  enabled: true,
  numberingType: 'sequence',
  prefix: '',
  remark: '',
  resetPolicy: 'none',
  segmentCode: '',
  segmentName: '',
  seqLength: 4 as number | undefined,
  startValue: 1,
  step: 1,
  suffix: '',
});

const title = computed(() => (currentData.value?.id ? '编辑码段' : '新增码段'));

const showDateFormat = computed(() =>
  ['date', 'date_sequence'].includes(formState.numberingType),
);

const showSequenceFields = computed(() =>
  ['date_sequence', 'sequence'].includes(formState.numberingType),
);

const previewCode = computed(() =>
  buildNumberingPreview({
    ...formState,
    dateFormat: showDateFormat.value ? formState.dateFormat : undefined,
    numberingType: formState.numberingType as any,
    seqLength: showSequenceFields.value ? formState.seqLength : undefined,
  }),
);

function resetForm(data?: any) {
  formState.currentValue = Number(data?.currentValue ?? 0);
  formState.dateFormat = data?.dateFormat ?? undefined;
  formState.enabled = data?.enabled ?? true;
  formState.numberingType = data?.numberingType ?? 'sequence';
  formState.prefix = data?.prefix ?? '';
  formState.remark = data?.remark ?? '';
  formState.resetPolicy = data?.resetPolicy ?? 'none';
  formState.segmentCode = data?.segmentCode ?? '';
  formState.segmentName = data?.segmentName ?? '';
  formState.seqLength = data?.seqLength ?? 4;
  formState.startValue = Number(data?.startValue ?? 1);
  formState.step = Number(data?.step ?? 1);
  formState.suffix = data?.suffix ?? '';
}

function handleTypeChange(value: string) {
  formState.numberingType = value;

  if (value === 'date') {
    formState.resetPolicy = 'none';
    formState.seqLength = undefined;
  } else if (!formState.seqLength) {
    formState.seqLength = 4;
  }

  formState.dateFormat = showDateFormat.value
    ? formState.dateFormat
    : undefined;
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    try {
      const payload = validateNumberingSegmentInput({
        ...formState,
        dateFormat: showDateFormat.value ? formState.dateFormat : undefined,
        seqLength: showSequenceFields.value ? formState.seqLength : undefined,
      });
      modalApi.lock();
      try {
        await (currentData.value?.id
          ? updateNumberingSegmentApi(currentData.value.id, payload)
          : createNumberingSegmentApi(payload));
        currentData.value?.onSuccess?.();
        emit('success');
        modalApi.close();
      } finally {
        modalApi.lock(false);
      }
    } catch (error: any) {
      message.error(error?.message || '保存码段失败');
    }
  },
  onOpenChange(isOpen) {
    if (!isOpen) {
      return;
    }
    const data = modalApi.getData<any>() || {};
    currentData.value = data;
    resetForm(data);
  },
});
</script>

<template>
  <Modal :title="title" class="numbering-form-modal">
    <div class="space-y-4 p-4">
      <Alert
        message="预览会根据当前表单配置实时计算，不需要先保存。"
        show-icon
        type="info"
      />

      <div
        class="rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-3"
      >
        <div class="text-xs text-gray-500">当前预览</div>
        <div class="mt-1 text-base font-semibold text-primary">
          {{ previewCode || '-' }}
        </div>
      </div>

      <Form layout="vertical">
        <div class="grid grid-cols-2 gap-4">
          <Form.Item label="码段名称" required>
            <Input
              v-model:value="formState.segmentName"
              placeholder="请输入码段名称"
            />
          </Form.Item>
          <Form.Item label="码段编码" required>
            <Input
              v-model:value="formState.segmentCode"
              placeholder="请输入码段编码"
            />
          </Form.Item>

          <Form.Item label="编码类型" required>
            <Select
              v-model:value="formState.numberingType"
              :options="NUMBERING_TYPE_OPTIONS"
              class="w-full"
              @change="handleTypeChange"
            />
          </Form.Item>
          <Form.Item label="启用状态">
            <Switch v-model:checked="formState.enabled" />
          </Form.Item>

          <Form.Item label="前缀">
            <Input v-model:value="formState.prefix" placeholder="请输入前缀" />
          </Form.Item>
          <Form.Item label="后缀">
            <Input v-model:value="formState.suffix" placeholder="请输入后缀" />
          </Form.Item>

          <Form.Item v-if="showDateFormat" label="日期格式" required>
            <Select
              v-model:value="formState.dateFormat"
              :options="DATE_FORMAT_OPTIONS"
              class="w-full"
              placeholder="请选择日期格式"
            />
          </Form.Item>
          <Form.Item v-if="showSequenceFields" label="流水长度" required>
            <InputNumber
              v-model:value="formState.seqLength"
              :min="1"
              :precision="0"
              class="w-full"
              placeholder="请输入流水长度"
            />
          </Form.Item>

          <Form.Item v-if="showSequenceFields" label="起始值" required>
            <InputNumber
              v-model:value="formState.startValue"
              :min="1"
              :precision="0"
              class="w-full"
              placeholder="请输入起始值"
            />
          </Form.Item>
          <Form.Item v-if="showSequenceFields" label="步长" required>
            <InputNumber
              v-model:value="formState.step"
              :min="1"
              :precision="0"
              class="w-full"
              placeholder="请输入步长"
            />
          </Form.Item>

          <Form.Item v-if="showSequenceFields" label="重置策略">
            <Select
              v-model:value="formState.resetPolicy"
              :options="RESET_POLICY_OPTIONS"
              class="w-full"
            />
          </Form.Item>
          <Form.Item label="当前流水值">
            <InputNumber
              v-model:value="formState.currentValue"
              :disabled="true"
              :min="0"
              :precision="0"
              class="w-full"
            />
          </Form.Item>

          <Form.Item class="col-span-2" label="备注">
            <Input.TextArea
              v-model:value="formState.remark"
              :rows="3"
              placeholder="请输入备注"
            />
          </Form.Item>
        </div>
      </Form>
    </div>
  </Modal>
</template>

<style scoped>
.numbering-form-modal :deep(.ant-input-number) {
  width: 100%;
}
</style>
