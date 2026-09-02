import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const defaultRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const defaultHost = '127.0.0.1';
const defaultPort = 5173;
const publicFiles = new Set([
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/sw.js',
  '/PRODUCT_GOAL.html',
  '/.nojekyll',
]);
const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
]);

function readOption(name, fallback) {
  const prefix = `--${name}=`;
  const match = process.argv.find((argument) => argument.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

function resolveRequestPath(rootPath, requestUrl) {
  let pathname;

  try {
    pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
  } catch {
    return null;
  }

  if (pathname.includes('\\')) {
    return null;
  }

  const normalizedPath = pathname === '/' ? '/index.html' : path.posix.normalize(pathname);
  if (
    !publicFiles.has(normalizedPath) &&
    !normalizedPath.startsWith('/src/') &&
    !normalizedPath.startsWith('/public/')
  ) {
    return null;
  }

  const relativePath = normalizedPath.replace(/^\/+/, '');
  const filePath = path.resolve(rootPath, relativePath);
  const rootWithSeparator = rootPath.endsWith(path.sep) ? rootPath : `${rootPath}${path.sep}`;
  const sourceRoot = path.join(rootPath, 'src');
  const publicRoot = path.join(rootPath, 'public');
  const sourceRootWithSeparator = `${sourceRoot}${path.sep}`;
  const publicRootWithSeparator = `${publicRoot}${path.sep}`;

  if (!filePath.startsWith(rootWithSeparator)) {
    return null;
  }

  if (normalizedPath.startsWith('/src/') && !filePath.startsWith(sourceRootWithSeparator)) {
    return null;
  }
  if (normalizedPath.startsWith('/public/') && !filePath.startsWith(publicRootWithSeparator)) {
    return null;
  }

  return filePath;
}

function writePlainText(response, statusCode, message, extraHeaders = {}) {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  });
  response.end(message);
}

export function createStaticServer(options = {}) {
  const rootPath = path.resolve(options.rootPath ?? defaultRoot);

  return http.createServer(async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) {
      writePlainText(response, 405, 'Method Not Allowed', { Allow: 'GET, HEAD' });
      return;
    }

    const filePath = resolveRequestPath(rootPath, request.url ?? '/');
    if (!filePath) {
      writePlainText(response, 404, 'Not Found');
      return;
    }

    try {
      const stats = await fs.promises.stat(filePath);
      if (!stats.isFile()) {
        writePlainText(response, 404, 'Not Found');
        return;
      }

      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Length': stats.size,
        'Content-Type':
          mimeTypes.get(path.extname(filePath).toLowerCase()) ?? 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
      });

      if (request.method === 'HEAD') {
        response.end();
        return;
      }

      const stream = fs.createReadStream(filePath);
      stream.on('error', () => response.destroy());
      stream.pipe(response);
    } catch (error) {
      if (error.code === 'ENOENT') {
        writePlainText(response, 404, 'Not Found');
        return;
      }

      writePlainText(response, 500, 'Internal Server Error');
    }
  });
}

function parsePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${value}`);
  }
  return port;
}

function listen(server, port, host) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      resolve();
    });
  });
}

async function run() {
  const host = readOption('host', process.env.POLYGON_RPG_DEV_HOST || defaultHost);
  const port = parsePort(readOption('port', process.env.POLYGON_RPG_DEV_PORT || defaultPort));
  const server = createStaticServer();
  let shuttingDown = false;

  const shutdown = (exitCode = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;

    server.close(() => {
      process.exitCode = exitCode;
    });
  };

  process.once('SIGINT', () => shutdown());
  process.once('SIGTERM', () => shutdown());

  await listen(server, port, host);
  const originUrl = `http://${host}:${port}`;
  console.log(`Polygon RPG development server: ${originUrl}/`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
