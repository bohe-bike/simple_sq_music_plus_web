<template>
  <section class="page-wrap download-page">
    <header class="panel-head">
      <div>
        <h2 class="page-title">下载任务</h2>
        <p class="sub">
          支持按歌曲、来源、状态、时间筛选，并提供批量任务维护。
        </p>
      </div>
      <el-tag type="info" effect="plain">总数 {{ page.total }}</el-tag>
    </header>

    <el-card shadow="never" class="filter-card">
      <div class="form-grid">
        <div class="form-col-2">
          <el-input
            v-model="filters.downloadMusicname"
            placeholder="歌曲名"
            clearable
          />
        </div>
        <div class="form-col-2">
          <el-input
            v-model="filters.downloadArtistname"
            placeholder="歌手名"
            clearable
          />
        </div>
        <div class="form-col-2">
          <el-input
            v-model="filters.downloadAlbumname"
            placeholder="专辑名"
            clearable
          />
        </div>
        <div class="form-col-2">
          <el-select
            v-model="filters.downloadPlugName"
            clearable
            placeholder="数据来源"
            style="width: 100%"
          >
            <el-option label="kw" value="kw" />
            <el-option label="kg" value="kg" />
            <el-option label="qq" value="qq" />
            <el-option label="qqvip" value="qqvip" />
            <el-option label="netease" value="netease" />
            <el-option label="apple" value="apple" />
            <el-option label="free" value="free" />
          </el-select>
        </div>
        <div class="form-col-2">
          <el-select
            v-model="filters.downloadStatus"
            clearable
            placeholder="下载状态"
            style="width: 100%"
          >
            <el-option label="等待下载" value="waiting" />
            <el-option label="下载中" value="loading" />
            <el-option label="下载成功" value="success" />
            <el-option label="下载失败" value="error" />
          </el-select>
        </div>
        <div class="form-col-2">
          <el-date-picker
            v-model="downloadTime"
            type="datetimerange"
            value-format="YYYY-MM-DD HH:mm:ss"
            range-separator="到"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            style="width: 100%"
          />
        </div>

        <div class="form-col-12 toolbar">
          <el-space wrap>
            <el-button type="primary" :loading="loading" @click="fetchTasks"
              >搜索</el-button
            >
            <el-button @click="resetFilters">重置</el-button>
            <el-divider direction="vertical" />
            <el-button @click="batchAction('againError')">重试失败</el-button>
            <el-button @click="batchAction('refreshLoading')"
              >重置下载中</el-button
            >
            <el-button type="danger" plain @click="batchAction('delError')"
              >清空失败</el-button
            >
            <el-button type="danger" plain @click="batchAction('delSuccess')"
              >清空成功</el-button
            >
            <el-button type="danger" plain @click="batchAction('delWaiting')"
              >清空等待</el-button
            >
            <el-button type="warning" plain @click="batchAction('delDuplicate')"
              >清除重复</el-button
            >
          </el-space>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="table-card">
      <el-table
        :data="records"
        v-loading="loading"
        stripe
        class="beauty-table"
        empty-text="暂无下载任务"
      >
        <el-table-column
          prop="downloadMusicname"
          label="音乐名称"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column
          prop="downloadArtistname"
          label="歌手"
          min-width="140"
          show-overflow-tooltip
        />
        <el-table-column
          prop="downloadAlbumname"
          label="专辑"
          min-width="160"
          show-overflow-tooltip
        />
        <el-table-column label="来源" width="120">
          <template #default="scope">
            <el-tag size="small" effect="plain">{{
              scope.row.downloadPlugName || "-"
            }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="downloadTime" label="下载时间" width="180" />
        <el-table-column
          prop="downloadUpdateTime"
          label="更新时间"
          width="180"
        />
        <el-table-column
          prop="downloadBrType"
          label="下载类型"
          width="150"
          show-overflow-tooltip
        />
        <el-table-column label="状态" width="160">
          <template #default="scope">
            <el-tag
              :type="statusTag(scope.row.downloadStatus)"
              effect="light"
              >{{ statusLabel(scope.row.downloadStatus) }}</el-tag
            >
            <el-progress
              v-if="progressMap[scope.row.id]"
              :percentage="progressMap[scope.row.id].percent"
              :stroke-width="4"
              style="margin-top: 4px; width: 100%"
            />
          </template>
        </el-table-column>
        <el-table-column
          prop="downloadMsg"
          label="消息"
          min-width="240"
          show-overflow-tooltip
        />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button text type="primary" @click="retryTask(scope.row.id)"
              >重试</el-button
            >
            <el-button text type="danger" @click="deleteTask(scope.row.id)"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          background
          layout="sizes, prev, pager, next, total"
          :current-page="page.pageIndex"
          :page-size="page.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="page.total"
          @size-change="onSizeChange"
          @current-change="onPageChange"
        />
      </div>
    </el-card>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref, onUnmounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "../api/modules";

const loading = ref(false);
const records = ref<Array<Record<string, any>>>([]);
const downloadTime = ref<[string, string] | []>([]);
const progressMap = ref<Record<number, any>>({});

const filters = reactive({
  downloadMusicname: "",
  downloadArtistname: "",
  downloadAlbumname: "",
  downloadPlugName: "",
  downloadStatus: "",
});

const page = reactive({
  pageIndex: 1,
  pageSize: 20,
  total: 0,
});

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    waiting: "等待下载",
    loading: "下载中",
    success: "下载成功",
    error: "下载失败",
  };
  return map[status] || status || "-";
};

