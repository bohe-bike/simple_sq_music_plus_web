import http, { type ApiResponse } from "./http";

export interface SearchParams {
  plugName: string;
  keyword: string;
  pageIndex: number;
  pageSize: number;
}

export const api = {
  login: (payload: { username: string; password: string; device: string }) =>
    http.post<unknown, ApiResponse<{ tokenValue?: string; token?: string }>>(
      "/api/config/login",
      payload,
    ),
  isLogin: () => http.get<unknown, ApiResponse<boolean>>("/api/config/isLogin"),
  logout: () => http.post("/api/config/logout"),
  version: () => http.get<unknown, ApiResponse<string>>("/api/config/version"),
  getNetwork: () => http.get("/api/config/getCurrentNetwork"),
  getOptions: () => http.get("/api/config/getOption"),
  getConfigList: () => http.get("/api/config/getConfigList"),
  updateConfig: (payload: Record<string, unknown>) =>
    http.post("/api/config/updateConfig", payload),
  importSongList: (formData: FormData) =>
    http.post("/api/config/importSongList", formData),

  searchSong: (params: SearchParams) =>
    http.get("/api/music/searchSong", { params }),
  searchArtist: (params: SearchParams) =>
    http.get("/api/music/searchArtist", { params }),
  searchAlbum: (params: SearchParams) =>
    http.get("/api/music/searchAlbum", { params }),
  searchTips: (params: { plugName: string; keyword: string }) =>
    http.get("/api/music/searchTips", { params }),
  artistAlbumById: (params: { plugName: string; id: string }) =>
    http.get("/api/music/artistAlbumById", { params }),
  albumInfoById: (params: { plugName: string; id: string }) =>
    http.get("/api/music/albumInfoById", { params }),
  getLyric: (payload: { plugName: string; id: string }) =>
    http.post("/api/music/getLyric", payload),
  getDownloadUrl: (payload: Record<string, unknown>) =>
    http.post("/api/music/getDownloadUrl", payload),

  downloadSong: (payload: Record<string, unknown>) =>
    http.post("/api/download/downloadSong", payload),
  downloadArtistAlbum: (payload: Record<string, unknown>) =>
    http.post("/api/download/downloadArtistAlbum", payload),
  downloadAlbum: (payload: Record<string, unknown>) =>
    http.post("/api/download/downloadAlbum", payload),
  downloadParserText: (payload: { text: string }) =>
    http.post("/api/download/downloadParserText", payload),
  downloadParserTextResult: (payload: unknown[]) =>
    http.post("/api/download/downloadParserTextResult", payload),
  downloadParserUrl: (payload: {
    url: string;
    crossSourceMatch?: boolean;
    previewJobId?: string;
    selectedIndexes?: number[];
    songs?: any[];
  }) =>
    http.post<unknown, ApiResponse<string>>(
      "/api/download/downloadParserUrl",
      payload,
      { timeout: 0 },
    ),
  previewParserUrl: (payload: { url: string }) =>
    http.post<unknown, ApiResponse<string>>(
      "/api/download/previewParserUrl",
      payload,
      { timeout: 0 },
    ),
  parseJobStatus: (jobId: string) =>
    http.get<unknown, ApiResponse<Record<string, any>>>(
      `/api/download/parseJobStatus/${jobId}`,
      { timeout: 0 },
    ),

  parserText: (payload: { text: string }) =>
    http.post("/api/parser/parserText", payload),
  parserUrlInfo: (payload: { url: string }) =>
    http.post("/api/parser/parserUrlInfo", payload, { timeout: 0 }),

  taskList: (payload: Record<string, unknown>) =>
    http.post("/api/task/list", payload),
  taskDelete: (payload: { id: number }) => http.post("/api/task/del", payload),
  taskRefreshOne: (payload: { id: number }) =>
    http.post("/api/task/refreshTask", payload),
  taskAgainError: () => http.get("/api/task/againTask"),
  taskRefreshLoading: () => http.get("/api/task/refreshTask"),
  taskDeleteError: () => http.get("/api/task/delErrorTask"),
  taskDeleteSuccess: () => http.get("/api/task/delSuccessTask"),
  taskDeleteWaiting: () => http.get("/api/task/delWaitingTask"),
  taskProgress: () =>
    http.get<unknown, ApiResponse<Record<number, any>>>(
      "/api/task/taskProgress",
    ),

  monitorList: () => http.get("/api/monitor/list"),
  monitorAdd: (payload: Record<string, unknown>) =>
    http.post("/api/monitor/add", payload),
  monitorDelete: (payload: { id: number }) =>
    http.post("/api/monitor/delete", payload),

  kgGetQrImage: () => http.get("/api/plug/kg/getQrImage"),
  kgCheckQrCodeStatus: () => http.get("/api/plug/kg/checkQrCodeStatus"),
  kgGetWxQrImage: () => http.get("/api/plug/kg/getWxQrImage"),
  kgCheckWxQrCodeStatus: () => http.get("/api/plug/kg/checkWxQrCodeStatus"),
  kgRefreshToken: () => http.get("/api/plug/kg/refreshToken"),
  kgSignIn: () => http.get("/api/plug/kg/signIn"),

  qqvipGetQrImage: () => http.get("/api/plug/qqvip/getQrImage"),
  qqvipGetWechatQrImage: () => http.get("/api/plug/qqvip/getWechatQrImage"),
  qqvipCheckQrCodeStatus: () => http.get("/api/plug/qqvip/checkQrCodeStatus"),
  qqvipRefreshCookie: () => http.get("/api/plug/qqvip/refreshQQvipCookie"),
};
