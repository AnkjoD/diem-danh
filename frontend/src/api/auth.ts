import http from "@/common/utils/http";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  full_name: string;
}

export interface AuthResponse {
  access_token: string;
  teacher: {
    email: string;
    full_name: string;
  };
}

export const loginApi = async (data: LoginPayload): Promise<AuthResponse> => {
  const response = await http.post<AuthResponse>("/auth/login", data);
  return response.data;
};

export const registerApi = async (
  data: RegisterPayload,
): Promise<AuthResponse> => {
  const response = await http.post<AuthResponse>("/auth/register", data);
  return response.data;
};
