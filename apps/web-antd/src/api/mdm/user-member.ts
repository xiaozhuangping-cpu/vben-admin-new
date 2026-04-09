import { getUserListApi } from './user';

export interface AssignableUser {
  id: string;
  label: string;
  nickname?: string;
  username?: string;
}

export async function getAssignableUserListApi(): Promise<AssignableUser[]> {
  const { items } = await getUserListApi({ pageSize: 1000 });
  return items.map((user: any) => ({
    id: String(user.id),
    label: `${user.nickname} (${user.username})`,
    nickname: user.nickname,
    username: user.username,
  }));
}
