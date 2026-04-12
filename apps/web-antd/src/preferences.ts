import { defineOverridesPreferences } from '@vben/preferences';

/**
 * @description 项目配置文件
 * 只需要覆盖项目中的一部分配置，不需要的配置不用覆盖，会自动使用默认配置
 * !!! 更改配置后请清空缓存，否则可能不生效
 */
export const overridesPreferences = defineOverridesPreferences({
  app: {
    accessMode: 'backend',
    defaultHomePath: '/dashboard/overview',
    name: 'JC-MDM | 主数据',
  },
  logo: {
    source: '/src/assets/logo-iot.png',
  },
  theme: {
    colorPrimary: '#06b6d4',
    radius: '10px',
  },
  sidebar: {
    width: 230,
  },
});
