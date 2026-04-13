import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
} from "axios";
import { ElMessage } from "element-plus";
import { getToken } from "../stores/auth";

export interface ApiResponse<T = unknown> {
  code: number;
  msg: string;
  data: T;
}

const http: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  timeout: 20000,
});

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.satoken = token;
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const payload = response.data;
    if (payload.code === 200) {
      return payload;
    }
    ElMessage.error(payload.msg || "请求失败");
    return Promise.reject(payload);
  },
  (error: AxiosError) => {
    const status = error.response?.status;
    if (status === 401) {
      ElMessage.error("登录已过期，请重新登录");
      localStorage.removeItem("sqmusic_token");
      window.location.hash = "#/login";
    } else {
      const isTimeout =
        error.code === "ECONNABORTED" ||
        (error.message || "").toLowerCase().includes("timeout");
      ElMessage.error(
        isTimeout
          ? "请求超时，请稍后重试或减少单次解析文本量"
          : error.message || "网络异常",
      );
    }
    return Promise.reject(error);
  },
);

export default http;
