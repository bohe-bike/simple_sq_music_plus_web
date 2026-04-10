<template>
  <section class="page-wrap">
    <div class="header">
      <h2 class="page-title">设置</h2>
      <el-space>
        <el-upload :show-file-list="false" :auto-upload="false" :on-change="onImportFile">
          <el-button>导入歌单数据</el-button>
        </el-upload>
        <el-button @click="load">刷新</el-button>
        <el-button type="danger" plain @click="logout">退出登录</el-button>
      </el-space>
    </div>

    <el-card shadow="never" class="token-card">
      <div class="token-head">登录信息</div>
      <div>username: {{ auth.username }}</div>
      <div class="token">token: {{ auth.token || '-' }}</div>
    </el-card>

    <el-card shadow="never" class="plugin-login-card">
      <template #header>插件登录</template>
      <el-tabs type="border-card">
        <el-tab-pane label="QQVIP 登录" :disabled="!qqvipEnabled">
          <div class="plugin-hint" v-if="!qqvipEnabled">未开启 qqvip 插件，请先在插件设置中启用。</div>
          <template v-else>
            <el-space wrap>
              <el-button @click="getQqQr">获取 QQ 二维码</el-button>
              <el-button @click="getQqWechatQr">获取微信二维码</el-button>
              <el-button type="primary" @click="checkQqQr">检查扫码状态</el-button>
              <el-button @click="refreshQqCookie">刷新登录 Cookie</el-button>
            </el-space>
            <div class="qr-wrap" v-if="qqQrImage">
              <el-image :src="qqQrImage" fit="contain" class="qr-image" />
            </div>
          </template>
        </el-tab-pane>

        <el-tab-pane label="酷狗登录" :disabled="!kgEnabled">
          <div class="plugin-hint" v-if="!kgEnabled">未开启 kg 插件，请先在插件设置中启用。</div>
          <template v-else>
            <el-space wrap>
              <el-button @click="getKgWxQr">获取微信二维码</el-button>
              <el-button type="primary" @click="checkKgWxQr">检查扫码状态</el-button>
              <el-button @click="refreshKgToken">刷新 Token</el-button>
              <el-button type="success" @click="kgSignIn">手动签到</el-button>
            </el-space>
            <div class="qr-wrap" v-if="kgQrImage">
              <el-image :src="kgQrImage" fit="contain" class="qr-image" />
            </div>
          </template>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-tabs type="border-card">
      <el-tab-pane label="系统设置">
        <el-table :data="systemRows" v-loading="loading" row-key="configKey" stripe>
          <el-table-column prop="configName" label="配置项" min-width="220" show-overflow-tooltip />
          <el-table-column label="当前值" min-width="260">
            <template #default="scope">
              <component
                :is="inputComponent(scope.row.configType)"
                v-model="scope.row._editing"
                :rows="scope.row.configType === 'input' ? 2 : undefined"
                :placeholder="scope.row.configRemark || '请输入值'"
                style="width: 100%"
              >
                <el-option
                  v-for="opt in parseOptions(scope.row.configOptions)"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </component>
            </template>
          </el-table-column>
          <el-table-column prop="configRemark" label="备注" min-width="180" show-overflow-tooltip />
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="scope">
              <el-button size="small" type="primary" :disabled="scope.row.configDisabled === 1" @click="save(scope.row)">保存</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="插件设置">
        <el-tabs class="plug-tabs">
          <el-tab-pane label="qqvip（QQ音乐）">
            <el-table :data="plugRowsQqvip" v-loading="loading" row-key="configKey" stripe empty-text="暂无 qqvip 配置">
              <el-table-column prop="configName" label="配置项" min-width="220" show-overflow-tooltip />
              <el-table-column label="当前值" min-width="260">
                <template #default="scope">
                  <component
                    :is="inputComponent(scope.row.configType)"
                    v-model="scope.row._editing"
                    :rows="scope.row.configType === 'input' ? 2 : undefined"
                    :placeholder="scope.row.configRemark || '请输入值'"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="opt in parseOptions(scope.row.configOptions)"
                      :key="opt.value"
                      :label="opt.label"
                      :value="opt.value"
                    />
                  </component>
                </template>
              </el-table-column>
              <el-table-column prop="configRemark" label="备注" min-width="180" show-overflow-tooltip />
              <el-table-column label="操作" width="120" fixed="right">
                <template #default="scope">
                  <el-button size="small" type="primary" :disabled="scope.row.configDisabled === 1" @click="save(scope.row)">保存</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="kg（酷狗）">
            <el-table :data="plugRowsKg" v-loading="loading" row-key="configKey" stripe empty-text="暂无 kg 配置">
              <el-table-column prop="configName" label="配置项" min-width="220" show-overflow-tooltip />
              <el-table-column label="当前值" min-width="260">
                <template #default="scope">
                  <component
                    :is="inputComponent(scope.row.configType)"
                    v-model="scope.row._editing"
                    :rows="scope.row.configType === 'input' ? 2 : undefined"
                    :placeholder="scope.row.configRemark || '请输入值'"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="opt in parseOptions(scope.row.configOptions)"
                      :key="opt.value"
                      :label="opt.label"
                      :value="opt.value"
                    />
                  </component>
                </template>
              </el-table-column>
              <el-table-column prop="configRemark" label="备注" min-width="180" show-overflow-tooltip />
              <el-table-column label="操作" width="120" fixed="right">
                <template #default="scope">
                  <el-button size="small" type="primary" :disabled="scope.row.configDisabled === 1" @click="save(scope.row)">保存</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="netease（网易云）">
            <el-table :data="plugRowsNetease" v-loading="loading" row-key="configKey" stripe empty-text="暂无 netease 配置">
              <el-table-column prop="configName" label="配置项" min-width="220" show-overflow-tooltip />
              <el-table-column label="当前值" min-width="260">
                <template #default="scope">
                  <component
                    :is="inputComponent(scope.row.configType)"
                    v-model="scope.row._editing"
                    :rows="scope.row.configType === 'input' ? 2 : undefined"
                    :placeholder="scope.row.configRemark || '请输入值'"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="opt in parseOptions(scope.row.configOptions)"
                      :key="opt.value"
                      :label="opt.label"
                      :value="opt.value"
                    />
                  </component>
                </template>
              </el-table-column>
              <el-table-column prop="configRemark" label="备注" min-width="180" show-overflow-tooltip />
              <el-table-column label="操作" width="120" fixed="right">
                <template #default="scope">
                  <el-button size="small" type="primary" :disabled="scope.row.configDisabled === 1" @click="save(scope.row)">保存</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>

          <el-tab-pane label="kw（酷我）">
            <el-table :data="plugRowsKw" v-loading="loading" row-key="configKey" stripe empty-text="暂无 kw 配置">
              <el-table-column prop="configName" label="配置项" min-width="220" show-overflow-tooltip />
              <el-table-column label="当前值" min-width="260">
                <template #default="scope">
                  <component
                    :is="inputComponent(scope.row.configType)"
                    v-model="scope.row._editing"
                    :rows="scope.row.configType === 'input' ? 2 : undefined"
                    :placeholder="scope.row.configRemark || '请输入值'"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="opt in parseOptions(scope.row.configOptions)"
                      :key="opt.value"
                      :label="opt.label"
                      :value="opt.value"
                    />
                  </component>
                </template>
              </el-table-column>
              <el-table-column prop="configRemark" label="备注" min-width="180" show-overflow-tooltip />
              <el-table-column label="操作" width="120" fixed="right">
                <template #default="scope">
                  <el-button size="small" type="primary" :disabled="scope.row.configDisabled === 1" @click="save(scope.row)">保存</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </el-tab-pane>
    </el-tabs>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { api } from '../api/modules'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()
