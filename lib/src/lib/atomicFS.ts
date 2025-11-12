import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export async function withAtomicDir(
  outputDir: string,
  fn: (tmpDir: string) => Promise<void>
) {
  const createTemp = async () => {
    const tmpPath = `${outputDir}.tmp-${randomUUID()}`;
    await fs.mkdir(tmpPath, { recursive: true });
    return new TempResource(tmpPath);
  };

  await fs.mkdir(path.dirname(outputDir), { recursive: true });
  return withAtomicResource(outputDir, createTemp, fn);
}

export async function withAtomicFile(
  targetFile: string,
  fn: (tmpFile: string) => Promise<void>
) {
  const dir = path.dirname(targetFile);
  const createTemp = async () => {
    const tmpPath = path.join(dir, `.tmp-${randomUUID()}-${path.basename(targetFile)}`);
    await fs.mkdir(dir, { recursive: true });
    return new TempResource(tmpPath);
  };

  return withAtomicResource(targetFile, createTemp, fn);
}

async function withAtomicResource(
  targetPath: string,
  createTemp: () => Promise<TempResource>,
  fn: (tmpPath: string) => Promise<void>
) {
  const backup = new BackupManager(targetPath);

  const tmp = await createTemp();

  try {
    await fn(tmp.path);
    await backup.create();

    await fs.rename(tmp.path, targetPath);
    await backup.commit();
  } catch (err) {
    await backup.restore();
    throw err;
  } finally {
    await tmp[Symbol.asyncDispose]();
  }
}

class BackupManager {
  constructor(private targetPath: string, private backupPath = `${targetPath}.bak`) {}

  async create() {
    await fs.rm(this.backupPath, { recursive: true, force: true }).catch(() => {});
    if (await exists(this.targetPath)) {
      await fs.rename(this.targetPath, this.backupPath);
    }
  }

  async restore() {
    if (await exists(this.backupPath)) {
      await fs.rm(this.targetPath, { recursive: true, force: true }).catch(() => {});
      await fs.rename(this.backupPath, this.targetPath);
    }
  }

  async commit() {
    await fs.rm(this.backupPath, { recursive: true, force: true }).catch(() => {});
  }
}

export async function safeRm(pathToRm: string) {
  await fs.rm(pathToRm, { recursive: true, force: true }).catch(() => {});
}

export async function exists(pathToCheck: string) {
  try {
    await fs.access(pathToCheck);
    return true;
  } catch {
    return false;
  }
}

class TempResource {
  constructor(public path: string) {}
  async [Symbol.asyncDispose]() {
    await safeRm(this.path);
  }
}
