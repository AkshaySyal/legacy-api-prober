import { Command } from 'commander';
import { probeCommand } from './commands/probe.js';
import { addCustomerCommand } from './commands/addCustomer.js';

const program = new Command();

program
  .name('legacy-api-prober')
  .description('LLM-driven legacy API probing tool')
  .version('1.0.0');

program
  .command('probe')
  .description('Run probe for all customers and actions and generate SDK')
  .action(async () => {
    await probeCommand();
  });

program
  .command('add-customer')
  .description('Add a new customer to data/customers.json')
  .requiredOption('--id <id>', 'Customer id')
  .requiredOption('--installedVersion <version>', 'Installed version (v1.1 or v1.2)')
  .requiredOption('--apiKey <key>', 'API key')
  .requiredOption('--clientToken <token>', 'Client token')
  .action(async (opts) => {
    await addCustomerCommand({
      id: String(opts.id),
      installedVersion: String(opts.installedVersion),
      apiKey: String(opts.apiKey),
      clientToken: String(opts.clientToken)
    });
  });

await program.parseAsync(process.argv);