const loading = ref(false)
const configRows = ref<Array<Record<string, any>>>([])
const qqQrImage = ref('')
const kgQrImage = ref('')

const systemRows = computed(() =>
  configRows.value.filter((row) => String(row.configKey || '').startsWith('system.')),
)
const isHiddenPluginConfig = (key: string) => {
  const lower = key.toLowerCase()
  const hideCookie = lower.includes('.cookie') && !lower.includes('cookieurl')
  const hideQrcode = lower.includes('qrcode')
  return hideCookie || hideQrcode
}

const sortPluginRows = (rows: Array<Record<string, any>>) => {
  return [...rows].sort((a, b) => {
    const keyA = String(a.configKey || '')
    const keyB = String(b.configKey || '')
    const openA = keyA.endsWith('.open') ? 0 : 1
    const openB = keyB.endsWith('.open') ? 0 : 1
    if (openA !== openB) return openA - openB
    return String(a.configName || '').localeCompare(String(b.configName || ''), 'zh-CN')
  })
}

const plugRows = computed(() =>
  sortPluginRows(
    configRows.value.filter((row) => {
      const key = String(row.configKey || '')
      return key.startsWith('plug.') && !isHiddenPluginConfig(key)
    }),
  ),
)
const plugRowsQqvip = computed(() =>
  sortPluginRows(plugRows.value.filter((row) => String(row.configKey || '').startsWith('plug.qqvip.'))),
)
const plugRowsKg = computed(() =>
  sortPluginRows(plugRows.value.filter((row) => String(row.configKey || '').startsWith('plug.kg.'))),
)
const plugRowsNetease = computed(() =>
  sortPluginRows(plugRows.value.filter((row) => String(row.configKey || '').startsWith('plug.netease.'))),
)
const plugRowsKw = computed(() =>
  sortPluginRows(plugRows.value.filter((row) => String(row.configKey || '').startsWith('plug.kw.'))),
)

