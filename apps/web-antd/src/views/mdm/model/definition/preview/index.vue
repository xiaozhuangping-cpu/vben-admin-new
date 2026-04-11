<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Collapse,
  DatePicker,
  Empty,
  Input,
  InputNumber,
  message,
  Select,
  Space,
  Spin,
  Switch,
  Upload,
} from 'ant-design-vue';

import { getDictItemOptionsApi } from '#/api/mdm/dict';
import { getModelFieldListApi } from '#/api/mdm/model-definition';

import {
  getDisplayDraftStorageKey,
  getDisplayStorageKey,
  normalizeDesignerSchema,
} from '../form-designer';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const fields = ref<any[]>([]);
const schema = ref<any>({ sections: [], version: 1 });
const dictItemOptionsMap = ref<
  Record<string, Array<{ label: string; value: string }>>
>({});
const formValues = ref<Record<string, any>>({});

const modelId = computed(() => String(route.params.id || ''));

const visibleSections = computed(() =>
  schema.value.sections.map((section: any) => ({
    ...section,
    items: section.items.filter((item: any) => item.visible),
  })),
);

function loadLocalSchema() {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const draftRaw = window.sessionStorage.getItem(
      getDisplayDraftStorageKey(modelId.value),
    );
    const raw =
      draftRaw ||
      window.localStorage.getItem(getDisplayStorageKey(modelId.value));
    const stored = raw ? JSON.parse(raw) : null;
    schema.value = normalizeDesignerSchema(fields.value, stored);
  } catch {
    schema.value = normalizeDesignerSchema(fields.value, null);
  }
}

function buildInitialValues() {
  formValues.value = Object.fromEntries(
    visibleSections.value
      .flatMap((section: any) => section.items)
      .map((item: any) => [
        item.fieldCode.toLowerCase(),
        item.defaultValue ?? undefined,
      ]),
  );
}

function getDictOptionsByCode(dictCode?: string) {
  if (!dictCode) {
    return [];
  }
  return dictItemOptionsMap.value[dictCode] ?? [];
}

async function ensureDictOptions(dictCode?: string) {
  if (!dictCode || dictItemOptionsMap.value[dictCode]) {
    return;
  }
  const options = await getDictItemOptionsApi(dictCode);
  dictItemOptionsMap.value = {
    ...dictItemOptionsMap.value,
    [dictCode]: options,
  };
}

async function preloadSchemaDictOptions() {
  const dictCodes = [
    ...new Set(
      schema.value.sections.flatMap((section: any) =>
        section.items
          .filter((item: any) => item.component === 'Dict' && item.dictCode)
          .map((item: any) => item.dictCode as string),
      ),
    ),
  ];
  await Promise.all(dictCodes.map((dictCode) => ensureDictOptions(dictCode)));
}

async function loadPage() {
  if (!modelId.value) {
    return;
  }
  loading.value = true;
  try {
    const modelFields = await getModelFieldListApi(modelId.value);
    fields.value = modelFields.filter((item: any) => item.status !== false);
    loadLocalSchema();
    await preloadSchemaDictOptions();
    buildInitialValues();
  } finally {
    loading.value = false;
  }
}

function handleSubmit() {
  message.success('预览页仅用于展示维护表单，不执行真实保存。');
}

function handleReset() {
  buildInitialValues();
  message.success('表单已重置');
}

function renderPlaceholder(item: any) {
  return item.placeholder || `请输入${item.label}`;
}

onMounted(async () => {
  await loadPage();
});
</script>

