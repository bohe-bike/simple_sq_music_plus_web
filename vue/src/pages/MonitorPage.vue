<template>
  <section class="page-wrap">
    <div class="header">
      <h2 class="page-title">监听下载</h2>
      <el-button type="primary" @click="openAddDialog">新增监听</el-button>
    </div>

    <el-alert
      type="info"
      show-icon
      :closable="false"
      title="监听下载说明：新增后系统会按监听目标自动扫描并入队下载。"
      class="desc"
    />

    <el-table :data="list" v-loading="loading" stripe empty-text="暂无监听任务">
      <el-table-column prop="targetName" label="名称" min-width="180" show-overflow-tooltip />
      <el-table-column prop="plugName" label="来源" width="100" />
      <el-table-column prop="type" label="类型" width="110" />
      <el-table-column prop="targetCount" label="数量" width="90" />
      <el-table-column prop="targetUrl" label="链接" min-width="230" show-overflow-tooltip />
      <el-table-column prop="targetDesc" label="描述" min-width="160" show-overflow-tooltip />
      <el-table-column prop="updateTime" label="更新时间" width="180" />
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="scope">
          <el-button text type="danger" @click="remove(scope.row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" title="新增监听" width="680px">
      <el-input
        v-model="targetUrl"
        placeholder="输入歌单/专辑 URL"
        clearable
        size="large"
        @keyup.enter="parseByUrl"
      />

      <el-alert
        class="dialog-tip"
        type="info"
        show-icon
        :closable="false"
        title="只需输入链接。系统会自动识别来源、ID、类型后保存。"
      />

      <el-descriptions v-if="parsedInfo" :column="2" border class="preview">
        <el-descriptions-item label="名称">{{ parsedInfo.targetName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="来源">{{ parsedInfo.plugName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ parsedInfo.type || '-' }}</el-descriptions-item>
        <el-descriptions-item label="数量">{{ parsedInfo.targetCount || '-' }}</el-descriptions-item>
        <el-descriptions-item label="链接" :span="2">{{ parsedInfo.targetUrl || targetUrl }}</el-descriptions-item>
      </el-descriptions>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button :loading="parsing" @click="parseByUrl">解析信息</el-button>
        <el-button type="primary" :loading="saving" :disabled="!targetUrl.trim()" @click="save">保存监听</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { api } from '../api/modules'

const loading = ref(false)
const parsing = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const list = ref<Array<Record<string, any>>>([])
const targetUrl = ref('')
const parsedInfo = ref<Record<string, any> | null>(null)

const fetchList = async () => {
  loading.value = true
  try {
    const res = await api.monitorList()
    list.value = (res.data || []) as Array<Record<string, any>>
  } finally {
    loading.value = false
  }
}

const openAddDialog = () => {
  targetUrl.value = ''
  parsedInfo.value = null
  dialogVisible.value = true
}

const parseByUrl = async () => {
  if (!targetUrl.value.trim()) {
    ElMessage.warning('请先输入 URL')
    return
  }
  parsing.value = true
  try {
    const res = await api.parserUrlInfo({ url: targetUrl.value.trim() })
    parsedInfo.value = (res.data || {}) as Record<string, any>
    ElMessage.success('已自动识别链接信息')
  } finally {
    parsing.value = false
  }
}

const save = async () => {
  if (!targetUrl.value.trim()) {
    ElMessage.warning('请先输入 URL')
    return
  }
  saving.value = true
  try {
    if (!parsedInfo.value) {
      await parseByUrl()
    }

    const payload = {
      ...(parsedInfo.value || {}),
      targetUrl: (parsedInfo.value?.targetUrl as string) || targetUrl.value.trim(),
      enabled: 'true',
    }

    if (!payload.plugName || !payload.targetId) {
      ElMessage.warning('该链接暂未识别到可监听目标，请更换链接后重试')
      return
    }

    await api.monitorAdd(payload)
    ElMessage.success('监听已创建')
    dialogVisible.value = false
    fetchList()
  } finally {
    saving.value = false
  }
}

const remove = async (id: number) => {
  await api.monitorDelete({ id })
  ElMessage.success('已删除')
  fetchList()
}

fetchList()
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.desc {
  margin-bottom: 12px;
}

.dialog-tip {
  margin-top: 12px;
}

.preview {
  margin-top: 12px;
}
</style>
