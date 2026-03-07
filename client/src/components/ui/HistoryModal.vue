<script setup lang="ts">
import type { BubbleListProps } from 'vue-element-plus-x/types/BubbleList'
import type { MessageType } from '../../types/global'
import { ElMessage } from 'element-plus'
import { aiConfig, baseConfig, userConfig } from '../../lib/config'

const show = ref(false)

const conversations = ref<any[]>([])

function openModal() {
  show.value = true
}

function closeModal() {
  show.value = false
}

defineExpose({
  openModal,
  closeModal,
})

async function getHistoryConversation() {
  try {
    conversations.value = await fetch('/api/history', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(res => res.json())
      .then(data => data.data || [])
  }
  catch (error) {
    console.error(error)
    ElMessage.error('数据获取失败，请稍后再试')
  }
}

const hasConversation = computed(() => conversations.value.length > 0)

const messages = computed<BubbleListProps<MessageType>['list']>(() => conversations.value.map((item: any, index: number) => ({
  ...baseConfig,
  ...(item.role === 'assistant' ? aiConfig : userConfig),
  key: index + 1,
  content: item.content,
})))

watch(show, (value) => {
  if (value) {
    getHistoryConversation()
  }
})
</script>

<template>
  <el-dialog
    v-model="show"
    title="对话历史记录"
    width="500"
    :before-close="closeModal"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <div class="max-h-130 overflow-auto px2 py4">
      <BubbleList v-if="hasConversation" :list="messages" />
      <div v-else>
        <el-empty description="暂无数据" />
      </div>
    </div>
    <template #footer>
      <div class="text-center">
        <el-button @click="closeModal">
          关闭
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped></style>
