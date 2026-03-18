import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

interface FailedRequestQueueItem {
  resolve: (value: string | null) => void;
  reject: (reason?: AxiosError | unknown) => void;
}

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const getCookie = (name: string): string | undefined => {
  if (typeof window === "undefined") return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return undefined;
};

const http = axios.create({
  baseURL: process.env.NEXT_PUBLIC_SERVER_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue: FailedRequestQueueItem[] = [];

const processQueue = (
  error: AxiosError | unknown | null,
  token: string | null = null,
) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

http.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      const xsrfToken = getCookie("xsrf_token");

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      if (xsrfToken && config.headers) {
        config.headers["x-xsrf-token"] = xsrfToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

http.interceptors.response.use(
  (response) => {
    if (response.data && response.data.access_token) {
      localStorage.setItem("accessToken", response.data.access_token);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url === "/auth/refresh") {
        if (typeof window !== "undefined") {
          localStorage.removeItem("accessToken");
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise<string | null>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return http(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const currentXsrfToken = getCookie("xsrf_token");
        const headers: any = { "Content-Type": "application/json" };
        if (currentXsrfToken) {
          headers["x-xsrf-token"] = currentXsrfToken;
        }

        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: headers,
          },
        );

        if (typeof window !== "undefined") {
          localStorage.setItem("accessToken", data.access_token);
        }

        http.defaults.headers.common["Authorization"] =
          `Bearer ${data.access_token}`;

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        }

        processQueue(null, data.access_token);

        return http(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        if (typeof window !== "undefined") {
          localStorage.removeItem("accessToken");
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default http;
