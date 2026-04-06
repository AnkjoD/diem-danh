export interface AuthResponse {
  access_token: string;
  teacher: {
    email: string;
    full_name: string;
  };
}