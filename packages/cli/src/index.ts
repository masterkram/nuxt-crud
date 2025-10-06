import { Command } from 'commander';
import chalk from 'chalk';
import { makeModel } from './commands/makeModel.js';
import { makeDatabase } from './commands/makeDatabase.js';
import initCommand from './commands/init.js';
import { exec } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to run shell commands
const runCommand = (command: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Error executing command: ${command}\n${stderr}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
};

// Version comparison
const isNewerVersion = (current: string, latest: string) => {
    if (!current || !latest) return false;
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);

    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
        const currentPart = currentParts[i] || 0;
        const latestPart = latestParts[i] || 0;

        if (latestPart > currentPart) return true;
        if (latestPart < currentPart) return false;
    }
    return false;
}

const checkForUpdate = async () => {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const packageJsonPath = path.resolve(__dirname, '../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    const currentVersion = packageJson.version;
    const packageName = packageJson.name;

    console.log(chalk.blue('Checking for updates...'));

    const latestVersion = await runCommand(`npm view ${packageName} version`).catch(() => null);

    if (!latestVersion) {
        console.log(chalk.yellow('Could not check for updates (maybe you are offline).'));
        return;
    }

    if (isNewerVersion(currentVersion, latestVersion)) {
      console.log(chalk.yellow(`A new version (${latestVersion}) of ${packageName} is available.`));
      console.log(chalk.blue('Installing the latest version...'));
      
      await runCommand(`pnpm add -g ${packageName}@latest`);
      
      console.log(chalk.green('✅ Update complete! Please run your command again.'));
      process.exit(0);
    } else {
        console.log(chalk.green('You are on the latest version.'));
    }
  } catch (error) {
    console.error(chalk.red(`❌ Error checking for updates: ${error instanceof Error ? error.message : 'Unknown error'}`));
  }
};

const program = new Command();

program
  .name('nuxt-crud')
  .description('CLI tool for generating CRUD backend files in Nuxt 3 projects')
  .version(JSON.parse(readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../package.json'), 'utf-8')).version)

program
  .command('make:model')
  .description('Generate a new Drizzle model/schema')
  .argument('<name>', 'Model name (e.g., User, Product)')
  .option('-f, --fields <fields>', 'Model fields (e.g., "name:string,email:string,age:number")')
  .action(async (name: string, options: { fields?: string }) => {
    try {
      await makeModel(name, options.fields);
      console.log(chalk.green(`✅ Model ${name} created successfully!`));
    } catch (error) {
      console.error(chalk.red(`❌ Error creating model: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  });

program
  .command('make:database')
  .description('Create Drizzle ORM database file')
  .action(async () => {
    try {
      await makeDatabase();
      console.log(chalk.green('✅ Drizzle ORM database created!'));
    } catch (error) {
      console.error(chalk.red(`❌ Error creating database: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize database and create a default User model')
  .action(async () => {
    try {
      await initCommand.handler();
      console.log(chalk.green('✅ Project initialized: database and User model created.'));
    } catch (error) {
      console.error(chalk.red(`❌ Error initializing project: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  });

const main = async () => {
    await checkForUpdate();
    program.parse(process.argv);
};

main();
