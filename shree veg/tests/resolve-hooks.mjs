import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';

function resolveFile(candidatePath) {
  if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
    return candidatePath;
  }
  if (fs.existsSync(candidatePath + '.ts')) return candidatePath + '.ts';
  if (fs.existsSync(candidatePath + '.tsx')) return candidatePath + '.tsx';
  if (fs.existsSync(candidatePath + '.js')) return candidatePath + '.js';
  if (fs.existsSync(candidatePath + '.mjs')) return candidatePath + '.mjs';
  if (fs.existsSync(path.join(candidatePath, 'index.ts'))) return path.join(candidatePath, 'index.ts');
  if (fs.existsSync(path.join(candidatePath, 'index.tsx'))) return path.join(candidatePath, 'index.tsx');
  if (fs.existsSync(path.join(candidatePath, 'index.js'))) return path.join(candidatePath, 'index.js');
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const subPath = specifier.replace('@/', './src/');
    const fullPath = path.resolve(process.cwd(), subPath);
    const resolved = resolveFile(fullPath);
    if (resolved) {
      return nextResolve(pathToFileURL(resolved).href, context);
    }
  }

  // Handle relative imports without extensions
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL) {
    const parentDir = path.dirname(fileURLToPath(context.parentURL));
    const fullPath = path.resolve(parentDir, specifier);
    const resolved = resolveFile(fullPath);
    if (resolved) {
      return nextResolve(pathToFileURL(resolved).href, context);
    }
  }

  return nextResolve(specifier, context);
}
