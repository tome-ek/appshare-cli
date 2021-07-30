import execa = require('execa');
import fs = require('fs');
import { parse, ParsedPath } from 'path';
import { UserBuildOptions } from './userInputCollector';

export type BuildOptions = {
  schemes: string[];
  targets: string[];
  buildConfigurations: string[];
};

export type RootDirectoryContent = {
  project?: ParsedPath;
  workspace?: ParsedPath;
};

type XcodebuildListOutput = {
  project: {
    configurations: string[];
    name: string;
    schemes: string[];
    targets: string[];
  };
};

export interface XcodeConfigurationParser {
  parseBuildOptions: (cwd: string) => Promise<BuildOptions>;
  parseRootDirectoryContent: (cwd: string) => Promise<RootDirectoryContent>;
  parseBuildDirectoryPath: (
    cwd: string,
    buildOptions: UserBuildOptions,
    rootDirectoryContent: RootDirectoryContent
  ) => Promise<string>;
}

export const xcodeConfigurationParser = (): XcodeConfigurationParser => {
  return {
    parseBuildOptions: async cwd => {
      const { stdout } = await execa.shell(`xcodebuild -list -json`, {
        cwd: cwd,
      });
      const jsonOutput: XcodebuildListOutput = JSON.parse(stdout);
      return {
        schemes: jsonOutput.project.schemes,
        targets: jsonOutput.project.targets,
        buildConfigurations: jsonOutput.project.configurations.filter(
          s => !s.includes('Release')
        ),
      };
    },
    parseRootDirectoryContent: async cwd => {
      const directoryFilenames = await fs.promises.readdir(cwd);
      const parsedFiles = directoryFilenames.map(parse).filter(f => !!f.ext);
      return {
        project: parsedFiles.find(f => f.ext === '.xcodeproj'),
        workspace: parsedFiles.find(f => f.ext === '.xcworkspace'),
      };
    },
    parseBuildDirectoryPath: async (
      cwd,
      buildOptions,
      rootDirectoryContent
    ) => {
      const workspace = rootDirectoryContent.workspace?.base;
      const xcodebuildArguments = !!workspace
        ? `-workspace ${workspace} -scheme ${buildOptions.scheme}`
        : `-target ${buildOptions.target}`;
      const { stdout: grepLine } = await execa.shell(
        `xcodebuild ${xcodebuildArguments} -showBuildSettings | grep -m 1 -a BUILD_ROOT`,
        { cwd: cwd }
      );
      const buildDirectory =
        grepLine.trim().replace('BUILD_ROOT = ', '') + '/Debug-iphonesimulator';
      return buildDirectory;
    },
  };
};
