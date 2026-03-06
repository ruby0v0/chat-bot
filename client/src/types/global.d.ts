import type { BubbleListItemProps } from 'vue-element-plus-x/types/BubbleList'

export interface MessageType extends BubbleListItemProps {
  key: number
  role: 'user' | 'ai'
}

export type MessageConfig = Omit<MessageType, 'key' | 'content'>
