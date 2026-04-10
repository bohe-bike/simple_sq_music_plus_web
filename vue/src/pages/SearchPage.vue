<template>
  <section class="page-wrap search-page">
    <header class="panel-head">
      <div>
        <h2 class="page-title">搜索资源</h2>
        <p class="sub">按来源与类型检索，支持播放、歌词、详情和一键下载。</p>
      </div>
      <el-tag type="info" effect="plain">结果 {{ total }}</el-tag>
    </header>

    <el-card shadow="never" class="filter-card">
      <div class="form-grid">
        <div class="form-col-2">
          <el-select
            v-model="searchForm.plugName"
            placeholder="数据来源"
            style="width: 100%"
          >
            <el-option
              v-for="item in plugOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </div>
        <div class="form-col-2">
          <el-select
            v-model="searchForm.mode"
            placeholder="搜索类别"
            style="width: 100%"
          >
            <el-option label="单曲" value="song" />
            <el-option label="专辑" value="album" />
            <el-option label="歌手" value="artist" />
          </el-select>
        </div>
        <div class="form-col-6">
          <el-autocomplete
            v-model="searchForm.keyword"
            placeholder="输入关键词，例如：F1 Hans Zimmer"
            clearable
            style="width: 100%"
            :fetch-suggestions="fetchTips"
            @keyup.enter="search"
            @select="onTipSelect"
          />
        </div>
        <div class="form-col-2 actions-right">
          <el-button
            type="primary"
            :loading="loading"
            style="width: 100%"
            @click="search"
            >搜索</el-button
          >
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="table-card">
      <el-table
        v-loading="loading"
        :data="rows"
        empty-text="暂无搜索结果"
        stripe
        class="beauty-table"
        row-class-name="table-row"
      >
        <el-table-column label="封面" width="92">
          <template #default="scope">
            <el-image
              :src="scope.row.cover"
              fit="cover"
              class="cover-thumb"
              :preview-src-list="scope.row.cover ? [scope.row.cover] : []"
              preview-teleported
            >
              <template #error>
                <div class="cover-fallback">无图</div>
              </template>
            </el-image>
          </template>
        </el-table-column>
        <el-table-column
          prop="name"
          label="名称"
          min-width="230"
          show-overflow-tooltip
        />
        <el-table-column
          prop="artistLabel"
          label="歌手"
          min-width="170"
          show-overflow-tooltip
        />
        <el-table-column
          prop="albumName"
          label="专辑"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column label="时长" width="92">
          <template #default="scope">
            {{ formatDuration(scope.row.duration) }}
          </template>
        </el-table-column>
        <el-table-column label="音质" min-width="230">
          <template #default="scope">
            <el-space wrap>
              <el-tag
                v-for="bit in normalizeBrTypes(scope.row.brTypes)"
                :key="bit.value"
                effect="light"
                type="warning"
                size="small"
                class="bitrate-tag"
                :title="
                  searchForm.mode === 'song' ? `点击按 ${bit.label} 下载` : ''
                "
                @click="downloadByBrType(scope.row, bit.value)"
              >
                {{ bit.label }}
              </el-tag>
              <span
                v-if="!scope.row.brTypes || !scope.row.brTypes.length"
                class="muted"
                >无可用音质</span
              >
            </el-space>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="scope">
            <el-space wrap>
              <el-button
                size="small"
                @click="play(scope.row)"
                :disabled="searchForm.mode !== 'song'"
                >播放</el-button
              >
              <el-button
                size="small"
                type="primary"
                @click="download(scope.row)"
                >下载</el-button
              >
            </el-space>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          background
          layout="prev, pager, next, total"
          :current-page="searchForm.pageIndex"
          :page-size="searchForm.pageSize"
          :total="total"
          @current-change="onPageChange"
        />
      </div>
    </el-card>

    <el-dialog v-model="lyricVisible" title="歌词" width="760px">
      <pre class="lyric-box">{{ lyricText || "暂无歌词" }}</pre>
    </el-dialog>

    <el-drawer v-model="detailVisible" :title="detailTitle" size="55%">
      <template v-if="searchForm.mode === 'artist'">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="歌手">{{
            artistDetail.name || "-"
          }}</el-descriptions-item>
          <el-descriptions-item label="专辑数">{{
            (artistDetail.albums || []).length
          }}</el-descriptions-item>
        </el-descriptions>
        <el-divider />
        <el-table
          :data="artistDetail.albums || []"
          empty-text="暂无专辑"
          class="beauty-table"
        >
          <el-table-column
            prop="name"
            label="专辑名"
            min-width="220"
            show-overflow-tooltip
          />
          <el-table-column prop="publishDate" label="发行时间" width="150" />
          <el-table-column label="操作" width="120">
            <template #default="scope">
              <el-button
                size="small"
                type="primary"
                @click="downloadAlbumFromDetail(scope.row)"
                >下载专辑</el-button
              >
            </template>
          </el-table-column>
        </el-table>
      </template>

      <template v-else>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="专辑">{{
            albumDetail.name || albumDetail.albumName || "-"
          }}</el-descriptions-item>
          <el-descriptions-item label="歌手">{{
            albumDetail.artistName || "-"
          }}</el-descriptions-item>
          <el-descriptions-item label="歌曲数">{{
            (albumDetail.musics || albumDetail.musicList || []).length
          }}</el-descriptions-item>
        </el-descriptions>
        <el-divider />
        <el-table
          :data="albumDetail.musics || albumDetail.musicList || []"
          empty-text="暂无曲目"
          class="beauty-table"
        >
          <el-table-column
            prop="name"
            label="曲目"
            min-width="220"
            show-overflow-tooltip
          />
          <el-table-column label="时长" width="120">
            <template #default="scope">
              {{ formatDuration(scope.row.duration) }}
            </template>
          </el-table-column>
        </el-table>
      </template>
    </el-drawer>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { api } from "../api/modules";

