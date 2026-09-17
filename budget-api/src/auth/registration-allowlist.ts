// Белый список email'ов для регистрации: REGISTER_ALLOWED_EMAILS, адреса через
// запятую. Переменная не задана ⇒ список пуст ⇒ регистрация закрыта для всех:
// забыть выставить её на сервере безопаснее, чем открыть регистрацию всем.
export function parseAllowedEmails(raw: string | undefined): string[] {
  if (!raw) return [];

  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

// Регистр не важен: Vasya@Mail.ru и vasya@mail.ru — один адрес.
export function isEmailAllowed(email: string, allowed: string[]): boolean {
  return allowed.includes(email.trim().toLowerCase());
}