const statusTag = (status: string) => {
  if (status === "success") return "success";
  if (status === "error") return "danger";
  if (status === "loading") return "warning";
  return "info";
};

const fetchProgress = async () => {
  try {
    const res = await api.taskProgress();
    progressMap.value = (res.data || {}) as Record<number, any>;
  } catch {
    // ignore progress fetch errors
  }
};

let autoRefreshTimer: ReturnType<typeof setInterval> | undefined;

const startAutoRefresh = () => {
  if (autoRefreshTimer) return;
  autoRefreshTimer = setInterval(async () => {
    await fetchTasks();
    await fetchProgress();
    const hasActive = records.value.some(
      (r) => r.downloadStatus === "loading" || r.downloadStatus === "waiting",
    );
    if (!hasActive) stopAutoRefresh();
  }, 5000);
};

const stopAutoRefresh = () => {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = undefined;
  }
};

onUnmounted(stopAutoRefresh);

const fetchTasks = async () => {
  loading.value = true;
  try {
    const res = await api.taskList({
      ...filters,
      pageIndex: page.pageIndex,
      pageSize: page.pageSize,
      downloadTimeStart: downloadTime.value?.[0] || null,
      downloadTimeEnd: downloadTime.value?.[1] || null,
    });
    const data = (res.data || {}) as Record<string, any>;
    records.value = data.records || [];
    page.total = Number(data.total || 0);
    const hasActive = records.value.some(
      (r) => r.downloadStatus === "loading" || r.downloadStatus === "waiting",
    );
    if (hasActive) startAutoRefresh();
  } finally {
    loading.value = false;
  }
};

const resetFilters = () => {
  filters.downloadMusicname = "";
  filters.downloadArtistname = "";
  filters.downloadAlbumname = "";
  filters.downloadPlugName = "";
  filters.downloadStatus = "";
  downloadTime.value = [];
  page.pageIndex = 1;
  fetchTasks();
};

const deleteTask = async (id: number) => {
  await ElMessageBox.confirm("删除后不可恢复，确认继续？", "删除任务", {
    type: "warning",
  });
  await api.taskDelete({ id });
  ElMessage.success("删除成功");
  fetchTasks();
};

const retryTask = async (id: number) => {
  await api.taskRefreshOne({ id });
  ElMessage.success("任务已重置为等待下载");
  fetchTasks();
};

const batchAction = async (type: string) => {
  if (type === "againError") await api.taskAgainError();
  if (type === "refreshLoading") await api.taskRefreshLoading();
  if (type === "delError") await api.taskDeleteError();
  if (type === "delSuccess") await api.taskDeleteSuccess();
  if (type === "delWaiting") await api.taskDeleteWaiting();
  if (type === "delDuplicate") {
    const res = await api.taskDelDuplicate();
    const count = res.data ?? 0;
    ElMessage.success(`已清除 ${count} 条重复记录（源文件未删除）`);
    fetchTasks();
    return;
  }
  ElMessage.success("操作成功");
  fetchTasks();
};

const onPageChange = (p: number) => {
  page.pageIndex = p;
  fetchTasks();
};

const onSizeChange = (size: number) => {
  page.pageSize = size;
  page.pageIndex = 1;
  fetchTasks();
};

fetchTasks();
fetchProgress();
</script>

<style scoped>
.download-page {
  display: grid;
  gap: 12px;
}

.panel-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.sub {
  margin: 4px 0 0;
  color: var(--text-subtle);
  font-size: 13px;
}

.filter-card,
.table-card {
  border-radius: 14px;
}

.toolbar {
  margin-top: 2px;
}

.beauty-table :deep(.el-table__header th) {
  background: #f7fafd;
  color: #334e68;
  font-weight: 700;
}

.beauty-table :deep(.el-table__row td) {
  padding-top: 12px;
  padding-bottom: 12px;
}

.pager {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 980px) {
  .panel-head {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
