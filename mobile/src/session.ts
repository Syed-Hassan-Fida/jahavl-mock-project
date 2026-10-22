import * as SecureStore from "expo-secure-store";

const TOKEN = "jah_token";
const USER = "jah_user";

export type SessionUser = { id: number; name: string; email: string; role: string };

export async function saveSession(token: string, user: SessionUser) {
  await SecureStore.setItemAsync(TOKEN, token);
  await SecureStore.setItemAsync(USER, JSON.stringify(user));
}

export async function loadSession(): Promise<{ token: string; user: SessionUser } | null> {
  const token = await SecureStore.getItemAsync(TOKEN);
  const raw = await SecureStore.getItemAsync(USER);
  if (!token || !raw) return null;
  try {
    return { token, user: JSON.parse(raw) as SessionUser };
  } catch {
    return null;
  }
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(TOKEN);
  await SecureStore.deleteItemAsync(USER);
}
