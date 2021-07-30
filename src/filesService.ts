import fs = require('fs');
import { parse } from 'path';
import archiver = require('archiver');

export interface FilesService {
  writeTempConfig: (cacheDir: string) => Promise<void>;
  zipApp: (buildDirectory: string) => Promise<string>;
}

export namespace Filenames {
  export const Config = 'Appshare.xcconfig';
}

export const filesService = (): FilesService => {
  const parseAppName = async (buildDirectory: string) => {
    const fileNames = await fs.promises.readdir(buildDirectory);
    const appFile = fileNames.map(parse).find(f => f.ext === '.app');
    if (!appFile) {
      throw new Error('Could not find the built .app file.');
    } else {
      return appFile.name;
    }
  };

  return {
    writeTempConfig: cacheDir => {
      const config = `EXCLUDED_ARCHS = arm64\nVALID_ARCH = x86_64 armv7s armv7\nONLY_ACTIVE_ARCH = YES`;
      const configFile = `${cacheDir}/${Filenames.Config}`;
      const configData = new Uint8Array(Buffer.from(config));
      return fs.promises.writeFile(configFile, configData);
    },

    zipApp: async buildDirectory => {
      const appName = await parseAppName(buildDirectory);
      const zipFile = `${buildDirectory}/${appName}.zip`;
      const appFile = `${buildDirectory}/${appName}.app`;
      const output = fs.createWriteStream(zipFile);
      const archive = archiver('zip', {
        zlib: { level: 9 },
      });
      archive.on('error', err => {
        throw err;
      });
      archive.pipe(output);
      archive.directory(appFile, appName + '.app');
      await archive.finalize();
      return zipFile;
    },
  };
};
