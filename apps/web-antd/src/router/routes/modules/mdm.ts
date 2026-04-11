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
          affixTab: true,
          affixTabOrder: 1,
          icon: 'lucide:cpu',
          keepAlive: true,
          tabClosable: false,
          title: '概览',
        },
      },
    ],
  },
  {
    meta: {
      icon: 'lucide:database',
      order: 100,
      title: '模型中心',
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
          keepAlive: true,
          title: '模型主题',
        },
      },
      {
        name: 'MdmModelDefinition',
        path: 'definition',
        component: () => import('#/views/mdm/model/definition/index.vue'),
        meta: {
          keepAlive: true,
          title: '模型定义',
        },
      },
      {
        name: 'MdmModelDefinitionManage',
        path: 'definition/manage/:id',
        component: () =>
          import('#/views/mdm/model/definition/manage/index.vue'),
        meta: {
          hideInMenu: true,
          keepAlive: true,
          title: '模型设计',
        },
      },
      {
        name: 'MdmModelDefinitionPreview',
        path: 'definition/preview/:id',
        component: () =>
          import('#/views/mdm/model/definition/preview/index.vue'),
        meta: {
          hideInMenu: true,
          keepAlive: true,
          title: '模型预览',
        },
      },
      {
        name: 'MdmModelVersion',
        path: 'version',
        component: () => import('#/views/mdm/model/version/index.vue'),
        meta: {
          keepAlive: true,
          title: '模型版本',
        },
      },
      {
        name: 'MdmModelRelationship',
        path: 'relationship',
        component: () => import('#/views/mdm/model/relationship/index.vue'),
        meta: {
          keepAlive: true,
          title: '模型关系',
        },
      },
      {
        name: 'MdmModelRule',
        path: 'rule',
        component: () => import('#/views/mdm/model/rule/index.vue'),
        meta: {
          keepAlive: true,
          title: '校验规则',
        },
      },
      {
        name: 'MdmModelNumbering',
        path: 'numbering',
        component: () => import('#/views/mdm/model/numbering/index-v2.vue'),
        meta: {
          keepAlive: true,
          title: '编码设计',
        },
      },
      {
        name: 'MdmModelDict',
        path: 'dict',
        component: () => import('#/views/mdm/model/dict/index.vue'),
        meta: {
          keepAlive: true,
          title: '模型字典',
        },
      },
      {
        name: 'MdmModelDataPermission',
        path: 'permission',
        component: () => import('#/views/mdm/model/permission/index.vue'),
        meta: {
          keepAlive: true,
          title: '数据权限',
        },
      },
    ],
  },
  {
    meta: {
      icon: 'lucide:layers',
      order: 110,
      title: '主数据中心',
    },
    component: BasicLayout,
    name: 'MdmData',
    path: '/mdm/data',
    redirect: '/mdm/model/definition',
    children: [
      {
        name: 'MdmDataAudit',
        path: 'audit',
        component: () => import('#/views/mdm/data/audit/index.vue'),
        meta: {
          hideInMenu: true,
          keepAlive: true,
          title: '主数据审核',
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
          keepAlive: true,
          title: '数据采集',
        },
      },
      {
        name: 'MdmIntegrationDistribution',
        path: 'distribution',
        component: () =>
          import('#/views/mdm/integration/distribution/index.vue'),
        meta: {
          keepAlive: true,
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
          keepAlive: true,
          title: '用户管理',
        },
      },
      {
        name: 'MdmSystemRole',
        path: 'role',
        component: () => import('#/views/mdm/system/role/index.vue'),
        meta: {
          keepAlive: true,
          title: '角色管理',
        },
      },
      {
        name: 'MdmSystemPermission',
        path: 'permission',
        component: () => import('#/views/mdm/system/permission/index.vue'),
        meta: {
          keepAlive: true,
          title: '权限管理',
        },
      },
      {
        name: 'MdmSystemUserGroup',
        path: 'user-group',
        component: () => import('#/views/mdm/system/user-group/index.vue'),
        meta: {
          keepAlive: true,
          title: '用户组管理',
        },
      },
      {
        name: 'MdmSystemMenu',
        path: 'menu',
        component: () => import('#/views/mdm/system/menu/index.vue'),
        meta: {
          keepAlive: true,
          title: '菜单管理',
        },
      },
    ],
  },
];

export default routes;
