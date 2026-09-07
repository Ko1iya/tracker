import { api } from "@/lib/api"

// Формат ответа budget-api на /auth/login и /auth/register.
export interface AuthUser {
  id: number
  email: string
}

export interface AuthResponse {
  accessToken: string
  user: AuthUser
}

// POST /auth/login — обменивает email+пароль на JWT.
export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/login", {
    email,
    password,
  })
  return data
}
