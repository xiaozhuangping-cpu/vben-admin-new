import type { RouteRecordRaw } from 'vue-router';

import { getModelDefinitionListApi } from '#/api/mdm/model-definition';

export interface MasterDataRecord {
  createBy: string;
  createTime: string;
  entityCode: string;
  entityName: string;
  id: string;
  status: 'invalid' | 'normal' | 'pending';
  version: string;
  [key: string]: any;
}

export interface MasterDataItem {
  description: string;
  definitionId?: string;
  dynamic?: boolean;
  path: string;
  permissionCode: string;
  records: MasterDataRecord[];
  routeName: string;
  tableName?: string;
  theme: string;
  title: string;
}

function createRecord(
  id: string,
  entityCode: string,
  entityName: string,
  createBy: string,
  createTime: string,
  status: MasterDataRecord['status'] = 'normal',
  version = 'v1.0.0',
  extra: Partial<MasterDataRecord> = {},
): MasterDataRecord {
  return {
    createBy,
    createTime,
    entityCode,
    entityName,
    id,
    status,
    version,
    ...extra,
  };
}

const MASTER_DATA_BASE_PATH = '/mdm/data';

export const MASTER_DATA_ITEMS: MasterDataItem[] = [
  {
    routeName: 'MdmDataEcommercePlatform',
    title: '电商平台',
    theme: '营销类主数据',
    path: `${MASTER_DATA_BASE_PATH}/ecommerce-platform`,
    permissionCode: 'mdm:data:ecommerce-platform',
    description:
      '维护电商平台档案，统一平台编码、经营属性与启停状态，支撑营销渠道标准化管理。',
    records: [
      createRecord(
        'platform-1',
        'PLT-AMZ-US',
        'Amazon US',
        '营销运营',
        '2024-04-01 09:00:00',
      ),
      createRecord(
        'platform-2',
        'PLT-TK-GLOBAL',
        'TikTok Shop Global',
        '渠道经理',
        '2024-04-02 11:20:00',
        'pending',
        'v1.1.0',
      ),
    ],
  },
  {
    routeName: 'MdmDataStore',
    title: '店铺',
    theme: '营销类主数据',
    path: `${MASTER_DATA_BASE_PATH}/store`,
    permissionCode: 'mdm:data:store',
    description:
      '维护电商店铺主档，统一店铺归属平台、经营主体与运营状态，支撑渠道履约与经营分析。',
    records: [
      createRecord(
        'store-1',
        'SHOP-AMZ-US-001',
        'Amazon美国旗舰店',
        '店铺运营',
        '2024-04-01 10:15:00',
        'normal',
        'v1.0.0',
        {
          addressArea: '广东省深圳市宝安区',
          addressDetail: '西乡街道星河智善大厦 808',
          authCode: 'AUTH_8X29K',
          authExpiry: '2025-04-01 10:00:00',
          authToken: 'TOK_AMZ_U3891X',
          channelType: 'B2C',
          contact: '林语堂',
          externalCode: 'E-AMZ-00129',
          merchantId: 'M_AMZ_8821',
          mobile: '13800138000',
          orgStructure: '营销中心 / 美加运营部',
          phone: '0755-23118888',
          platform: 'Amazon',
        },
      ),
      createRecord(
        'store-2',
        'SHOP-TK-SEA-002',
        'TikTok东南亚直播店',
        '渠道经理',
        '2024-04-03 14:30:00',
        'pending',
        'v1.1.0',
        {
          addressArea: '上海市浦东新区',
          addressDetail: '张江高科技园区 125 号',
          authCode: 'AUTH_9Y33M',
          authExpiry: '2024-12-31 23:59:59',
          authToken: 'TOK_TK_S9910W',
          channelType: '直播电商',
          contact: '陈明明',
          externalCode: 'E-TK-SEA-056',
          merchantId: 'M_TK_7712',
          mobile: '13900139000',
          orgStructure: '营销中心 / 东南亚组',
          phone: '021-50889999',
          platform: 'TikTok Shop',
        },
      ),
    ],
  },
  {
    routeName: 'MdmDataSupplier',
    title: '供应商',
    theme: '供应链主数据',
    path: `${MASTER_DATA_BASE_PATH}/supplier`,
    permissionCode: 'mdm:data:supplier',
    description:
      '维护供应商主档，统一供应商编码、结算条件与合作状态，支撑采购与对账协同。',
    records: [
      createRecord(
        'supplier-1',
        'SUP-SZ-001',
        '深圳星河包装有限公司',
        '采购专员',
        '2024-04-02 09:45:00',
      ),
      createRecord(
        'supplier-2',
        'SUP-GZ-002',
        '广州迅达电子科技有限公司',
        '采购经理',
        '2024-04-04 16:10:00',
        'normal',
        'v1.2.0',
      ),
    ],
  },
  {
    routeName: 'MdmDataCompany',
    title: '公司主体',
    theme: '供应链主数据',
    path: `${MASTER_DATA_BASE_PATH}/company`,
    permissionCode: 'mdm:data:company',
    description:
      '维护公司主体主档，统一法人与结算主体信息，支撑合同、采购、报关及税务协同。',
    records: [
      createRecord(
        'company-1',
        'ORG-SZ-001',
        '深圳奥优乐科技有限公司',
        '法务专员',
        '2024-04-01 13:30:00',
      ),
      createRecord(
        'company-2',
        'ORG-HK-002',
        'AOYOLO HK LIMITED',
        '财务经理',
        '2024-04-05 09:20:00',
        'pending',
      ),
    ],
  },
  {
    routeName: 'MdmDataCurrency',
    title: '币种',
    theme: '财务类主数据',
    path: `${MASTER_DATA_BASE_PATH}/currency`,
    permissionCode: 'mdm:data:currency',
    description:
      '维护币种主档，统一币种编码、精度与启用状态，支撑跨平台订单与财务核算。',
    records: [
      createRecord(
        'currency-1',
        'CUR-USD',
        '美元',
        '财务专员',
        '2024-04-01 08:20:00',
      ),
      createRecord(
        'currency-2',
        'CUR-EUR',
        '欧元',
        '财务专员',
        '2024-04-01 08:30:00',
      ),
    ],
  },
  {
    routeName: 'MdmDataExchangeRate',
    title: '汇率',
    theme: '财务类主数据',
    path: `${MASTER_DATA_BASE_PATH}/exchange-rate`,
    permissionCode: 'mdm:data:exchange-rate',
    description:
      '维护汇率主档，统一币种对、汇率类型与生效日期，支撑结算、对账与财务换算。',
    records: [
      createRecord(
        'rate-1',
        'FX-USD-CNY',
        '美元兑人民币',
        '财务主管',
        '2024-04-03 09:00:00',
        'normal',
        '2024.04',
      ),
      createRecord(
        'rate-2',
        'FX-EUR-CNY',
        '欧元兑人民币',
        '财务主管',
        '2024-04-03 09:05:00',
        'normal',
        '2024.04',
      ),
    ],
  },
  {
    routeName: 'MdmDataExpenseItem',
    title: '费用项目',
    theme: '财务类主数据',
    path: `${MASTER_DATA_BASE_PATH}/expense-item`,
    permissionCode: 'mdm:data:expense-item',
    description:
      '维护费用项目主档，统一费用分类、归集维度与核算口径，支撑费用分析与预算管理。',
    records: [
      createRecord(
        'expense-1',
        'FEE-PLATFORM',
        '平台佣金',
        '财务专员',
        '2024-04-02 10:10:00',
      ),
      createRecord(
        'expense-2',
        'FEE-WAREHOUSE',
        '仓储服务费',
        '成本会计',
        '2024-04-04 15:40:00',
        'pending',
      ),
    ],
  },
  {
    routeName: 'MdmDataPaymentChannel',
    title: '支付渠道',
    theme: '财务类主数据',
    path: `${MASTER_DATA_BASE_PATH}/payment-channel`,
    permissionCode: 'mdm:data:payment-channel',
    description:
      '维护支付渠道主档，统一渠道属性、手续费规则与适用平台，支撑收款与资金对账。',
    records: [
      createRecord(
        'payment-1',
        'PAY-PAYPAL',
        'PayPal',
        '资金专员',
        '2024-04-02 11:00:00',
      ),
      createRecord(
        'payment-2',
        'PAY-STRIPE',
        'Stripe',
        '资金专员',
        '2024-04-02 11:10:00',
      ),
    ],
  },
  {
    routeName: 'MdmDataOrganization',
    title: '组织架构',
    theme: '行政类主数据',
    path: `${MASTER_DATA_BASE_PATH}/organization`,
    permissionCode: 'mdm:data:organization',
    description:
      '维护组织机构主档，统一组织层级、部门归属与负责人信息，支撑权限、流程与人效分析。',
    records: [
      createRecord(
        'org-1',
        'DEPT-HQ-001',
        '总经办',
        '人事主管',
        '2024-04-01 09:10:00',
      ),
      createRecord(
        'org-2',
        'DEPT-SCM-002',
        '供应链中心',
        '人事主管',
        '2024-04-01 09:20:00',
      ),
    ],
  },
  {
    routeName: 'MdmDataEmployee',
    title: '员工',
    theme: '行政类主数据',
    path: `${MASTER_DATA_BASE_PATH}/employee`,
    permissionCode: 'mdm:data:employee',
    description:
      '维护员工主档，统一员工编码、任职信息与在职状态，支撑组织协同、权限控制与绩效管理。',
    records: [
      createRecord(
        'employee-1',
        'EMP-0001',
        '张晨',
        'HRBP',
        '2024-04-02 08:45:00',
      ),
      createRecord(
        'employee-2',
        'EMP-0002',
        '李雯',
        'HRBP',
        '2024-04-02 08:50:00',
        'pending',
      ),
    ],
  },
  {
    routeName: 'MdmDataAccount',
    title: '账号',
    theme: '行政类主数据',
    path: `${MASTER_DATA_BASE_PATH}/account`,
    permissionCode: 'mdm:data:account',
    description:
      '维护账号主档，统一系统账号、人员绑定与启停状态，支撑身份认证与职责隔离管理。',
    records: [
      createRecord(
        'account-1',
        'ACC-FIN-001',
        'finance.admin',
        '系统管理员',
        '2024-04-03 10:30:00',
      ),
      createRecord(
        'account-2',
        'ACC-OPS-002',
        'ops.manager',
        '系统管理员',
        '2024-04-03 10:35:00',
        'invalid',
      ),
    ],
  },
  {
    routeName: 'MdmDataCountry',
    title: '国家',
    theme: '通用类主数据',
    path: `${MASTER_DATA_BASE_PATH}/country`,
    permissionCode: 'mdm:data:country',
    description:
      '维护国家主档，统一国家编码、国际区号与启用范围，支撑地址、物流与合规场景。',
    records: [
      createRecord(
        'country-1',
        'COUNTRY-CN',
        '中国',
        '基础资料专员',
        '2024-04-01 07:50:00',
      ),
      createRecord(
        'country-2',
        'COUNTRY-US',
        '美国',
        '基础资料专员',
        '2024-04-01 07:55:00',
      ),
    ],
  },
  {
    routeName: 'MdmDataRegion',
    title: '地区',
    theme: '通用类主数据',
    path: `${MASTER_DATA_BASE_PATH}/region`,
    permissionCode: 'mdm:data:region',
    description:
      '维护地区主档，统一行政区划、仓配区域与服务范围，支撑地址标准化与履约网络规划。',
    records: [
      createRecord(
        'region-1',
        'REG-CN-EAST',
        '华东地区',
        '基础资料专员',
        '2024-04-01 08:10:00',
      ),
      createRecord(
        'region-2',
        'REG-US-WEST',
        '美国西部',
        '基础资料专员',
        '2024-04-01 08:15:00',
      ),
    ],
  },
  {
    routeName: 'MdmDataWarehouse',
    title: '仓库',
    theme: '通用类主数据',
    path: `${MASTER_DATA_BASE_PATH}/warehouse`,
    permissionCode: 'mdm:data:warehouse',
    description:
      '维护仓库主档，统一仓库编码、仓型属性与覆盖区域，支撑库存履约、调拨与仓网分析。',
    records: [
      createRecord(
        'warehouse-1',
        'WH-SZ-001',
        '深圳宝安中心仓',
        '仓储经理',
        '2024-04-02 13:20:00',
      ),
      createRecord(
        'warehouse-2',
        'WH-LA-002',
        '洛杉矶海外仓',
        '仓储经理',
        '2024-04-02 13:30:00',
        'pending',
      ),
    ],
  },
  {
    routeName: 'MdmDataLogisticsChannel',
    title: '物流渠道',
    theme: '通用类主数据',
    path: `${MASTER_DATA_BASE_PATH}/logistics-channel`,
    permissionCode: 'mdm:data:logistics-channel',
    description:
      '维护物流渠道主档，统一渠道服务商、时效属性与适用区域，支撑订单履约与运费测算。',
    records: [
      createRecord(
        'logistics-1',
        'LOG-DHL-EXP',
        'DHL Express',
        '物流专员',
        '2024-04-04 09:40:00',
      ),
      createRecord(
        'logistics-2',
        'LOG-UPS-GROUND',
        'UPS Ground',
        '物流专员',
        '2024-04-04 09:50:00',
      ),
    ],
  },
];

