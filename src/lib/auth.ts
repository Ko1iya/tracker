// Хранение JWT-токена авторизации в localStorage.
// budget-api выдаёт токен на POST /auth/login и ждёт его в заголовке
// Authorization: Bearer <token> на защищённых эндпоинтах (Guard в NestJS).

const TOKEN_KEY = "budget_token"

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}
