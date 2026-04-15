<script lang="ts" setup>
import { ref } from 'vue';

import { Button, Input } from 'ant-design-vue';

import RelationMasterPicker from './relation-master-picker.vue';

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    displayValue?: string;
    modelValue?: string;
    placeholder?: string;
    readonly?: boolean;
    relatedDefinitionId?: string;
  }>(),
  {
    disabled: false,
    displayValue: '',
    modelValue: '',
    placeholder: '',
    readonly: false,
    relatedDefinitionId: '',
  },
);

const emit = defineEmits<{
  (e: 'select', payload: { displayName: string; id: string; row: any }): void;
  (e: 'update:displayValue', value: string): void;
  (e: 'update:modelValue', value: string): void;
}>();

const pickerOpen = ref(false);

function handleOpen() {
  if (props.disabled || !props.relatedDefinitionId) {
    return;
  }
  pickerOpen.value = true;
}

function handleSelect(payload: { displayName: string; id: string; row: any }) {
  emit('update:modelValue', payload.id);
  emit('update:displayValue', payload.displayName);
  emit('select', payload);
}
</script>

<template>
  <div class="flex w-full items-center gap-2">
    <input type="hidden" :value="modelValue || ''" />
    <Input
      class="min-w-0 flex-1"
      :placeholder="placeholder"
      :readonly="true"
      :value="displayValue || modelValue || ''"
    />
    <Button
      :disabled="disabled || !relatedDefinitionId"
      class="shrink-0"
      @click="handleOpen"
    >
      选择
    </Button>
    <RelationMasterPicker
      v-model:open="pickerOpen"
      :related-definition-id="relatedDefinitionId"
      @select="handleSelect"
    />
  </div>
</template>