<template>
  <Page
    auto-content-height
    content-class="flex flex-col"
    description="基于当前模型字段和显示配置生成的真实维护表单预览页。"
    title="预览"
  >
    <template #extra>
      <Space>
        <Button
          @click="
            router.push({
              name: 'MdmModelDefinitionManage',
              params: { id: modelId },
              query: { tab: 'display' },
            })
          "
        >
          返回设计
        </Button>
        <Button @click="handleReset">重置</Button>
        <Button type="primary" @click="handleSubmit">保存</Button>
      </Space>
    </template>

    <Spin :spinning="loading" class="min-h-0 flex-1">
      <Card class="h-full min-h-0" title="维护表单">
        <template v-if="visibleSections.length > 0">
          <div class="grid grid-cols-24 gap-4">
            <div
              v-for="section in visibleSections"
              :key="section.id"
              class="rounded-xl border border-gray-200 bg-white"
              :style="{
                gridColumn: `span ${Math.min(section.span || 24, 24)} / span ${Math.min(section.span || 24, 24)}`,
              }"
            >
              <Collapse
                v-if="section.collapsible"
                :active-key="section.defaultExpanded ? [section.id] : []"
                ghost
              >
                <Collapse.Panel :key="section.id" :header="section.title">
                  <div class="grid grid-cols-24 gap-4">
                    <div
                      v-for="item in section.items"
                      :key="item.id"
                      :style="{
                        gridColumn: `span ${Math.min(item.span, 24)} / span ${Math.min(item.span, 24)}`,
                      }"
                    >
                      <div
                        class="p-3"
                        :class="
                          item.labelLayout === 'horizontal'
                            ? 'grid grid-cols-[120px_minmax(0,1fr)] items-center gap-3'
                            : 'space-y-2'
                        "
                      >
                        <div
                          class="text-sm font-medium text-gray-700"
                          :class="
                            item.labelLayout === 'horizontal'
                              ? 'text-right'
                              : ''
                          "
                        >
                          {{ item.label }}
                          <span v-if="item.required" class="ml-1 text-red-500">*</span>
                        </div>
                        <div class="space-y-2 text-left">
                          <Input
                            v-if="item.component === 'Input'"
                            v-model:value="
                              formValues[item.fieldCode.toLowerCase()]
                            "
                            :placeholder="renderPlaceholder(item)"
                            :readonly="item.readonly"
                          />
                          <Input.TextArea
                            v-else-if="item.component === 'Textarea'"
                            v-model:value="
                              formValues[item.fieldCode.toLowerCase()]
                            "
                            :placeholder="renderPlaceholder(item)"
                            :readonly="item.readonly"
                            :rows="4"
                          />
                          <InputNumber
                            v-else-if="item.component === 'InputNumber'"
                            v-model:value="
                              formValues[item.fieldCode.toLowerCase()]
                            "
                            :disabled="item.readonly"
                            class="w-full"
                            :placeholder="renderPlaceholder(item)"
                          />
                          <DatePicker
                            v-else-if="item.component === 'DatePicker'"
                            v-model:value="
                              formValues[item.fieldCode.toLowerCase()]
                            "
                            :disabled="item.readonly"
                            class="w-full"
                          />
                          <Select
                            v-else-if="item.component === 'Dict'"
                            v-model:value="
                              formValues[item.fieldCode.toLowerCase()]
                            "
                            :disabled="item.readonly"
                            class="w-full"
                            :options="getDictOptionsByCode(item.dictCode)"
                            :placeholder="renderPlaceholder(item)"
                          />
                          <Switch
                            v-else-if="item.component === 'Switch'"
                            v-model:checked="
                              formValues[item.fieldCode.toLowerCase()]
                            "
                            :disabled="item.readonly"
                          />
                          <Upload
                            v-else-if="item.component === 'Attachment'"
                            :disabled="item.readonly"
                          >
                            <Button>上传附件</Button>
                          </Upload>
                          <Input
                            v-else
                            v-model:value="
                              formValues[item.fieldCode.toLowerCase()]
                            "
                            :placeholder="renderPlaceholder(item)"
                            :readonly="item.readonly"
                          />
                          <div v-if="item.help" class="text-xs text-gray-400">
                            {{ item.help }}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Collapse.Panel>
              </Collapse>

              <div v-else class="p-4">
                <div class="mb-4 text-base font-medium">
                  {{ section.title }}
                </div>
                <div class="grid grid-cols-24 gap-4">
                  <div
                    v-for="item in section.items"
                    :key="item.id"
                    :style="{
                      gridColumn: `span ${Math.min(item.span, 24)} / span ${Math.min(item.span, 24)}`,
                    }"
                  >
                    <div
                      class="p-3"
                      :class="
                        item.labelLayout === 'horizontal'
                          ? 'grid grid-cols-[120px_minmax(0,1fr)] items-center gap-3'
                          : 'space-y-2'
                      "
                    >
                      <div
                        class="text-sm font-medium text-gray-700"
                        :class="
                          item.labelLayout === 'horizontal' ? 'text-right' : ''
                        "
                      >
                        {{ item.label }}
                        <span v-if="item.required" class="ml-1 text-red-500">*</span>
                      </div>
                      <div class="space-y-2 text-left">
                        <Input
                          v-if="item.component === 'Input'"
                          v-model:value="
                            formValues[item.fieldCode.toLowerCase()]
                          "
                          :placeholder="renderPlaceholder(item)"
                          :readonly="item.readonly"
                        />
                        <Input.TextArea
                          v-else-if="item.component === 'Textarea'"
                          v-model:value="
                            formValues[item.fieldCode.toLowerCase()]
                          "
                          :placeholder="renderPlaceholder(item)"
                          :readonly="item.readonly"
                          :rows="4"
                        />
                        <InputNumber
                          v-else-if="item.component === 'InputNumber'"
                          v-model:value="
                            formValues[item.fieldCode.toLowerCase()]
                          "
                          :disabled="item.readonly"
                          class="w-full"
                          :placeholder="renderPlaceholder(item)"
                        />
                        <DatePicker
                          v-else-if="item.component === 'DatePicker'"
                          v-model:value="
                            formValues[item.fieldCode.toLowerCase()]
                          "
                          :disabled="item.readonly"
                          class="w-full"
                        />
                        <Select
                          v-else-if="item.component === 'Dict'"
                          v-model:value="
                            formValues[item.fieldCode.toLowerCase()]
                          "
                          :disabled="item.readonly"
                          class="w-full"
                          :options="getDictOptionsByCode(item.dictCode)"
                          :placeholder="renderPlaceholder(item)"
                        />
                        <Switch
                          v-else-if="item.component === 'Switch'"
                          v-model:checked="
                            formValues[item.fieldCode.toLowerCase()]
                          "
                          :disabled="item.readonly"
                        />
                        <Upload
                          v-else-if="item.component === 'Attachment'"
                          :disabled="item.readonly"
                        >
                          <Button>上传附件</Button>
                        </Upload>
                        <Input
                          v-else
                          v-model:value="
                            formValues[item.fieldCode.toLowerCase()]
                          "
                          :placeholder="renderPlaceholder(item)"
                          :readonly="item.readonly"
                        />
                        <div v-if="item.help" class="text-xs text-gray-400">
                          {{ item.help }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <Empty v-else description="当前模型还没有可预览的表单设计" />
      </Card>
    </Spin>
  </Page>
</template>
