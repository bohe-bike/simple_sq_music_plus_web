<template>
  <div class="login-page">
    <div class="login-shell">
      <aside class="hero-panel">
        <img class="hero-logo" src="/logo.png" alt="SqMusic Plus Logo" />
        <h1>SqMusic Plus</h1>
        <p>更流畅的解析与下载体验，登录后即可开始使用。</p>
      </aside>

      <section class="login-card">
        <div class="card-head">
          <h2>欢迎登录</h2>
          <span>使用管理员账号进入控制台</span>
        </div>

        <el-form label-position="top" :model="form" @submit.prevent="onLogin">
          <el-form-item label="账号">
            <el-input v-model="form.username" placeholder="请输入账号" autocomplete="username" />
          </el-form-item>

          <el-form-item label="密码">
            <el-input
              v-model="form.password"
              type="password"
              show-password
              placeholder="请输入密码"
              autocomplete="current-password"
            />
          </el-form-item>

          <el-button type="primary" :loading="loading" class="login-btn" @click="onLogin">登录</el-button>
        </el-form>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { api } from '../api/modules'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(false)

const form = reactive({
  username: 'admin',
  password: 'admin',
  device: 'pc',
})

const onLogin = async () => {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入账号和密码')
    return
  }

  loading.value = true
  try {
    const res = await api.login(form)
    const token = (res.data?.tokenValue || res.data?.token || '') as string
    if (!token) {
      ElMessage.error('登录成功但未返回 token')
      return
    }

    auth.setSession(token, form.username, form.device)
    ElMessage.success('登录成功')
    await router.replace('/search')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.login-shell {
  width: min(980px, 100%);
  border-radius: 24px;
  border: 1px solid #d9e2ec;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(14px);
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.12);
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  overflow: hidden;
}

.hero-panel {
  padding: 40px 34px;
  color: #ffffff;
  background:
    radial-gradient(circle at 80% 15%, rgba(255, 255, 255, 0.2) 0%, transparent 34%),
    linear-gradient(150deg, #0e6da6 0%, #127fbf 42%, #24a4d8 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.hero-logo {
  width: 72px;
  height: 72px;
  border-radius: 16px;
  object-fit: cover;
  box-shadow: 0 14px 26px rgba(8, 31, 48, 0.34);
  margin-bottom: 16px;
}

.hero-panel h1 {
  margin: 0;
  font-size: 30px;
  letter-spacing: 0.3px;
}

.hero-panel p {
  margin: 12px 0 0;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.9);
}

.login-card {
  padding: 34px 30px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.card-head {
  margin-bottom: 14px;
}

.card-head h2 {
  margin: 0;
  font-size: 24px;
}

.card-head span {
  margin-top: 8px;
  display: inline-block;
  color: var(--text-subtle);
  font-size: 13px;
}

.login-btn {
  width: 100%;
  margin-top: 8px;
  height: 42px;
  font-weight: 600;
}

@media (max-width: 860px) {
  .login-page {
    padding: 14px;
  }

  .login-shell {
    grid-template-columns: 1fr;
  }

  .hero-panel {
    padding: 24px 18px;
  }

  .hero-logo {
    width: 56px;
    height: 56px;
    border-radius: 12px;
  }

  .hero-panel h1 {
    font-size: 24px;
  }

  .login-card {
    padding: 20px 16px;
  }
}
</style>
