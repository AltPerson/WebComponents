import { createServer } from 'node:http';
import { readFile, readdir, writeFile, unlink, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildProfileState } from './shared/profile-domain.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = __dirname;
const STATIC_DIR = path.join(PROJECT_ROOT, 'static');
const SHARED_DIR = path.join(PROJECT_ROOT, 'shared');
const PROFILE_DIR = path.join(PROJECT_ROOT, 'data', 'profile');
const HOST = '127.0.0.1';
const PORT = 8000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

const USERNAME_RE = /^[a-z0-9][a-z0-9-]{1,63}$/i;

const sendJson = (res, status, payload) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
};

const sendText = (res, status, text) => {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
};

const insideProject = (candidatePath) => {
  const rel = path.relative(PROJECT_ROOT, candidatePath);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
};

const safeJoin = (base, requestPath) => {
  const cleaned = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
  const full = path.join(base, cleaned);
  if (!insideProject(full)) return null;
  return full;
};

const parseJsonBody = async (req) => {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 2_000_000) {
      throw new Error('REQUEST_TOO_LARGE');
    }
  }
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('INVALID_JSON');
  }
};

const usernameToPath = (username) => {
  if (!USERNAME_RE.test(username)) return null;
  return path.join(PROFILE_DIR, `${username}.json`);
};

const readProfile = async (username) => {
  const target = usernameToPath(username);
  if (!target) return null;
  const raw = await readFile(target, 'utf8');
  return JSON.parse(raw);
};

const readDirectoryItems = async () => {
  const files = await readdir(PROFILE_DIR);
  return files.filter((file) => file.endsWith('.json'));
};

const summarizeProfile = (state) => ({
  id: state.profile.id,
  displayName: state.computed.displayName,
  email: state.profile.email,
});

const listProfiles = async (searchParams) => {
  const files = await readDirectoryItems();
  const nameQuery = (searchParams.get('name') || '').trim().toLowerCase();
  const emailQuery = (searchParams.get('email') || '').trim().toLowerCase();
  const items = [];

  for (const fileName of files) {
    const username = fileName.slice(0, -5);
    const source = await readProfile(username);
    const state = buildProfileState(source);
    const summary = summarizeProfile(state);
    const haystackName =
      `${summary.displayName} ${state.profile.firstName} ${state.profile.lastName}`.toLowerCase();
    const haystackEmail = summary.email.toLowerCase();
    const nameMatches = !nameQuery || haystackName.includes(nameQuery);
    const emailMatches = !emailQuery || haystackEmail.includes(emailQuery);
    if (nameMatches && emailMatches) items.push(summary);
  }

  items.sort((a, b) => a.id.localeCompare(b.id));
  if (!nameQuery && !emailQuery) return items.slice(0, 10);
  return items;
};

const saveProfileState = async (username, incoming, createOnly = false) => {
  const filePath = usernameToPath(username);
  if (!filePath) {
    return {
      ok: false,
      status: 422,
      payload: { ok: false, errors: { id: 'Invalid username' } },
    };
  }

  const payload = incoming || {};
  const merged = {
    ...payload,
    id: username,
  };
  const state = buildProfileState(merged);

  if (!state.valid) {
    return {
      ok: false,
      status: 422,
      payload: {
        ok: false,
        profile: state.profile,
        computed: state.computed,
        errors: state.errors,
        valid: false,
      },
    };
  }

  if (createOnly) {
    try {
      await stat(filePath);
      return {
        ok: false,
        status: 409,
        payload: { ok: false, error: 'Profile already exists' },
      };
    } catch (error) {
      if (!(error && error.code === 'ENOENT')) throw error;
    }
  }

  await writeFile(filePath, JSON.stringify(state.profile, null, 2), 'utf8');
  return {
    ok: true,
    status: 200,
    payload: {
      ok: true,
      profile: state.profile,
      computed: state.computed,
      errors: state.errors,
      valid: true,
    },
  };
};

const serveFile = async (res, filePath) => {
  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      sendText(res, 404, 'Not found');
      return;
    }
    throw error;
  }
};

const server = createServer(async (req, res) => {
  try {
    if (!req.url) return sendText(res, 400, 'Bad request');
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    const pathname = url.pathname;
    const method = req.method || 'GET';

    if (pathname === '/profile' && method === 'GET') {
      const items = await listProfiles(url.searchParams);
      return sendJson(res, 200, { ok: true, items });
    }
    if (pathname === '/profile') {
      return sendText(res, 405, 'Method not allowed');
    }

    if (pathname === '/profiles' && method === 'POST') {
      let body;
      try {
        body = await parseJsonBody(req);
      } catch (error) {
        if (error.message === 'INVALID_JSON') {
          return sendText(res, 400, 'Invalid JSON');
        }
        throw error;
      }
      const requestedId = typeof body.id === 'string' ? body.id.trim() : '';
      if (!USERNAME_RE.test(requestedId)) {
        return sendJson(res, 422, {
          ok: false,
          errors: { id: 'Invalid username' },
        });
      }
      const result = await saveProfileState(requestedId, body, true);
      return sendJson(res, result.status, result.payload);
    }
    if (pathname === '/profiles') {
      return sendText(res, 405, 'Method not allowed');
    }

    if (pathname.startsWith('/profile/')) {
      const username = pathname.slice('/profile/'.length);
      if (!USERNAME_RE.test(username)) {
        return sendText(res, 404, 'Not found');
      }

      if (method === 'GET') {
        const accept = req.headers.accept || '';
        if (
          accept.includes('text/html') &&
          !accept.includes('application/json')
        ) {
          return serveFile(res, path.join(STATIC_DIR, 'index.html'));
        }
        try {
          const source = await readProfile(username);
          const state = buildProfileState(source);
          return sendJson(res, 200, {
            ok: true,
            profile: state.profile,
            computed: state.computed,
            errors: state.errors,
            valid: state.valid,
          });
        } catch (error) {
          if (error && error.code === 'ENOENT') {
            return sendText(res, 404, 'Not found');
          }
          if (error instanceof SyntaxError) {
            return sendText(res, 500, 'Corrupt profile JSON');
          }
          throw error;
        }
      }

      if (method === 'POST' || method === 'PUT') {
        let body;
        try {
          body = await parseJsonBody(req);
        } catch (error) {
          if (error.message === 'INVALID_JSON') {
            return sendText(res, 400, 'Invalid JSON');
          }
          throw error;
        }
        const result = await saveProfileState(username, body, false);
        return sendJson(res, result.status, result.payload);
      }

      if (method === 'DELETE') {
        const target = usernameToPath(username);
        if (!target) return sendText(res, 404, 'Not found');
        try {
          await unlink(target);
          return sendJson(res, 200, { ok: true });
        } catch (error) {
          if (error && error.code === 'ENOENT') {
            return sendText(res, 404, 'Not found');
          }
          throw error;
        }
      }

      return sendText(res, 405, 'Method not allowed');
    }

    if (pathname === '/' || pathname === '/index.html') {
      return serveFile(res, path.join(STATIC_DIR, 'index.html'));
    }

    if (pathname.startsWith('/shared/')) {
      const rel = pathname.slice('/shared/'.length);
      const target = safeJoin(SHARED_DIR, rel);
      if (!target) return sendText(res, 404, 'Not found');
      return serveFile(res, target);
    }

    if (pathname.startsWith('/')) {
      const rel = pathname.slice(1);
      const target = safeJoin(STATIC_DIR, rel);
      if (!target) return sendText(res, 404, 'Not found');
      return serveFile(res, target);
    }

    return sendText(res, 404, 'Not found');
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { ok: false, error: 'Unexpected server error' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
