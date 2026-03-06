<script setup lang="ts">
import type { BubbleListItemProps, BubbleListProps } from 'vue-element-plus-x/types/BubbleList'
import { onMounted, ref } from 'vue'
import { useLoading } from './hooks'

interface MessageType extends BubbleListItemProps {
  key: number
  role: 'user' | 'ai'
}

type MessageConfig = Omit<MessageType, 'key' | 'content'>

const baseConfig: Partial<MessageConfig> = {
  avatarSize: '24px',
  avatarGap: '10px',
  shape: 'corner',
}

const aiConfig: MessageConfig = {
  role: 'ai',
  avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
  placement: 'start',
  variant: 'filled',
}

const userConfig: MessageConfig = {
  role: 'user',
  avatar: 'https://avatars.githubusercontent.com/u/76239030?v=4',
  placement: 'end',
  variant: 'outlined',
}

const [loading, setLoading] = useLoading()

const question = ref('')

const answer = ref('')

const messages = ref<BubbleListProps<MessageType>['list']>([])

async function handleSubmit() {
  messages.value?.push({
    ...baseConfig,
    ...userConfig,
    key: messages.value?.length + 1 || 1,
    content: question.value,
  })

  const _question = question.value
  question.value = ''

  try {
    setLoading(true)
    const raw = await fetch('/api/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: JSON.stringify(_question),
      }),
    })

    const reader = raw.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw new Error('No reader')
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter(line => line.trim())

      for (const line of lines) {
        try {
          const data = JSON.parse(line)
          if (data.response) {
            loading.value && setLoading(false)
          }
          answer.value += data.response
        }
        catch (error) {
          console.error('JSON 解析失败：', error)
        }
      }
    }

    messages.value?.push({
      ...baseConfig,
      ...aiConfig,
      key: messages.value?.length + 1 || 1,
      content: answer.value,
      typing: true,
    })
  }
  catch (error) {
    console.error(error)
    messages.value?.push({
      ...baseConfig,
      ...aiConfig,
      key: messages.value?.length + 1 || 1,
      content: '我好像出现了点问题，请稍后再试',
    })
  }
  finally {
    setLoading(false)
  }
}

onMounted(() => {
  messages.value = [
    {
      ...baseConfig,
      ...aiConfig,
      key: 1,
      content: '我是 AI 小助手，请问有什么可以帮到你的吗？',
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
      <BubbleList :list="messages" />
    </div>
    <div class="border-gray-300 border-t-dashed p4">
      <Sender
        v-model.trim="question"
        clearable
        :loading="loading"
        @submit="handleSubmit"
      />
    </div>
  </div>
</template>

<style scoped>

</style>
