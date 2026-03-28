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

    if (response.data && typeof response.data === 'object' && 'statusCode' in response.data && 'data' in response.data) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;
    if (originalRequest.url?.includes("/auth")) {
      return Promise.reject(error);
    }
    if (error.response?.status === 401 && !originalRequest._retry) {

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
        const headers: { [key: string]: string } = {
          "Content-Type": "application/json",
        };
        if (currentXsrfToken) {
          headers["x-xsrf-token"] = currentXsrfToken;
        }

        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: headers,
          },
        );

        const responseData = response.data?.data || response.data;

        if (typeof window !== "undefined") {
          localStorage.setItem("accessToken", responseData.access_token);
        }

        http.defaults.headers.common["Authorization"] =
          `Bearer ${responseData.access_token}`;

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${responseData.access_token}`;
        }

        processQueue(null, responseData.access_token);

        return http(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        if (typeof window !== "undefined") {
          const isLoginPage = window.location.pathname === "/auth";
          if (!isLoginPage) {
            localStorage.removeItem("accessToken");
            window.location.href = "/auth";
          }
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
