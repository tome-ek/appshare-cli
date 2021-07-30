import Listr = require('listr');
import { Command, flags } from '@oclif/command';
import execa = require('execa');
import chalk from 'chalk';
import cli from 'cli-ux';
import del = require('del');
import {
  XcodeConfigurationParser,
  xcodeConfigurationParser,
} from '../xcodeConfigurationParser';
import { UserInputCollector, userInputCollector } from '../userInputCollector';
import { IConfig } from '@oclif/config';
import {
  StorageKey,
  storageProvider,
  StorageProvider,
} from '../storageProvider';
import { Filenames, filesService, FilesService } from '../filesService';
import { apiService, ApiService } from '../apiService';

export default class Upload extends Command {
  static description = 'Upload your app to Appshare.';

  static flags = {
    path: flags.string({
      char: 'p',
      description:
        'The root directory of your Xcode project. Defaults to current working directory.',
      multiple: false,
      required: false,
    }),
  };

  private configParser: XcodeConfigurationParser;
  private inputCollector: UserInputCollector;
  private storage: StorageProvider;
  private filesService: FilesService;
  private apiService: ApiService;

  constructor(argv: string[], config: IConfig) {
    super(argv, config);
    this.configParser = xcodeConfigurationParser();
    this.inputCollector = userInputCollector();
    this.storage = storageProvider();
    this.filesService = filesService();
    this.apiService = apiService();
  }

  async run() {
    const { flags } = this.parse(Upload);
    const cwd = flags.path || process.cwd();

    const buildOptions = await this.inputCollector.collectBuildOptions(
      await this.configParser.parseBuildOptions(cwd)
    );

    if (!this.storage.exists(StorageKey.RefreshToken)) {
      console.log(chalk.yellow('Please log in first to upload your app.'));
      console.log(
        'To log in, simply run ' + chalk.bold.italic('appshare login')
      );
      return;
    }

    const tasks = new Listr([
      {
        title: 'Preparing to build',
        task: () => {
          return new Listr([
            {
              title: 'Analyzing root directory',
              task: async (ctx: any) => {
                const rootDirectoryContent =
                  await this.configParser.parseRootDirectoryContent(cwd);
                if (!rootDirectoryContent.project)
                  throw Error('Unable to locate .xcodeproj at path: ' + cwd);
                ctx.rootDirectoryContent = rootDirectoryContent;
              },
            },
            {
              title: 'Creating temporary config',
              task: async () =>
                await this.filesService.writeTempConfig(this.config.cacheDir),
            },

            {
              title: 'Parsing build directory',
              task: async (ctx: any) => {
                const buildDirectory =
                  await this.configParser.parseBuildDirectoryPath(
                    cwd,
                    buildOptions,
                    ctx.rootDirectoryContent
                  );
                ctx.buildDirectory = buildDirectory;
              },
            },
          ]);
        },
      },
      {
        title: 'Building project',
        task: async (ctx: any, _task: any) => {
          const args: string[] = ['-sdk', 'iphonesimulator'];
          if (ctx.rootDirectoryContent.workspace) {
            args.push('-workspace', ctx.rootDirectoryContent.workspace.base);
          }
          args.push(
            '-scheme',
            buildOptions.scheme,
            '-configuration',
            buildOptions.buildConfiguration,
            '-xcconfig',
            `${this.config.cacheDir}/${Filenames.Config}`,
            '-quiet'
          );

          await execa('xcodebuild', args, {
            cwd: cwd,
          });
        },
      },
      {
        title: 'Zipping',
        task: async (ctx: any) => {
          const zipFile = await this.filesService.zipApp(ctx.buildDirectory);
          ctx.zipFile = zipFile;
        },
      },
      {
        title: 'Uploading',
        task: async (ctx: any) => {
          const appId = await this.apiService.uploadZipFile(ctx.zipFile);
          ctx.appId = appId;
        },
      },
      {
        title: 'Cleaning up',
        task: async (ctx: any) => {
          await del(
            [`${this.config.cacheDir}/${Filenames.Config}`, ctx.zipFile],
            { force: true, dryRun: true }
          );
        },
      },
    ]);

    tasks
      .run()
      .then(async (ctx: any) => {
        console.log(chalk.green.bold('App uploaded successfully!'));
        console.log(
          'You can view your app at ' +
            chalk.bgCyan.black('https://appshare.dev/app/' + ctx.appId)
        );
        await cli.open('http://localhost:3001/app/' + ctx.appId);
      })
      .catch((err: Error) => {
        console.error(err);
      });
    return;
  }
}
