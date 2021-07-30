import { Command, flags } from '@oclif/command';
import { cli } from 'cli-ux';
import chalk from 'chalk';
import { IConfig } from '@oclif/config';
import {
  StorageKey,
  StorageProvider,
  storageProvider,
} from '../storageProvider';
import { apiService, ApiService } from '../apiService';

export default class Login extends Command {
  static description =
    'Signs into your Appshare account to authorize future commands.';

  static flags = {
    help: flags.help({ char: 'h' }),
  };

  private storage: StorageProvider;
  private apiService: ApiService;

  constructor(argv: string[], config: IConfig) {
    super(argv, config);
    this.apiService = apiService();
    this.storage = storageProvider();
  }

  async run() {
    console.log(`Welcome to ${chalk.cyan.bold('appshare-cli')}.`);
    console.log(
      `Please sign in to your Appshare account using ${chalk.yellow.bold(
        'email'
      )} and ${chalk.yellow.bold('password')}.`
    );

    const email = await cli.prompt('Your email');
    const password = await cli.prompt('Your password', {
      type: 'hide',
    });
    cli.action.start('Signing in', '', { stdout: true });
    const refreshToken = await this.apiService.getRefreshToken(email, password);

    if (!!refreshToken) {
      cli.action.stop(chalk.green.bold('success!'));
      this.storage.set(refreshToken, StorageKey.RefreshToken);
    } else {
      cli.action.stop(chalk.red('error.'));
      console.log(
        'Make sure the entered email and password are correct and try again.'
      );
    }
  }
}
