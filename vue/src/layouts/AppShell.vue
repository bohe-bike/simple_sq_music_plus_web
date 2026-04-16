<template>
  <el-container class="app-shell">
    <el-header class="shell-header">
      <div class="brand-wrap">
        <img class="brand-logo-image" src="/logo.png" alt="SqMusic Plus Logo" />
        <div class="brand-logo-text">SqMusic</div>
        <div class="speed">
          <div class="speed-item speed-upload">
            <svg
              class="speed-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path
                d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"
              />
            </svg>
            <span>{{ uploadSpeed }}</span>
          </div>
          <div class="speed-divider"></div>
          <div class="speed-item speed-download">
            <svg
              class="speed-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
            >
              <path
                d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"
              />
            </svg>
            <span>{{ downloadSpeed }}</span>
          </div>
        </div>
      </div>

      <div class="menu-wrap">
        <div class="menu-surface">
          <el-menu
            mode="horizontal"
            :default-active="activePath"
            :ellipsis="false"
            @select="onSelect"
            class="top-menu"
          >
            <el-menu-item index="/search">搜索</el-menu-item>
            <el-menu-item index="/download">下载</el-menu-item>
            <el-menu-item index="/parse-text">解析文本</el-menu-item>
            <el-menu-item index="/parse-playlist">解析歌单</el-menu-item>
            <el-menu-item index="/monitor">监听下载</el-menu-item>
            <el-menu-item index="/settings">设置</el-menu-item>
          </el-menu>
        </div>
        <div class="status-wrap">
          <span class="status-dot"></span>
          <span class="status-text">服务正常</span>
          <span class="version-tag">{{ displayVersion }}</span>
        </div>
      </div>
    </el-header>

    <el-main class="shell-main">
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api } from "../api/modules";

const route = useRoute();
const router = useRouter();
const activePath = computed(() => route.path);

const uploadSpeed = ref("0.00 B/s");
const downloadSpeed = ref("0.00 B/s");
const appVersion = ref(__APP_VERSION__);
const displayVersion = computed(() => {
  const versionText = appVersion.value.trim();
  if (!versionText || versionText === "-") {
    return "-";
  }
  return /^[vV]/.test(versionText)
    ? versionText.toUpperCase()
    : `V${versionText}`;
});
let timer: number | undefined;

const fetchSpeed = async () => {
  try {
    const res = await api.getNetwork();
    const report = (res.data as Record<string, unknown>) || {};
    uploadSpeed.value = String(report.uploadSpeedFormatted || "0.00 B/s");
    downloadSpeed.value = String(report.downloadSpeedFormatted || "0.00 B/s");
  } catch {
    // ignore polling errors
  }
};

const onSelect = (path: string) => {
  router.push(path);
};

onMounted(() => {
  fetchSpeed();
  timer = window.setInterval(fetchSpeed, 2000);
});

onUnmounted(() => {
  if (timer) {
    window.clearInterval(timer);
  }
});
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
}

.shell-header {
  display: flex;
  align-items: center;
  gap: 14px;
  height: 74px;
  padding: 0 20px;
  background: linear-gradient(90deg, #f8fbff 0%, #ffffff 100%);
  border-bottom: 1px solid var(--line);
}

.brand-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  min-width: max-content;
}

.brand-logo-image {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  object-fit: cover;
}

.brand-logo-text {
  font-size: 34px;
  font-weight: 700;
  letter-spacing: 0.4px;
}

.speed {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border-radius: 10px;
  background: linear-gradient(135deg, #f0f7ff 0%, #e8f4fd 100%);
  border: 1px solid #d6e7f5;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  min-width: max-content;
  height: 32px;
  box-sizing: border-box;
}

.speed-item {
  display: flex;
  align-items: center;
  gap: 4px;
  line-height: 1;
}

.speed-icon {
  width: 14px;
  height: 14px;
}

.speed-upload {
  color: #0d9488;
}

.speed-download {
  color: #0891b2;
}

.speed-divider {
  width: 1px;
  height: 16px;
  background: #cce1f2;
}

.menu-wrap {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.menu-surface {
  min-width: 0;
  border: 1px solid #d9e2ec;
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #f6f9fd 100%);
  box-shadow:
    0 8px 18px rgba(15, 23, 42, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.top-menu {
  border-bottom: none;
  background: transparent !important;
  min-width: max-content;
  padding: 4px;
  gap: 2px;
  display: flex;
}

.top-menu :deep(.el-menu--horizontal) {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  min-width: max-content;
  border-bottom: none;
  gap: 2px;
}

.top-menu :deep(.el-menu-item) {
  white-space: nowrap;
  padding: 0 18px;
  flex-shrink: 0;
  min-width: max-content;
  height: 40px;
  line-height: 40px;
  border-radius: 10px;
  color: #425466;
  font-size: 14px;
  font-weight: 500;
  border-bottom: none !important;
  transition: all 0.25s ease;
}

.top-menu :deep(.el-menu-item:hover) {
  color: #127fbf;
  background: #eaf4fc;
}

.top-menu :deep(.el-menu-item.is-active) {
  color: #0f6aa8;
  font-weight: 600;
  background: linear-gradient(180deg, #e6f3ff 0%, #d9edfd 100%);
  box-shadow:
    inset 0 0 0 1px #b7daf5,
    0 2px 8px rgba(15, 106, 168, 0.15);
}

.status-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid #d9e2ec;
  background: #ffffff;
  color: #486581;
  font-size: 12px;
  white-space: nowrap;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #1f9d55;
  box-shadow: 0 0 0 4px rgba(31, 157, 85, 0.14);
}

.status-text {
  font-weight: 600;
}

.version-tag {
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid #d8e7f3;
  background: #f7fbff;
  color: #35627f;
}

.shell-main {
  padding: 18px;
}

@media (max-width: 980px) {
  .shell-header {
    flex-wrap: wrap;
    height: auto;
    padding: 12px;
    gap: 8px;
  }

  .brand-logo-image {
    width: 36px;
    height: 36px;
  }

  .brand-logo-text {
    font-size: 28px;
  }

  .speed {
    padding: 4px 8px;
    gap: 6px;
    font-size: 11px;
  }

  .speed-icon {
    width: 12px;
    height: 12px;
  }

  .menu-wrap {
    width: 100%;
    justify-content: flex-start;
    overflow-x: auto;
  }

  .menu-surface {
    overflow-x: auto;
  }

  .top-menu :deep(.el-menu-item) {
    padding: 0 12px;
    height: 34px;
    line-height: 34px;
    font-size: 13px;
  }

  .status-wrap {
    display: none;
  }

  .shell-main {
    padding: 10px;
  }
}
</style>
