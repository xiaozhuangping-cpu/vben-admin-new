import type { RouteRecordRaw } from 'vue-router';
import { BasicLayout } from '#/layouts';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:layout-dashboard',
      order: 10,
      title: '仪表盘',
    },
    component: BasicLayout,
    name: 'Dashboard',
    path: '/dashboard',
    redirect: '/dashboard/overview',
    children: [
      {
        name: 'MdmModelOverview',
        path: 'overview',
        component: () => import('#/views/mdm/overview/index.vue'),
        meta: {
          icon: 'lucide:cpu',
          title: '概览',
        },
      },
    ],
  },
  {
    meta: {
      icon: 'lucide:database',
      order: 100,
      title: '数据资产建模',
    },
    component: BasicLayout,
    name: 'MdmModel',
    path: '/mdm/model',
    redirect: '/mdm/model/theme',
    children: [
      {
        name: 'MdmModelTheme',
        path: 'theme',
        component: () => import('#/views/mdm/model/theme/index.vue'),
        meta: {
          title: '数据主题',
        },
      },
      {
        name: 'MdmModelDefinition',
        path: 'definition',
        component: () => import('#/views/mdm/model/definition/index.vue'),
        meta: {
          title: '数据模型',
        },
      },
      {
        name: 'MdmModelVersion',
        path: 'version',
        component: () => import('#/views/mdm/model/version/index.vue'),
        meta: {
          title: '模型版本',
        },
      },
      {
        name: 'MdmModelField',
        path: 'field',
        component: () => import('#/views/mdm/model/field/index.vue'),
        meta: {
          title: '字段配置',
        },
      },
      {
        name: 'MdmModelRelationship',
        path: 'relationship',
        component: () => import('#/views/mdm/model/relationship/index.vue'),
        meta: {
          title: '模型关系',
        },
      },
      {
        name: 'MdmModelRule',
        path: 'rule',
        component: () => import('#/views/mdm/model/rule/index.vue'),
        meta: {
          title: '校验规则',
        },
      },
      {
        name: 'MdmModelNumbering',
        path: 'numbering',
        component: () => import('#/views/mdm/model/numbering/index.vue'),
        meta: {
          title: '编码管理',
        },
      },
      {
        name: 'MdmModelDict',
        path: 'dict',
        component: () => import('#/views/mdm/model/dict/index.vue'),
        meta: {
          title: '数据字典',
        },
      },
      {
        name: 'MdmModelDataPermission',
        path: 'permission',
        component: () => import('#/views/mdm/model/permission/index.vue'),
        meta: {
          title: '数据权限',
        },
      },
    ],
  },
  {
    meta: {
      icon: 'lucide:layers',
      order: 110,
      title: '主数据管理',
    },
    component: BasicLayout,
    name: 'MdmData',
    path: '/mdm/data',
    redirect: '/mdm/data/maintenance',
    children: [
      {
        name: 'MdmDataMaintenance',
        path: 'maintenance',
        component: () => import('#/views/mdm/data/maintenance/index.vue'),
        meta: {
          title: '数据维护',
        },
      },
      {
        name: 'MdmDataAudit',
        path: 'audit',
        component: () => import('#/views/mdm/data/audit/index.vue'),
        meta: {
          title: '数据审核',
        },
      },
    ],
  },
  {
    meta: {
      icon: 'lucide:shuffle',
      order: 120,
      title: '主数据集成',
    },
    component: BasicLayout,
    name: 'MdmIntegration',
    path: '/mdm/integration',
    redirect: '/mdm/integration/collection',
    children: [
      {
        name: 'MdmIntegrationCollection',
        path: 'collection',
        component: () => import('#/views/mdm/integration/collection/index.vue'),
        meta: {
          title: '数据归集',
        },
      },
      {
        name: 'MdmIntegrationDistribution',
        path: 'distribution',
        component: () =>
          import('#/views/mdm/integration/distribution/index.vue'),
        meta: {
          title: '数据分发',
        },
      },
    ],
  },
  {
    meta: {
      icon: 'lucide:settings-2',
      order: 130,
      title: '系统管理',
    },
    component: BasicLayout,
    name: 'MdmSystem',
    path: '/mdm/system',
    redirect: '/mdm/system/user',
    children: [
      {
        name: 'MdmSystemUser',
        path: 'user',
        component: () => import('#/views/mdm/system/user/index.vue'),
        meta: {
          title: '人员账号',
        },
      },
      {
        name: 'MdmSystemRole',
        path: 'role',
        component: () => import('#/views/mdm/system/role/index.vue'),
        meta: {
          title: '角色管理',
        },
      },
      {
        name: 'MdmSystemPermission',
        path: 'permission',
        component: () => import('#/views/mdm/system/permission/index.vue'),
        meta: {
          title: '权限配置',
        },
      },
      {
        name: 'MdmSystemMenu',
        path: 'menu',
        component: () => import('#/views/mdm/system/menu/index.vue'),
        meta: {
          title: '菜单管理',
        },
      },
    ],
  },
];

export default routes;
