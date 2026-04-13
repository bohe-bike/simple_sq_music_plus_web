<template>
  <section class="page-wrap playlist-page">
    <header class="page-head">
      <h2 class="page-title">解析歌单</h2>
      <p class="hint">粘贴歌单或专辑链接，预览曲目后，确认下载。</p>
    </header>

    <!-- Step 1: 输入链接 -->
    <el-card shadow="never" class="block-card">
      <template #header>
        <div class="card-title">1. 输入链接</div>
      </template>

      <div class="input-row">
        <el-input
          v-model="url"
          placeholder="请输入歌单/专辑 URL"
          clearable
          size="large"
          :disabled="loadingPreview"
          @keyup.enter="parseAndPreview"
        />
        <el-button
          type="primary"
          size="large"
          :loading="loadingPreview"
          :disabled="!url.trim()"
          @click="parseAndPreview"
        >
          解析预览
        </el-button>
      </div>

      <el-alert
        class="tip"
        type="info"
        :closable="false"
        show-icon
        title="支持 QQ / 酷我 / 酷狗 / 网易云 歌单与专辑链接。"
      />

      <!-- 预览解析中提示 -->
      <div v-if="previewJobId && loadingPreview" class="preview-loading">
        <div class="preview-loading-head">
          <el-icon class="spinning"><Loading /></el-icon>
          <span>{{ previewMessage }}</span>
        </div>
        <el-progress
          v-if="previewTotal > 0"
          :percentage="previewPercent"
          :stroke-width="8"
          class="preview-progress"
        />
        <div class="preview-meta">
          <span v-if="previewTotal > 0">
            当前进度 {{ previewCurrent }} / {{ previewTotal }}
          </span>
          <span>已耗时 {{ previewElapsedText }}</span>
          <span :class="{ stale: previewStaleSeconds >= 15 }">
            最近更新 {{ previewFreshnessText }}
          </span>
        </div>
      </div>
    </el-card>

    <!-- Step 2-4: 解析结果（解析后显示） -->
    <template v-if="info || parsedSongs.length">
      <!-- 歌单基本信息 -->
      <el-card v-if="info" shadow="never" class="block-card">
        <template #header>
          <div class="card-title">2. 歌单信息</div>
        </template>
        <el-descriptions :column="2" border class="desc">
          <el-descriptions-item label="名称">{{
            info.targetName || "-"
          }}</el-descriptions-item>
          <el-descriptions-item label="来源">{{
            info.plugName || "-"
          }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{
            info.type || "-"
          }}</el-descriptions-item>
          <el-descriptions-item label="数量">
            <span
              >{{
                info.parsedCount ?? info.targetCount ?? "-"
              }}
              首（实际解析）</span
            >
            <span
              v-if="
                info.parsedCount != null &&
                info.platformCount != null &&
                info.parsedCount !== info.platformCount
              "
              style="
                margin-left: 8px;
                color: var(--el-color-warning);
                font-size: 12px;
              "
            >
              ⚠ 平台标注
              {{ info.platformCount }} 首，与实际解析数量不一致（请以实际为准）
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="链接" :span="2">{{
            info.targetUrl || url
          }}</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 曲目列表 -->
      <el-card v-if="parsedSongs.length" shadow="never" class="block-card">
        <template #header>
          <div class="songs-header">
            <span class="card-title">3. 曲目预览</span>
            <div class="songs-toolbar">
              <el-button size="small" @click="selectAll">全选</el-button>
              <el-button size="small" @click="selectNone">全不选</el-button>
              <span class="sel-count">
                已选 <strong>{{ selectedSongs.length }}</strong> / 共
                {{ parsedSongs.length }} 首
              </span>
            </div>
          </div>
        </template>

        <el-table
          ref="tableRef"
          :data="pagedSongs"
          :row-key="getRowKey"
          max-height="480"
          stripe
          class="beauty-table"
          @selection-change="onSelectionChange"
        >
          <el-table-column
            type="selection"
            width="42"
            :reserve-selection="true"
          />
          <el-table-column type="index" label="#" width="48" />
          <el-table-column
            prop="musicName"
            label="歌曲名"
            min-width="180"
            show-overflow-tooltip
          />
          <el-table-column label="歌手" min-width="140" show-overflow-tooltip>
            <template #default="scope">
              {{ formatArtists(scope.row) }}
            </template>
          </el-table-column>
          <el-table-column label="专辑" min-width="130" show-overflow-tooltip>
            <template #default="scope">
              {{ scope.row.musicAlbum || scope.row.album?.albumName || "-" }}
            </template>
          </el-table-column>
          <el-table-column label="音质" width="70" align="center">
            <template #default="scope">
              <el-tag
                :type="hasLossless(scope.row.bits) ? 'success' : 'info'"
                size="small"
                effect="plain"
              >
                {{ hasLossless(scope.row.bits) ? "无损" : "普通" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="来源" width="68" align="center">
            <template #default="scope">
              <el-tag size="small" effect="plain">{{
                scope.row.plugName || "-"
              }}</el-tag>
            </template>
          </el-table-column>
        </el-table>

        <div class="pager-wrap">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            background
            layout="total, sizes, prev, pager, next"
            :total="parsedSongs.length"
            :page-sizes="pageSizeOptions"
            @size-change="onPageSizeChange"
          />
        </div>
      </el-card>

      <!-- 确认下载 -->
      <el-card shadow="never" class="block-card action-card">
        <template #header>
          <div class="card-title">4. 确认下载</div>
        </template>

        <div class="actions">
          <el-button
            type="success"
            size="large"
            :loading="downloading"
            :disabled="selectedSongs.length === 0 || jobRunning"
            @click="confirmDownload"
          >
            下载已选
            {{ selectedSongs.length > 0 ? selectedSongs.length + " 首" : "" }}
          </el-button>
          <el-checkbox
            v-model="crossSourceMatch"
            :disabled="jobRunning"
            class="cross-check"
          >
            跨源无损匹配
          </el-checkbox>
          <span class="action-tip">
            <template v-if="crossSourceMatch">
              已开启：原始源无损直接下载，否则按 酷我→酷狗→QQ→网易云→QQVIP
              顺序查找无损版本，均无则取最高音质。
            </template>
            <template v-else>
              提交后进入后台任务队列，可在"下载"页查看进度。
            </template>
          </span>
        </div>

        <!-- 解析进度面板 -->
        <div v-if="jobId" class="job-panel">
          <div class="job-header">
            <el-icon v-if="jobRunning" class="spinning"><Loading /></el-icon>
            <el-icon
              v-else-if="jobPhase === 'done'"
              style="color: var(--el-color-success)"
              ><CircleCheck
            /></el-icon>
            <el-icon
              v-else-if="jobPhase === 'error'"
              style="color: var(--el-color-danger)"
              ><CircleClose
            /></el-icon>
            <span class="job-msg">{{ jobMessage }}</span>
          </div>
          <el-progress
            v-if="jobTotal > 0"
            :percentage="jobPercent"
            :status="
              jobPhase === 'done'
                ? 'success'
                : jobPhase === 'error'
                  ? 'exception'
                  : undefined
            "
            :stroke-width="8"
            style="margin-top: 8px"
          />
          <div v-if="jobPhase === 'done'" class="job-done-tip">
            任务已全部入队，可前往"下载"页查看进度。
          </div>
        </div>
      </el-card>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onUnmounted, watch } from "vue";
import { ElMessage } from "element-plus";
import { Loading, CircleCheck, CircleClose } from "@element-plus/icons-vue";
import { api } from "../api/modules";

type PreviewSongRow = Record<string, any> & { __index: number };

const url = ref("");
const loadingPreview = ref(false);
const downloading = ref(false);
const crossSourceMatch = ref(false);

const info = ref<Record<string, any> | null>(null);
const platformCount = ref<number | null>(null);
const parsedSongs = ref<PreviewSongRow[]>([]);
const selectedSongs = ref<any[]>([]);
const selectedSongIndexes = ref<number[]>([]);
const tableRef = ref<any>(null);
const currentPage = ref(1);
const pageSize = ref(100);
const pageSizeOptions = [50, 100, 200];
const nowTick = ref(Date.now());

// 解析任务状态（预览 & 下载共用）
const jobId = ref<string | null>(null);
const jobPhase = ref("");
const jobMessage = ref("");
const jobCurrent = ref(0);
const jobTotal = ref(0);
const jobPercent = computed(() =>
  jobTotal.value > 0
    ? Math.min(100, Math.round((jobCurrent.value * 100) / jobTotal.value))
    : 0,
);
const jobRunning = computed(
  () =>
    jobPhase.value !== "" &&
    jobPhase.value !== "done" &&
    jobPhase.value !== "error",
);

// 预览专用：是否正在轮询预览结果
const previewJobId = ref<string | null>(null);
const previewMessage = ref(
  "正在从平台抓取曲目，歌单较大时需要一些时间，请耐心等待…",
);
const previewCurrent = ref(0);
const previewTotal = ref(0);
const previewStartedAt = ref(0);
const previewLastUpdatedAt = ref(0);
const playlistUrl = computed(() => url.value.trim());
const pagedSongs = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return parsedSongs.value.slice(start, start + pageSize.value);
});
const previewPercent = computed(() =>
  previewTotal.value > 0
    ? Math.min(
        100,
        Math.round((previewCurrent.value * 100) / previewTotal.value),
      )
    : 0,
);
const previewElapsedText = computed(() => {
  if (!previewStartedAt.value) {
    return "0秒";
  }
  const diffSeconds = Math.max(
    0,
    Math.floor((nowTick.value - previewStartedAt.value) / 1000),
  );
  const minutes = Math.floor(diffSeconds / 60);
  const seconds = diffSeconds % 60;
  return minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`;
});
const previewStaleSeconds = computed(() => {
  if (!previewLastUpdatedAt.value) {
    return 0;
  }
  return Math.max(
    0,
    Math.floor((nowTick.value - previewLastUpdatedAt.value) / 1000),
  );
});
const previewFreshnessText = computed(() => {
  const seconds = previewStaleSeconds.value;
  if (seconds <= 1) {
    return "刚刚";
  }
  if (seconds < 60) {
    return `${seconds}秒前`;
  }
  const minutes = Math.floor(seconds / 60);
  return `${minutes}分钟前`;
});

// ---- 格式化辅助 ----
const formatArtists = (row: any): string => {
  if (row.musicArtists?.length) return row.musicArtists.join(" / ");
  if (row.artists?.length)
    return row.artists.map((a: any) => a.artistName || a.name || a).join(" / ");
  return "-";
};

const hasLossless = (bits: any[]): boolean => {
  if (!bits?.length) return false;
  return bits.some(
    (b: any) =>
      (typeof b === "string" && (b.includes("FLAC") || b.includes("APE"))) ||
      (typeof b === "object" &&
        (b.type === "flac" || b.type === "ape" || b.bit >= 2000)),
  );
};

const mergeInfo = (patch: Record<string, any>) => {
  info.value = {
    targetName: "",
    plugName: "",
    type: "playlist",
    targetCount: parsedSongs.value.length || 0,
    targetUrl: playlistUrl.value,
    ...(info.value || {}),
    ...patch,
  };
};

const loadPlaylistInfo = async (targetUrl: string) => {
  try {
    const res = await api.parserUrlInfo({ url: targetUrl });
    const data = (res.data || {}) as Record<string, any>;
    if (data.targetCount != null) {
      platformCount.value = Number(data.targetCount);
    }
    mergeInfo(data);
  } catch {
    mergeInfo({ targetUrl });
  }
};

const getRowKey = (row: PreviewSongRow) => row.__index;

const rebuildSelectedSongs = () => {
  selectedSongs.value = selectedSongIndexes.value
    .map((index) => parsedSongs.value[index])
    .filter((row): row is PreviewSongRow => Boolean(row));
};

const syncCurrentPageSelection = async () => {
  await nextTick();
  const table = tableRef.value;
  if (!table) {
    return;
  }
  table.clearSelection();
  const selectedIndexSet = new Set(selectedSongIndexes.value);
  for (const row of pagedSongs.value) {
    if (selectedIndexSet.has(row.__index)) {
      table.toggleRowSelection(row, true);
    }
  }
};

// ---- 解析 + 预览 ----
const parseAndPreview = async () => {
  if (!playlistUrl.value) {
    ElMessage.warning("请输入 URL");
    return;
  }
  stopPolling();
  loadingPreview.value = true;
  info.value = null;
  platformCount.value = null;
  parsedSongs.value = [];
  selectedSongs.value = [];
  selectedSongIndexes.value = [];
  currentPage.value = 1;
  previewMessage.value = "正在提交解析任务…";
  previewCurrent.value = 0;
  previewTotal.value = 0;
  previewStartedAt.value = Date.now();
  previewLastUpdatedAt.value = Date.now();
  jobId.value = null;
  jobPhase.value = "";
  previewJobId.value = null;
  try {
    const targetUrl = playlistUrl.value;
    mergeInfo({ targetUrl, targetCount: 0 });
    void loadPlaylistInfo(targetUrl);
    const previewRes = await api.previewParserUrl({ url: targetUrl });
    const pid = previewRes.data as string;
    previewJobId.value = pid;
    startPolling(pid, "preview");
  } catch (e: any) {
    loadingPreview.value = false;
    ElMessage.error(e?.response?.data?.msg || "解析失败，请检查链接");
  }
};

const onSelectionChange = (rows: any[]) => {
  const currentPageIndexSet = new Set(
    pagedSongs.value.map((row) => row.__index),
  );
  const preservedIndexes = selectedSongIndexes.value.filter(
    (index) => !currentPageIndexSet.has(index),
  );
  const pageIndexes = rows
    .map((row: PreviewSongRow) => row.__index)
    .filter((index: unknown): index is number => typeof index === "number");
  selectedSongIndexes.value = [...preservedIndexes, ...pageIndexes].sort(
    (left, right) => left - right,
  );
  rebuildSelectedSongs();
};

const selectAll = async () => {
  selectedSongIndexes.value = parsedSongs.value.map((row) => row.__index);
  rebuildSelectedSongs();
  await syncCurrentPageSelection();
};

const selectNone = async () => {
  selectedSongIndexes.value = [];
  rebuildSelectedSongs();
  await syncCurrentPageSelection();
};

const onPageSizeChange = () => {
  currentPage.value = 1;
};

// ---- 轮询 ----
let pollTimer: ReturnType<typeof setInterval> | undefined;
let previewClockTimer: ReturnType<typeof setInterval> | undefined;
const DOWNLOAD_BATCH_SIZE = 50;

/**
 * 通用轮询，根据 mode 区分预览（'preview'）和下载（'download'）
 */
const startPolling = (id: string, mode: "preview" | "download") => {
  stopPolling();
  pollTimer = setInterval(async () => {
    try {
      const res = await api.parseJobStatus(id);
      const s = res.data;
      if (!s) return;

      if (mode === "preview") {
        // 预览进行中：只更新 loadingPreview 状态文字，不影响下载进度面板
        previewMessage.value = s.message || "正在从平台抓取曲目…";
        previewCurrent.value = s.current ?? 0;
        previewTotal.value = s.total ?? 0;
        previewStartedAt.value =
          s.startedAt || previewStartedAt.value || Date.now();
        previewLastUpdatedAt.value =
          s.lastUpdatedAt || previewLastUpdatedAt.value || Date.now();
        if (s.phase === "done") {
          stopPolling();
          loadingPreview.value = false;
          parsedSongs.value = ((s.songs as any[]) || []).map((song, index) => ({
            ...song,
            __index: index,
          }));
          selectedSongIndexes.value = parsedSongs.value.map(
            (row) => row.__index,
          );
          rebuildSelectedSongs();
          currentPage.value = 1;
          mergeInfo({
            targetCount: parsedSongs.value.length,
            parsedCount: parsedSongs.value.length,
            platformCount: platformCount.value,
          });
          await syncCurrentPageSelection();
        } else if (s.phase === "error") {
          stopPolling();
          loadingPreview.value = false;
          previewJobId.value = null;
          ElMessage.error(s.errorMsg || "解析失败");
        }
      } else {
        jobPhase.value = s.phase;
        jobMessage.value = s.message;
        jobCurrent.value = s.current ?? 0;
        jobTotal.value = s.total ?? 0;
        if (s.phase === "done" || s.phase === "error") {
          stopPolling();
          downloading.value = false;
        }
      }
    } catch {
      // ignore transient errors
    }
  }, 2000);
};

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = undefined;
  }
};

const stopPreviewClock = () => {
  if (previewClockTimer) {
    clearInterval(previewClockTimer);
    previewClockTimer = undefined;
  }
};

previewClockTimer = window.setInterval(() => {
  nowTick.value = Date.now();
}, 1000);

onUnmounted(() => {
  stopPolling();
  stopPreviewClock();
});

// ---- 下载 ----
const confirmDownload = async () => {
  if (!selectedSongs.value.length) {
    ElMessage.warning("请先选择要下载的歌曲");
    return;
  }
  if (!previewJobId.value) {
    ElMessage.warning("预览结果已失效，请重新解析歌单");
    return;
  }
  downloading.value = true;
  jobId.value = null;
  jobPhase.value = "pending";
  jobMessage.value = "正在提交任务…";
  jobCurrent.value = 0;
  jobTotal.value = 0;
  try {
    // 去重并排序，避免重复选中导致的异常提交。
    const normalizedIndexes = [...new Set(selectedSongIndexes.value)]
      .filter((index) => index >= 0)
      .sort((left, right) => left - right);

    if (!normalizedIndexes.length) {
      downloading.value = false;
      ElMessage.warning("请先选择要下载的歌曲");
      return;
    }

    const needBatchSubmit = normalizedIndexes.length > DOWNLOAD_BATCH_SIZE;

    if (!needBatchSubmit) {
      const res = await api.downloadParserUrl({
        url: playlistUrl.value,
        crossSourceMatch: crossSourceMatch.value,
        previewJobId: previewJobId.value,
        selectedIndexes: normalizedIndexes,
      });
      const id = res.data as string;
      jobId.value = id;
      startPolling(id, "download");
      return;
    }

    const chunks: number[][] = [];
    for (let i = 0; i < normalizedIndexes.length; i += DOWNLOAD_BATCH_SIZE) {
      chunks.push(normalizedIndexes.slice(i, i + DOWNLOAD_BATCH_SIZE));
    }

    const submittedJobIds: string[] = [];
    for (let i = 0; i < chunks.length; i += 1) {
      jobPhase.value = "running";
      jobMessage.value = `正在分批提交 ${i + 1} / ${chunks.length}…`;
      const res = await api.downloadParserUrl({
        url: playlistUrl.value,
        crossSourceMatch: crossSourceMatch.value,
        previewJobId: previewJobId.value,
        selectedIndexes: chunks[i],
      });
      submittedJobIds.push((res.data as string) || "");
    }

    jobId.value = submittedJobIds[submittedJobIds.length - 1] || null;
    jobPhase.value = "done";
    jobMessage.value = `已分 ${chunks.length} 批提交，共 ${normalizedIndexes.length} 首`;
    downloading.value = false;
    ElMessage.success(
      `提交成功：已分 ${chunks.length} 批提交，共 ${normalizedIndexes.length} 首`,
    );
  } catch {
    downloading.value = false;
    jobPhase.value = "error";
    jobMessage.value = "提交失败";
    ElMessage.error("提交失败");
  }
};

watch([currentPage, pageSize], () => {
  void syncCurrentPageSelection();
});
</script>

<style scoped>
.playlist-page {
  display: grid;
  gap: 16px;
}

.page-head {
  margin-bottom: 2px;
}

.hint {
  margin: 6px 0 0;
  color: var(--text-subtle);
}

.block-card {
  border-radius: 14px;
}

.card-title {
  font-weight: 700;
  color: var(--text-main);
}

.input-row {
  display: grid;
  grid-template-columns: 1fr 140px;
  gap: 10px;
  align-items: center;
}

.tip {
  margin-top: 12px;
}

.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--el-color-primary-light-9, #ecf5ff);
  color: var(--el-color-primary, #409eff);
  font-size: 13px;
}

.preview-loading-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-progress {
  margin-top: 2px;
}

.preview-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  color: #35627f;
  font-size: 12px;
}

.preview-meta .stale {
  color: var(--el-color-warning);
  font-weight: 600;
}

.desc {
  margin-top: 4px;
}

.songs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.songs-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sel-count {
  font-size: 13px;
  color: var(--text-subtle);
}

.pager-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.action-card {
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.actions {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.action-tip {
  color: var(--text-subtle);
  font-size: 13px;
}

.cross-check {
  flex-shrink: 0;
}

.job-panel {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 10px;
  background: var(--el-fill-color-light, #f5f7fa);
  border: 1px solid var(--el-border-color-lighter, #e4e7ed);
}

.job-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-main);
}

.job-msg {
  font-weight: 500;
}

.job-done-tip {
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-color-success);
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.spinning {
  animation: spin 1s linear infinite;
}

@media (max-width: 900px) {
  .input-row {
    grid-template-columns: 1fr;
  }

  .pager-wrap {
    justify-content: center;
  }
}
</style>
