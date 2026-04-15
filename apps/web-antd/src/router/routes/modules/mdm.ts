import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:layout-dashboard',
      order: 10,
      title: '\u4EEA\u8868\u76D8',
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
          title: '\u6982\u89C8',
        },
      },
    ],
  },
  {
    meta: {
      icon: 'lucide:database',
      order: 100,
      title: '\u6A21\u578B\u4E2D\u5FC3',
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
          title: '\u6A21\u578B\u4E3B\u9898',
        },
      },
      {
        name: 'MdmModelDefinition',
        path: 'definition',
        component: () => import('#/views/mdm/model/definition/index.vue'),
        meta: {
          keepAlive: true,
          title: '\u6A21\u578B\u5B9A\u4E49',
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
          title: '\u6A21\u578B\u8BBE\u8BA1',
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
          title: '\u6A21\u578B\u9884\u89C8',
        },
      },
      {
        name: 'MdmModelVersion',
        path: 'version',
        component: () => import('#/views/mdm/model/version/index.vue'),
        meta: {
          keepAlive: true,
          title: '\u6A21\u578B\u7248\u672C',
        },
      },
      {
        name: 'MdmModelRelationship',
        path: 'relationship',
        component: () => import('#/views/mdm/model/relationship/index.vue'),
        meta: {
          keepAlive: true,
          title: '\u6A21\u578B\u5173\u7CFB',
        },
      },
      {
        name: 'MdmModelRule',
        path: 'rule',
        component: () => import('#/views/mdm/model/rule/index.vue'),
        meta: {
          keepAlive: true,
          title: '\u6821\u9A8C\u89C4\u5219',
        },
      },
      {
        name: 'MdmModelNumbering',
        path: 'numbering',
        component: () => import('#/views/mdm/model/numbering/index-v2.vue'),
        meta: {
          keepAlive: true,
          title: '\u7F16\u7801\u8BBE\u8BA1',
        },
      },
      {
        name: 'MdmModelDict',
        path: 'dict',
        component: () => import('#/views/mdm/model/dict/index.vue'),
        meta: {
          keepAlive: true,
          title: '\u6A21\u578B\u5B57\u5178',
        },
      },
      {
        name: 'MdmModelDataPermission',
        path: 'permission',
        component: () => import('#/views/mdm/model/permission/index.vue'),
        meta: {
          keepAlive: true,
          title: '\u6570\u636E\u6743\u9650',
        },
      },
    ],
  },
  {
    meta: {
      icon: 'lucide:layers',
      order: 110,
      title: '\u4E3B\u6570\u636E\u4E2D\u5FC3',
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
          title: '\u4E3B\u6570\u636E\u5BA1\u6838',
        },
      },
      {
        name: 'MdmDataHistory',
        path: 'history/:definitionId/:recordId',
        component: () => import('#/views/mdm/data/history/index.vue'),
        meta: {
          hideInMenu: true,
          keepAlive: true,
          title: '\u4E3B\u6570\u636E\u5386\u53F2\u7248\u672C',
        },
      },
    ],
  },
  {
    meta: {
      icon: 'lucide:shuffle',
      order: 120,
      title: '\u4E3B\u6570\u636E\u96C6\u6210',
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
          title: '\u6570\u636E\u91C7\u96C6',
        },
      },
      {
        name: 'MdmIntegrationDistribution',
        path: 'distribution',
        redirect: '/mdm/integration/distribution/targets',
        meta: {
          hideInMenu: true,
          keepAlive: true,
          title: '\u6570\u636E\u5206\u53D1',
        },
      },
      {
        name: 'MdmIntegrationDistributionTargets',
        path: 'distribution/targets',
        component: () =>
          import('#/views/mdm/integration/distribution/index.vue'),
        meta: {
          keepAlive: true,
          title: '\u5206\u53D1\u76EE\u6807',
        },
      },
      {
        name: 'MdmIntegrationDistributionSchemes',
        path: 'distribution/schemes',
        component: () =>
          import('#/views/mdm/integration/distribution/index.vue'),
        meta: {
          keepAlive: true,
          title: '\u5206\u53D1\u65B9\u6848',
        },
      },
      {
        name: 'MdmIntegrationDistributionTasks',
        path: 'distribution/tasks',
        component: () =>
          import('#/views/mdm/integration/distribution/index.vue'),
        meta: {
          keepAlive: true,
          title: '\u5206\u53D1\u4EFB\u52A1',
        },
      },
      {
        name: 'MdmIntegrationDistributionLogs',
        path: 'distribution/logs',
        component: () =>
          import('#/views/mdm/integration/distribution/index.vue'),
        meta: {
          keepAlive: true,
          title: '\u6267\u884C\u65E5\u5FD7',
        },
      },
      {
        name: 'MdmIntegrationLogNotification',
        path: 'log-notification',
        component: () =>
          import('#/views/mdm/integration/log-notification/index.vue'),
        meta: {
          keepAlive: true,
          title: '\u65E5\u5FD7\u63D0\u9192\u914D\u7F6E',
        },
      },
    ],
  },
  {
    meta: {
      icon: 'lucide:settings-2',
      order: 130,
      title: '\u7CFB\u7EDF\u7BA1\u7406',
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
          title: '\u7528\u6237\u7BA1\u7406',
        },
      },
      {
        name: 'MdmSystemRole',
        path: 'role',
        component: () => import('#/views/mdm/system/role/index.vue'),
        meta: {
          keepAlive: true,
          title: '\u89D2\u8272\u7BA1\u7406',
        },
      },
      {
        name: 'MdmSystemUserGroup',
        path: 'user-group',
        component: () => import('#/views/mdm/system/user-group/index.vue'),
        meta: {
          keepAlive: true,
          title: '\u7528\u6237\u7EC4\u7BA1\u7406',
        },
      },
      {
        name: 'MdmSystemMenu',
        path: 'menu',
        component: () => import('#/views/mdm/system/menu/index.vue'),
        meta: {
          keepAlive: true,
          title: '\u83DC\u5355\u7BA1\u7406',
        },
      },
    ],
  },
];

export default routes;
