<script setup lang="ts">
import type { BubbleListProps } from 'vue-element-plus-x/types/BubbleList'
import type { MessageType } from './types/global'
import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted, ref } from 'vue'
import { useLoading } from './hooks'
import { aiConfig, baseConfig, userConfig } from './lib/config'

const [loading, setLoading] = useLoading()

const historyModalRef = useTemplateRef('historyModal')

const question = ref('')

const answer = ref('')

const messages = ref<BubbleListProps<MessageType>['list']>([])

function initMessage() {
  messages.value = []
}

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
    answer.value = ''
    setLoading(false)
  }
}

function handleShowHistory() {
  historyModalRef.value?.openModal()
}

async function handleClearHistory() {
  try {
    await ElMessageBox.confirm('确定要清除历史会话吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    await fetch('/api/clear', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    initMessage()

    ElMessage.success('操作成功')
  }
  catch (error) {
    console.error(error)
    ElMessage.error('操作失败')
  }
}

onMounted(() => {
  initMessage()
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
      <el-space w-full direction="vertical" alignment="stretch">
        <div>
          <el-button type="primary" @click="handleShowHistory">
            查看历史会话
          </el-button>
          <el-button type="danger" @click="handleClearHistory">
            清除历史会话
          </el-button>
        </div>
        <Sender
          v-model.trim="question"
          clearable
          :loading="loading"
          @submit="handleSubmit"
        />
      </el-space>
    </div>
    <HistoryModal ref="historyModal" />
  </div>
</template>

<style scoped>

</style>
