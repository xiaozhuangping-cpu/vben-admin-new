<script setup lang="ts">
import type { Recordable } from '@vben/types';

import type { VbenFormSchema } from '@vben-core/form-ui';

import { computed, reactive } from 'vue';

import { $t } from '@vben/locales';

import { useVbenForm } from '@vben-core/form-ui';
import { VbenButton } from '@vben-core/shadcn-ui';
import type { VbenButtonProps } from '@vben-core/shadcn-ui';

interface Props {
  formSchema?: VbenFormSchema[];
  submitButtonProps?: VbenButtonProps;
  submitButtonText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  formSchema: () => [],
  submitButtonProps: () => ({} as VbenButtonProps),
  submitButtonText: '',
});

const emit = defineEmits<{
  submit: [Recordable<any>];
}>();

const buttonInteractionClass =
  'px-10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/60 active:translate-y-0.5';

const submitButtonText = computed(() =>
  props.submitButtonText || $t('profile.updateBasicProfile'),
);

const resolvedButtonProps = computed(() => {
  const buttonProps = props.submitButtonProps ?? {};
  return {
    ...buttonProps,
    class: [buttonInteractionClass, buttonProps.class],
  };
});

const [Form, formApi] = useVbenForm(
  reactive({
    commonConfig: {
      // 所有表单项
      componentProps: {
        class: 'w-full',
      },
    },
    layout: 'horizontal',
    schema: computed(() => props.formSchema),
    showDefaultActions: false,
  }),
);

async function handleSubmit() {
  const { valid } = await formApi.validate();
  const values = await formApi.getValues();
  if (valid) {
    emit('submit', values);
  }
}

defineExpose({
  getFormApi: () => formApi,
});
</script>
<template>
  <div @keydown.enter.prevent="handleSubmit">
    <Form />
    <div class="mt-4 flex justify-center">
      <VbenButton
        type="submit"
        v-bind="resolvedButtonProps"
        @click="handleSubmit"
      >
        {{ submitButtonText }}
      </VbenButton>
    </div>
  </div>
</template>
