<template>
  <section class="page-wrap lyric-repair-page">
    <header class="panel-head">
      <div>
        <h2 class="page-title">歌词补全</h2>
        <p class="sub">扫描下载目录中缺少歌词的音频，并按原下载音源补充同名 LRC 文件。</p>
      </div>
      <el-tag type="info" effect="plain">{{ jobId ? `任务 ${jobId.slice(0, 8)}` : "未启动任务" }}</el-tag>
    </header>

    <el-card shadow="never" class="control-card">
      <div class="control-row">
        <div class="control-copy">
          <strong>补全范围</strong>
          <span>默认跳过已有且非空的歌词文件，不会修改音频文件。</span>
        </div>
        <el-switch v-model="overwriteExisting" active-text="覆盖现有歌词" />
      </div>
      <div class="action-row">
        <el-button :loading="submitting" :disabled="isActive" @click="runPreview">扫描缺失歌词</el-button>
        <el-button type="primary" :loading="submitting" :disabled="isActive" @click="runRepair">开始补全</el-button>
      </div>
    </el-card>

    <el-card v-if="status" shadow="never" class="status-card">
      <div class="status-head">
        <div>
          <div class="status-title">{{ phaseLabel }}</div>
          <div class="status-message">{{ status.message }}</div>
        </div>
        <el-tag :type="phaseTag" effect="light">{{ phaseLabel }}</el-tag>
      </div>
      <el-progress :percentage="status.percent" :status="status.phase === 'error' ? 'exception' : undefined" />
      <div class="metric-grid">
        <div class="metric"><span>扫描音频</span><strong>{{ status.scanned }}</strong></div>
        <div class="metric"><span>待处理</span><strong>{{ status.candidates }}</strong></div>
        <div class="metric"><span>已匹配</span><strong>{{ status.matched }}</strong></div>
        <div class="metric"><span>补全成功</span><strong class="success-text">{{ status.repaired }}</strong></div>
        <div class="metric"><span>无歌词</span><strong class="warning-text">{{ status.noLyric }}</strong></div>
        <div class="metric"><span>未匹配或失败</span><strong class="danger-text">{{ status.unmatched + status.failed }}</strong></div>
      </div>
      <div v-if="status.downloadPath" class="path-line">下载目录：{{ status.downloadPath }}</div>
    </el-card>

    <el-card shadow="never" class="details-card">
      <template #header>
        <div class="details-header">
          <span>任务明细</span>
          <el-tag v-if="status?.detailsTruncated" type="warning" effect="plain">仅显示前 500 条</el-tag>
        </div>
      </template>
      <el-table :data="status?.items || []" v-loading="submitting" stripe empty-text="启动扫描后显示匹配和补全结果">
        <el-table-column prop="file" label="文件" min-width="260" show-overflow-tooltip />
        <el-table-column label="状态" width="120">
          <template #default="scope">
            <el-tag :type="itemTag(scope.row.status)" effect="light">{{ itemLabel(scope.row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="musicName" label="歌曲" min-width="150" show-overflow-tooltip />
        <el-table-column prop="artistName" label="歌手" min-width="130" show-overflow-tooltip />
        <el-table-column label="来源" width="100">
          <template #default="scope">
            <el-tag v-if="scope.row.plugName" size="small" effect="plain">{{ scope.row.plugName }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="说明" min-width="220" show-overflow-tooltip />
      </el-table>
    </el-card>
  </section>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api, type LyricRepairJobStatus } from "../api/modules";

const overwriteExisting = ref(false);
const submitting = ref(false);
const jobId = ref("");
const status = ref<LyricRepairJobStatus | null>(null);
let pollTimer: ReturnType<typeof setInterval> | undefined;
let previousPhase = "";

const isActive = computed(() => {
  const phase = status.value?.phase;
  return phase === "pending" || phase === "scanning" || phase === "matching" || phase === "repairing";
});

const phaseLabel = computed(() => {
  const labels: Record<string, string> = {
    pending: "等待开始",
    scanning: "扫描目录",
    matching: "匹配下载记录",
    repairing: "补充歌词",
    done: "任务完成",
    error: "任务失败",
  };
  return labels[status.value?.phase || ""] || "任务状态";
});

const phaseTag = computed(() => {
  if (status.value?.phase === "done") return "success";
  if (status.value?.phase === "error") return "danger";
  if (isActive.value) return "warning";
  return "info";
});

const itemLabel = (value: string) => {
  const labels: Record<string, string> = {
    matched: "已匹配",
    unmatched: "未匹配",
    repaired: "已补全",
    no_lyric: "无歌词",
    failed: "失败",
  };
  return labels[value] || value;
};

const itemTag = (value: string) => {
  if (value === "repaired") return "success";
  if (value === "matched") return "info";
  if (value === "no_lyric") return "warning";
  return "danger";
};

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = undefined;
  }
};

const fetchStatus = async () => {
  if (!jobId.value) return;
  const res = await api.lyricRepairStatus(jobId.value);
  status.value = res.data;
  if (!isActive.value) {
    stopPolling();
    if (status.value.phase !== previousPhase) {
      if (status.value.phase === "done") ElMessage.success(status.value.message || "任务完成");
      if (status.value.phase === "error") ElMessage.error(status.value.errorMsg || status.value.message || "任务失败");
    }
  }
  previousPhase = status.value.phase;
};

const startPolling = async () => {
  stopPolling();
  await fetchStatus();
  if (isActive.value) {
    pollTimer = setInterval(() => {
      fetchStatus().catch(() => stopPolling());
    }, 1200);
  }
};

const submit = async (mode: "preview" | "repair") => {
  submitting.value = true;
  try {
    const payload = { overwriteExisting: overwriteExisting.value };
    const res = mode === "preview"
      ? await api.lyricRepairPreview(payload)
      : await api.lyricRepairStart(payload);
    jobId.value = String(res.data || "");
    status.value = null;
    previousPhase = "";
    await startPolling();
  } finally {
    submitting.value = false;
  }
};

const runPreview = () => submit("preview");

const runRepair = async () => {
  const actionText = overwriteExisting.value ? "覆盖已有歌词并补全" : "补全缺失歌词";
  await ElMessageBox.confirm(`${actionText}？补全过程不会修改音频文件。`, "确认启动", {
    type: "warning",
    confirmButtonText: "开始补全",
    cancelButtonText: "取消",
  });
  await submit("repair");
};

onUnmounted(stopPolling);
</script>

<style scoped>
.lyric-repair-page {
  display: grid;
  gap: 12px;
}

.panel-head,
.status-head,
.control-row,
.action-row,
.details-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sub,
.status-message,
.path-line,
.control-copy span {
  margin: 4px 0 0;
  color: var(--text-subtle);
  font-size: 13px;
}

.control-card,
.status-card,
.details-card {
  border-radius: 14px;
}

.control-copy {
  display: grid;
  gap: 2px;
}

.action-row {
  justify-content: flex-start;
  margin-top: 16px;
}

.status-title {
  font-weight: 700;
  color: var(--text);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  margin-top: 18px;
}

.metric {
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--line);
  background: #f8fbff;
}

.metric span,
.metric strong {
  display: block;
}

.metric span {
  color: var(--text-subtle);
  font-size: 12px;
}

.metric strong {
  margin-top: 6px;
  color: var(--text);
  font-size: 20px;
}

.success-text { color: #198754 !important; }
.warning-text { color: #b26b00 !important; }
.danger-text { color: #c43c35 !important; }

.path-line {
  word-break: break-all;
}

@media (max-width: 980px) {
  .panel-head,
  .control-row,
  .status-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
