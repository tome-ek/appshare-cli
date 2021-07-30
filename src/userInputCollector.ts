import { BuildOptions } from './xcodeConfigurationParser';
import inquirer = require('inquirer');

export type UserBuildOptions = {
  scheme: string;
  target: string;
  buildConfiguration: string;
};

export interface UserInputCollector {
  collectBuildOptions: (
    availableOptions: BuildOptions
  ) => Promise<UserBuildOptions>;
}

export const userInputCollector = (): UserInputCollector => {
  return {
    collectBuildOptions: availableOptions => {
      return inquirer.prompt<UserBuildOptions>(
        [
          {
            type: 'list',
            name: 'scheme',
            message: 'Select a scheme to build',
            default: 0,
            choices: availableOptions.schemes,
            pageSize: 10,
            when: () => {
              return availableOptions.schemes.length > 1;
            },
            askAnswered: true,
          },
          {
            type: 'list',
            name: 'target',
            message: 'Pick a target to build',
            default: 0,
            choices: availableOptions.targets,
            pageSize: 10,
            when: () => {
              return availableOptions.targets.length > 1;
            },
            askAnswered: true,
          },
          {
            type: 'list',
            name: 'buildConfiguration',
            message: 'Which build configuration should be used?',
            default: 0,
            choices: availableOptions.buildConfigurations,
            pageSize: 10,
            when: () => {
              return availableOptions.buildConfigurations.length > 1;
            },
            askAnswered: true,
          },
        ],
        {
          scheme: availableOptions.schemes[0],
          target: availableOptions.targets[0],
          buildConfiguration: availableOptions.buildConfigurations[0],
        }
      );
    },
  };
};