interface PlugOption {
  value: string;
  label: string;
}

interface SearchRow {
  id: string;
  name: string;
  cover?: string;
  artistLabel?: string;
  artistName?: string[];
  artistids?: string[];
  albumName?: string;
  albumid?: string;
  duration?: string;
  plugName?: string;
  brTypes?: Array<string | { id?: string; value?: string }>;
}

const loading = ref(false);
const total = ref(0);
const rows = ref<SearchRow[]>([]);
const plugOptions = ref<PlugOption[]>([]);
const lyricVisible = ref(false);
const lyricText = ref("");
const detailVisible = ref(false);
const detailTitle = ref("详情");
const artistDetail = ref<Record<string, any>>({});
const albumDetail = ref<Record<string, any>>({});
const defaultAudioFormat = ref("auto");

const searchForm = reactive({
  plugName: "kw",
  mode: "song",
  keyword: "",
  pageIndex: 1,
  pageSize: 20,
});

const detailBtnText = computed(() =>
  searchForm.mode === "artist" ? "歌手详情" : "专辑详情",
);

const formatDuration = (duration: string | number | undefined): string => {
  if (!duration) return "-";
  let seconds =
    typeof duration === "string" ? parseInt(duration, 10) : duration;
  if (isNaN(seconds) || seconds <= 0) return "-";
  // 大于一天的毫秒数(86400000)，可能是微秒
  if (seconds > 86400000) {
    seconds = Math.floor(seconds / 1000000);
  } else if (seconds > 86400) {
    // 大于一天的秒数(86400)，可能是毫秒
    seconds = Math.floor(seconds / 1000);
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const fetchOptions = async () => {
  const res = await api.getOptions();
  plugOptions.value = (res.data || []) as PlugOption[];
  if (
    plugOptions.value.length &&
    !plugOptions.value.find((p) => p.value === searchForm.plugName)
  ) {
    searchForm.plugName = plugOptions.value[0].value;
  }
};

const fetchDefaultAudioFormat = async () => {
  try {
    const res = await api.getConfigList();
    const configs = (res.data || []) as Array<Record<string, unknown>>;
    const format = configs.find(
      (row) =>
        String(row.configKey || "") === "system.download.file.audio.format",
    )?.configValue;
    defaultAudioFormat.value = String(format || "auto").toLowerCase();
  } catch {
    defaultAudioFormat.value = "auto";
  }
};

const fetchTips = async (
  query: string,
  cb: (arg: Array<{ value: string }>) => void,
) => {
  if (!query?.trim()) {
    cb([]);
    return;
  }
  try {
    const res = await api.searchTips({
      plugName: searchForm.plugName,
      keyword: query.trim(),
    });
    cb(((res.data || []) as string[]).map((v) => ({ value: v })));
  } catch {
    cb([]);
  }
};

const onTipSelect = (item: { value: string }) => {
  searchForm.keyword = item.value;
  search();
};

const normalizeRows = (records: Array<Record<string, unknown>>) =>
  records.map((item) => ({
    id: String(item.id || ""),
    name: String(item.name || item.albumName || ""),
    cover: String(item.pic || item.musicImage || item.albumImg || ""),
    artistLabel: Array.isArray(item.artistName)
      ? item.artistName.join(" / ")
      : String(item.artistName || ""),
    artistName: (item.artistName || []) as string[],
    artistids: (item.artistids || []) as string[],
    albumName: String(item.albumName || ""),
    albumid: String(item.albumid || ""),
    duration: String(item.durationSecond || item.duration || ""),
    plugName: String(item.plugName || searchForm.plugName),
    brTypes: (item.brTypes || []) as Array<
      string | { id?: string; value?: string }
    >,
  }));

const normalizeBrTypes = (
  types?: Array<string | { id?: string; value?: string }>,
) =>
  (types || [])
    .map((item) => {
      if (typeof item === "string") {
        return { value: item, label: item };
      }
      const value = String(item?.value || item?.id || "");
      return { value, label: value || "未知音质" };
    })
    .filter((item) => !!item.value);

const parseBrType = (brTypeId: string) => {
  const parts = String(brTypeId || "")
    .toLowerCase()
    .split("_");
  const format = parts.length >= 3 ? parts[1] : "";
  const bit = Number(parts[parts.length - 1]) || 0;
  return { format, bit };
};

const pickBrTypeBySetting = (types: string[]) => {
  if (!types.length) return "";
  if (defaultAudioFormat.value === "auto") return "";
  const matched = types.filter(
    (type) => parseBrType(type).format === defaultAudioFormat.value,
  );
  if (!matched.length) return "";
  return matched.sort((a, b) => parseBrType(b).bit - parseBrType(a).bit)[0];
};

const search = async () => {
  if (!searchForm.keyword.trim()) {
    ElMessage.warning("请输入关键词");
    return;
  }
  loading.value = true;
  try {
    const params = {
      plugName: searchForm.plugName,
      keyword: searchForm.keyword.trim(),
      pageIndex: searchForm.pageIndex,
      pageSize: searchForm.pageSize,
    };
    const request =
      searchForm.mode === "song"
        ? api.searchSong(params)
        : searchForm.mode === "artist"
          ? api.searchArtist(params)
          : api.searchAlbum(params);
    const res = await request;
    const data = (res.data || {}) as Record<string, unknown>;
    const records = (data.records || []) as Array<Record<string, unknown>>;
    rows.value = normalizeRows(records);
    total.value = Number(data.searchTotal || records.length || 0);
  } finally {
    loading.value = false;
  }
};

const onPageChange = (page: number) => {
  searchForm.pageIndex = page;
  search();
};

const play = async (row: SearchRow) => {
  if (!row.brTypes?.length) {
    ElMessage.warning("该歌曲暂无可播放音质");
    return;
  }
  const firstBrType = normalizeBrTypes(row.brTypes)[0]?.value;
  if (!firstBrType) {
    ElMessage.warning("该歌曲暂无可播放音质");
    return;
  }
  const res = await api.getDownloadUrl({
    id: row.id,
    plugName: row.plugName || searchForm.plugName,
    brType: firstBrType,
    brTypes: normalizeBrTypes(row.brTypes).map((item) => item.value),
  });
  const url = (res.data as Record<string, unknown>)?.url as string;
  if (url) window.open(url, "_blank");
  else ElMessage.info("已请求播放地址，请检查插件登录状态");
};

const viewLyric = async (row: SearchRow) => {
  const res = await api.getLyric({
    id: row.id,
    plugName: row.plugName || searchForm.plugName,
  });
  lyricText.value = String(res.data || "");
  lyricVisible.value = true;
};

const viewDetail = async (row: SearchRow) => {
  detailVisible.value = true;
  if (searchForm.mode === "artist") {
    detailTitle.value = `歌手详情 - ${row.name}`;
    const res = await api.artistAlbumById({
      id: row.id,
      plugName: row.plugName || searchForm.plugName,
    });
    artistDetail.value = (res.data || {}) as Record<string, any>;
  } else {
    detailTitle.value = `专辑详情 - ${row.name}`;
    const res = await api.albumInfoById({
      id: row.albumid || row.id,
      plugName: row.plugName || searchForm.plugName,
    });
    albumDetail.value = (res.data || {}) as Record<string, any>;
  }
};

const downloadAlbumFromDetail = async (album: Record<string, any>) => {
  await api.downloadAlbum({
    plugName: searchForm.plugName,
    albumid: album.id || album.albumid,
    albumName: album.name || album.albumName,
    artistName: album.artistName,
  });
  ElMessage.success("已提交专辑下载任务");
};

const downloadByBrType = async (row: SearchRow, brType: string) => {
  if (searchForm.mode !== "song") return;
  const normalizedBrTypes = normalizeBrTypes(row.brTypes).map(
    (item) => item.value,
  );
  if (!normalizedBrTypes.length) {
    ElMessage.warning("该歌曲暂无可下载音质");
    return;
  }
  await api.downloadSong({
    id: row.id,
    name: row.name,
    albumName: row.albumName,
    artistName: row.artistName || [],
    artistids: row.artistids || [],
    plugName: row.plugName || searchForm.plugName,
    brType,
    brTypes: normalizedBrTypes,
  });
  ElMessage.success(`已按 ${brType} 加入下载队列`);
};

const download = async (row: SearchRow) => {
  if (searchForm.mode === "song") {
    const normalizedBrTypes = normalizeBrTypes(row.brTypes).map(
      (item) => item.value,
    );
    if (!normalizedBrTypes.length) {
      ElMessage.warning("该歌曲暂无可下载音质");
      return;
    }
    const selectedBrType = pickBrTypeBySetting(normalizedBrTypes);
    await api.downloadSong({
      id: row.id,
      name: row.name,
      albumName: row.albumName,
      artistName: row.artistName || [],
      artistids: row.artistids || [],
      plugName: row.plugName || searchForm.plugName,
      brType: selectedBrType || undefined,
      brTypes: normalizedBrTypes,
    });
    if (!selectedBrType && defaultAudioFormat.value !== "auto") {
      ElMessage.warning(
        `未找到 ${defaultAudioFormat.value} 音质，已按最高可用音质下载`,
      );
      return;
    }
    ElMessage.success("已加入下载队列");
    return;
  }
  if (searchForm.mode === "artist") {
    await api.downloadArtistAlbum({
      plugName: row.plugName || searchForm.plugName,
      artistid: row.id,
    });
    ElMessage.success("已提交歌手专辑下载任务");
    return;
  }
  await api.downloadAlbum({
    plugName: row.plugName || searchForm.plugName,
    albumid: row.id,
    albumName: row.name,
    artistName: row.artistLabel,
  });
  ElMessage.success("已提交专辑下载任务");
};

onMounted(async () => {
  await Promise.all([fetchOptions(), fetchDefaultAudioFormat()]);
});
</script>

<style scoped>
.search-page {
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

.actions-right {
  display: flex;
  justify-content: flex-end;
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

.cover-thumb {
  width: 52px;
  height: 52px;
  border-radius: 8px;
  border: 1px solid var(--line);
  display: block;
  overflow: hidden;
  background: #f5f8fc;
}

.cover-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--text-subtle);
  font-size: 12px;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.muted {
  color: var(--text-subtle);
  font-size: 12px;
}

.bitrate-tag {
  cursor: pointer;
}

.lyric-box {
  max-height: 60vh;
  overflow: auto;
  white-space: pre-wrap;
  line-height: 1.6;
  background: #f7f9fc;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--line);
}

@media (max-width: 980px) {
  .panel-head {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
