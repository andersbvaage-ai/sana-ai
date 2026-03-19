import bcrypt from 'bcryptjs';

interface StoredUser {
  email: string;
  passwordHash: string;
  name: string;
  role: string;
}

export interface AuthUser {
  email: string;
  name: string;
  role: string;
}

function loadUsers(): StoredUser[] {
  const raw = process.env['USERS_JSON'];
  if (raw) {
    try {
      return JSON.parse(raw) as StoredUser[];
    } catch {
      console.error('[userStore] USERS_JSON er ugyldig JSON — ingen brukere lastet');
    }
  }
  if (process.env['NODE_ENV'] !== 'production') {
    // Dev-standardbruker: lege@demo.no / demo1234
    return [{ email: 'lege@demo.no', passwordHash: '__DEV__demo1234', name: 'Demo Lege', role: 'lege' }];
  }
  return [];
}

export async function verifyCredentials(email: string, password: string): Promise<AuthUser | null> {
  const users = loadUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return null;

  // Klartekst kun for dev-standardbruker
  if (user.passwordHash.startsWith('__DEV__')) {
    if (password !== user.passwordHash.slice(7)) return null;
  } else {
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
  }

  return { email: user.email, name: user.name, role: user.role };
}