let dynamicMasterDataItems: MasterDataItem[] = [];
let dynamicMasterDataLoaded = false;

function toPascalCase(value: string) {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join('');
}

function toKebabCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export async function loadDynamicMasterDataItems(force = false) {
  if (dynamicMasterDataLoaded && !force) {
    return dynamicMasterDataItems;
  }

  const { items } = await getModelDefinitionListApi({
    pageSize: 1000,
    status: 'eq.published',
  });

  dynamicMasterDataItems = items
    .filter((item: any) => item.tableName)
    .map((item: any) => {
      const slug = toKebabCase(item.code || item.name || item.id);
      return {
        definitionId: item.id,
        description:
          item.description ||
          `基于数据模型 ${item.name} 动态生成的主数据维护列表。`,
        dynamic: true,
        path: `${MASTER_DATA_BASE_PATH}/${slug}`,
        permissionCode: `mdm:data:model:${slug}`,
        records: [],
        routeName: `MdmDataDynamic${toPascalCase(item.code || item.id)}`,
        tableName: item.tableName,
        theme: item.themeName || '动态模型',
        title: item.name,
      } satisfies MasterDataItem;
    });

  dynamicMasterDataLoaded = true;
  return dynamicMasterDataItems;
}

export function getAllMasterDataItems() {
  return [...dynamicMasterDataItems];
}

