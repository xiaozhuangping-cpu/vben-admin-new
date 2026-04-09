const SURNAMES = ['张', '王', '李', '赵', '钱', '孙', '周', '吴', '郑', '王'];
const NAMES = ['强', '伟', '芳', '娜', '敏', '静', '杰', '涛', '辉', '磊'];
const DEPARTMENTS = [
  'IoT 研发部',
  '硬件供应链',
  '智能算法组',
  '质量测试中心',
  '产品运营部',
];
const ROLE_TEMPLATES = [
  '系统管理员',
  '模型设计者',
  '数据审核员',
  '设备接入专家',
  '安全审计员',
];

export const MOCK_USERS = Array.from({ length: 30 }).map((_, index) => {
  const surname = SURNAMES[index % 10];
  const name = NAMES[(index * 3) % 10];
  const isFemale = index % 3 === 0;
  const nickname = `${surname}${name}${isFemale ? '女士' : '先生'}`;

  return {
    id: `${index + 1}`,
    username: `user_${1000 + index}`,
    nickname,
    org: DEPARTMENTS[index % 5],
    roles: [ROLE_TEMPLATES[index % 5]],
    status: index % 8 !== 0,
    lastLogin: `2024-04-${(index % 5) + 10} ${10 + (index % 5)}:30:15`,
  };
});

export const MOCK_USER_OPTIONS = MOCK_USERS.map((user) => ({
  label: `${user.nickname} (${user.username})`,
  value: user.id,
}));
