import type { MessageConfig } from '../types/global'

export const baseConfig: Partial<MessageConfig> = {
  avatarSize: '24px',
  avatarGap: '10px',
  shape: 'corner',
}

export const aiConfig: MessageConfig = {
  role: 'ai',
  avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
  placement: 'start',
  variant: 'filled',
}

export const userConfig: MessageConfig = {
  role: 'user',
  avatar: 'https://avatars.githubusercontent.com/u/76239030?v=4',
  placement: 'end',
  variant: 'outlined',
}
