<template>
  <section class="page-wrap">
    <h2 class="page-title">解析文本</h2>
    <p class="hint">粘贴歌单文本后可先识别预览，再批量加入下载队列。</p>

    <el-input
      v-model="text"
      type="textarea"
      :rows="11"
      resize="vertical"
      placeholder="请输入待解析文本，每行建议包含 歌曲名 + 歌手"
    />

    <div class="actions">
      <el-button :loading="parsing" :disabled="parsing" @click="preview"
        >识别预览</el-button
      >
      <el-button type="primary" :loading="downloading" @click="downloadDirect"
        >直接解析并下载</el-button
      >
      <el-button
        type="success"
        :disabled="!previewRows.length || downloading"
        :loading="downloading"
        @click="downloadPreviewRows"
        >下载预览结果</el-button
      >
    </div>

    <!-- 识别进度 -->
    <div v-if="parsing && previewJobId" class="preview-loading">
      <div class="preview-loading-head">
        <el-icon class="spinning"><Loading /></el-icon>
        <span>{{ jobMessage }}</span>
      </div>
      <el-progress
        v-if="jobTotal > 0"
        :percentage="jobPercent"
        :stroke-width="8"
        class="preview-progress"
      />
      <div class="preview-meta">
        <span v-if="jobTotal > 0">进度 {{ jobCurrent }} / {{ jobTotal }}</span>
        <span>已耗时 {{ elapsedText }}</span>
      </div>
    </div>

    <el-divider />

    <el-table :data="previewRows" stripe empty-text="暂无识别结果">
      <el-table-column type="index" label="#" width="48" />
      <el-table-column
        prop="musicName"
        label="歌曲"
        min-width="200"
        show-overflow-tooltip
      />
      <el-table-column
        prop="artistName"
        label="歌手"
        min-width="160"
        show-overflow-tooltip
      />
      <el-table-column
        prop="albumName"
        label="专辑"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column prop="plugName" label="来源" width="100" />
      <el-table-column
        prop="reason"
        label="识别信息"
        min-width="220"
        show-overflow-tooltip
      />
    </el-table>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from "vue";
import { ElMessage } from "element-plus";
import { Loading } from "@element-plus/icons-vue";
import { api } from "../api/modules";

const text = ref("");
const parsing = ref(false);
const downloading = ref(false);
const previewRows = ref<Array<Record<string, unknown>>>([]);

// 轮询状态
const previewJobId = ref<string | null>(null);
const jobMessage = ref("");
const jobCurrent = ref(0);
const jobTotal = ref(0);
const jobStartedAt = ref(0);
const nowTick = ref(Date.now());
let pollTimer: ReturnType<typeof setInterval> | null = null;
let tickTimer: ReturnType<typeof setInterval> | null = null;

const jobPercent = computed(() =>
  jobTotal.value > 0
    ? Math.min(100, Math.round((jobCurrent.value * 100) / jobTotal.value))
    : 0,
);

const elapsedText = computed(() => {
  if (!jobStartedAt.value) return "0秒";
  const diff = Math.max(
    0,
    Math.floor((nowTick.value - jobStartedAt.value) / 1000),
  );
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return m > 0 ? `${m}分${s}秒` : `${s}秒`;
});

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
}

onUnmounted(stopPoll);

const preview = async () => {
  if (!text.value.trim()) {
    ElMessage.warning("请输入需要解析的文本");
    return;
  }
  parsing.value = true;
  previewRows.value = [];
  previewJobId.value = null;
  jobMessage.value = "正在提交…";
  jobCurrent.value = 0;
  jobTotal.value = 0;
  jobStartedAt.value = Date.now();
  nowTick.value = Date.now();
  stopPoll();

  try {
    const res = await api.previewParserText({ text: text.value });
    if (!res.data) {
      ElMessage.error(res.msg || "提交失败");
      parsing.value = false;
      return;
    }
    previewJobId.value = res.data as string;

    tickTimer = setInterval(() => {
      nowTick.value = Date.now();
    }, 1000);

    pollTimer = setInterval(async () => {
      try {
        const statusRes = await api.parseJobStatus(previewJobId.value!);
        const status = statusRes.data;
        if (!status) return;
        jobMessage.value = status.message || "";
        jobCurrent.value = status.current ?? 0;
        jobTotal.value = status.total ?? 0;
        if (status.startedAt) jobStartedAt.value = status.startedAt;

        if (status.phase === "done") {
          stopPoll();
          parsing.value = false;
          const entities: Array<Record<string, unknown>> =
            status.parserEntities || [];
          previewRows.value = entities.map((item) => {
            const song = (item.plugSearchMusicResult || {}) as Record<
              string,
              unknown
            >;
            return {
              source: item,
              musicName: (song.name as string) || "-",
              artistName: Array.isArray(song.artistName)
                ? (song.artistName as string[]).join(" / ")
                : (song.artistName as string) || "-",
              albumName: (song.albumName as string) || "-",
              plugName:
                (song.plugName as string) || (item.plugName as string) || "-",
              reason: item.isDetection ? "识别成功" : "未找到匹配",
            };
          });
          ElMessage.success(`识别完成，共 ${previewRows.value.length} 条`);
        } else if (status.phase === "error") {
          stopPoll();
          parsing.value = false;
          ElMessage.error("识别失败：" + (status.errorMsg || status.message));
        }
      } catch (e) {
        // 轮询网络异常，继续重试
      }
    }, 1500);
  } catch (e) {
    parsing.value = false;
    ElMessage.error("提交识别任务失败");
  }
};

const downloadDirect = async () => {
  if (!text.value.trim()) {
    ElMessage.warning("请输入需要解析的文本");
    return;
  }
  downloading.value = true;
  try {
    const res = await api.downloadParserText({ text: text.value });
    ElMessage.success(res.msg || "已提交后台解析下载任务");
  } finally {
    downloading.value = false;
  }
};

const downloadPreviewRows = async () => {
  if (!previewJobId.value) {
    ElMessage.warning("请先完成识别预览");
    return;
  }
  downloading.value = true;
  try {
    const res = await api.downloadParserTextJob({
      previewJobId: previewJobId.value,
    });
    ElMessage.success((res as any).msg || "已加入下载队列");
  } finally {
    downloading.value = false;
  }
};
</script>

<style scoped>
.hint {
  margin: 0 0 12px;
  color: var(--text-subtle);
}

.actions {
  margin-top: 12px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.preview-loading {
  margin-top: 16px;
  padding: 12px 16px;
  background: var(--el-fill-color-light, #f5f7fa);
  border-radius: 6px;
}

.preview-loading-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  margin-bottom: 8px;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.preview-progress {
  margin-bottom: 6px;
}

.preview-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
