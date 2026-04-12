<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Select, Spin } from 'ant-design-vue';

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    prefix?: string;
    placeholder?: string;
  }>(),
  {
    modelValue: '',
    placeholder: '搜索并选择图标',
    prefix: 'lucide',
  },
);

const emit = defineEmits<{
  'update:modelValue': [string];
}>();

const iconCache = new Map<string, string[]>();
const loading = ref(false);
const keyword = ref('');
const innerValue = ref(props.modelValue);
const allIcons = ref<string[]>([]);

watch(
  () => props.modelValue,
  (value) => {
    innerValue.value = value || '';
  },
);

watch(innerValue, (value) => {
  emit('update:modelValue', value || '');
});

const filteredIcons = computed(() => {
  const normalized = keyword.value.trim().toLowerCase();
  const matched = normalized
    ? allIcons.value.filter((item) => item.toLowerCase().includes(normalized))
    : allIcons.value;
  return matched.slice(0, 80);
});

async function ensureIconsLoaded() {
  if (iconCache.has(props.prefix)) {
    allIcons.value = iconCache.get(props.prefix) || [];
    return;
  }

  loading.value = true;
  try {
    const response = await fetch(
      `https://api.iconify.design/collection?prefix=${props.prefix}`,
    );
    const data = await response.json();
    const icons = [
      ...(data.uncategorized || []),
      ...Object.values(data.categories || {}).flat(),
    ].map((name) => `${props.prefix}:${name}`);

    iconCache.set(props.prefix, icons);
    allIcons.value = icons;
  } catch (error) {
    console.error('加载图标列表失败', error);
  } finally {
    loading.value = false;
  }
}

function handleSearch(value: string) {
  keyword.value = value;
}

function handleDropdownVisibleChange(open: boolean) {
  if (open) {
    void ensureIconsLoaded();
  }
}
</script>

<template>
  <Select
    v-model:value="innerValue"
    allow-clear
    class="w-full"
    :filter-option="false"
    :not-found-content="loading ? undefined : '未找到匹配图标'"
    :placeholder="placeholder"
    show-search
    @dropdown-visible-change="handleDropdownVisibleChange"
    @search="handleSearch"
  >
    <template v-if="loading" #notFoundContent>
      <div class="py-3 text-center">
        <Spin size="small" />
      </div>
    </template>

    <Select.Option v-for="icon in filteredIcons" :key="icon" :value="icon">
      <div class="flex items-center gap-2">
        <IconifyIcon :icon="icon" class="size-4 shrink-0" />
        <span class="truncate">{{ icon }}</span>
      </div>
    </Select.Option>
  </Select>
</template>