const findConfig = (key: string) => configRows.value.find((r) => r.configKey === key)
const qqvipEnabled = computed(() => findConfig('plug.qqvip.open')?.configValue === 'true')
const kgEnabled = computed(() => findConfig('plug.kg.open')?.configValue === 'true')

const parseOptions = (raw: string) => {
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

const inputComponent = (type: string) => {
  if (type === 'select') return 'el-select'
  if (type === 'boolean') return 'el-switch'
  if (type === 'password') return 'el-input'
  if (type === 'path') return 'el-input'
  if (type === 'number') return 'el-input-number'
  return 'el-input'
}

const normalizeValue = (row: Record<string, any>) => {
  if (row.configType === 'boolean') {
    return row.configValue === 'true'
  }
  if (row.configType === 'number') {
    return Number(row.configValue || 0)
  }
  return row.configValue || ''
}

const toPayloadValue = (row: Record<string, any>) => {
  if (row.configType === 'boolean') {
    return row._editing ? 'true' : 'false'
  }
  return String(row._editing ?? '')
}

const load = async () => {
  loading.value = true
  try {
    const res = await api.getConfigList()
    configRows.value = ((res.data || []) as Array<Record<string, any>>).map((row) => ({
      ...row,
      _editing: normalizeValue(row),
    }))
  } finally {
    loading.value = false
  }
}

const save = async (row: Record<string, any>) => {
  await api.updateConfig({
    configId: row.configId,
    configKey: row.configKey,
    configType: row.configType,
    configValue: toPayloadValue(row),
  })
  ElMessage.success('保存成功')
  load()
}

const onImportFile = async (file: any) => {
  const formData = new FormData()
  formData.append('file', file.raw)
  await api.importSongList(formData)
  ElMessage.success('导入请求已提交')
}

const getQqQr = async () => {
  const res = await api.qqvipGetQrImage()
  qqQrImage.value = String(res.data || '')
}

const getQqWechatQr = async () => {
  const res = await api.qqvipGetWechatQrImage()
  qqQrImage.value = String(res.data || '')
}

const checkQqQr = async () => {
  const res = await api.qqvipCheckQrCodeStatus()
  ElMessage.success(res.msg || '扫码状态已更新')
}

const refreshQqCookie = async () => {
  const res = await api.qqvipRefreshCookie()
  ElMessage.success(res.msg || 'QQVIP Cookie 已刷新')
}

const getKgWxQr = async () => {
  const res = await api.kgGetWxQrImage()
  kgQrImage.value = String(res.data || '')
}

const checkKgWxQr = async () => {
  const res = await api.kgCheckWxQrCodeStatus()
  ElMessage.success(res.msg || '扫码状态已更新')
}

const refreshKgToken = async () => {
  const res = await api.kgRefreshToken()
  ElMessage.success(res.msg || 'KG Token 已刷新')
}

const kgSignIn = async () => {
  const res = await api.kgSignIn()
  ElMessage.success(res.msg || '签到完成')
}

const logout = async () => {
  await api.logout()
  auth.clearSession()
  ElMessage.success('已退出登录')
  router.replace('/login')
}

load()
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  gap: 10px;
  flex-wrap: wrap;
}

.token-card {
  margin-bottom: 14px;
}

.plugin-login-card {
  margin-bottom: 14px;
}

.plug-tabs {
  margin-top: 4px;
}

.plugin-hint {
  color: var(--text-subtle);
  margin-bottom: 8px;
}

.qr-wrap {
  margin-top: 12px;
}

.qr-image {
  width: 220px;
  height: 220px;
  border-radius: 8px;
  border: 1px solid var(--line);
}

.token-head {
  font-weight: 700;
  margin-bottom: 8px;
}

.token {
  margin-top: 6px;
  color: var(--text-subtle);
  word-break: break-all;
}
</style>
