import { createApp } from './app.ts';
import { config } from './config/index.ts';
import { LedgerController } from './controllers/ledger.controller.ts';
import { CantonService } from './services/canton.service.ts';
import { LedgerService } from './services/ledger.service.ts';

async function main(): Promise<void> {
  const canton = new CantonService(config.ledgerJsonApi);
  const ledger = new LedgerService(canton);

  console.log(`Bootstrapping Sotto on Canton (${config.ledgerJsonApi})…`);
  await ledger.init(config.sottoDar);
  console.log('Ledger ready — DAR uploaded, parties allocated, mandate established.');

  const app = createApp(new LedgerController(ledger));
  app.listen(config.port, () => console.log(`Sotto backend on http://localhost:${config.port}`));
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
