<script setup lang="ts">
import type { BubbleListItemProps, BubbleListProps } from 'vue-element-plus-x/types/BubbleList'
import { onMounted, ref } from 'vue'

interface ContextType extends BubbleListItemProps {
  key: number
  role: 'user' | 'ai'
}

const prompt = ref('')

const contexts = ref<BubbleListProps<ContextType>['list']>()

const ai = {
  avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
}

const user = {
  avatar: 'https://avatars.githubusercontent.com/u/76239030?v=4',
}

onMounted(() => {
  const config: Partial<ContextType> = {
    avatarSize: '24px',
    avatarGap: '10px',
    shape: 'corner',
  }

  contexts.value = [
    {
      ...config,
      key: 1,
      role: 'ai',
      content: '我是 AI 小助手，请问有什么可以帮到你的吗？',
      placement: 'start',
      avatar: ai.avatar,
      variant: 'filled',
    },
    {
      ...config,
      key: 2,
      role: 'user',
      content: '你好',
      placement: 'end',
      avatar: user.avatar,
      variant: 'outlined',
    },
    {
      ...config,
      key: 3,
      role: 'ai',
      content: '你好呀！',
      placement: 'start',
      avatar: ai.avatar,
      variant: 'filled',
      typing: true,
    },
  ]
})
</script>

<template>
  <div class="box-border h-full flex flex-col overflow-hidden">
    <div class="border-gray-300 border-b-dashed p4 font-bold" text="lg center">
      AI 小助手
    </div>
    <div class="flex-1 overflow-auto p4">
      <BubbleList :list="contexts" />
    </div>
    <div class="border-gray-300 border-t-dashed p4">
      <Sender v-model="prompt" />
    </div>
  </div>
</template>

<style scoped>
</style>