export function getMasterDataItemByRouteName(routeName?: string) {
  return getAllMasterDataItems().find((item) => item.routeName === routeName);
}

export function getMasterDataSelectOptions() {
  return getAllMasterDataItems().map((item) => ({
    label: `${item.title} · ${item.theme}`,
    value: item.path,
  }));
}

export function getDynamicMasterDataChildrenRoutes(): RouteRecordRaw[] {
  return dynamicMasterDataItems.map((item) => ({
    component: () => import('#/views/mdm/data/maintenance/index.vue'),
    meta: {
      title: item.title,
    },
    name: item.routeName,
    path: item.path.replace('/mdm/data/', ''),
  }));
}

const defaultMasterDataItem = MASTER_DATA_ITEMS[0];

if (!defaultMasterDataItem) {
  throw new Error('MASTER_DATA_ITEMS must contain at least one item.');
}

export const DEFAULT_MASTER_DATA_ITEM = defaultMasterDataItem;

export const MASTER_DATA_ITEM_MAP = Object.fromEntries(
  MASTER_DATA_ITEMS.map((item) => [item.routeName, item]),
) as Record<string, MasterDataItem>;

export const MASTER_DATA_SELECT_OPTIONS = MASTER_DATA_ITEMS.map((item) => ({
  label: `${item.title} · ${item.theme}`,
  value: item.path,
}));
