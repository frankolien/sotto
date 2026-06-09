// Centralised runtime configuration, read once from the environment.

import { resolve } from 'node:path';

export interface AppConfig {
  port: number;
  ledgerJsonApi: string;
  sottoDar: string;
}

export const config: AppConfig = {
  port: Number(process.env.PORT ?? 8080),
  ledgerJsonApi: process.env.LEDGER_JSON_API ?? 'http://localhost:6864',
  sottoDar:
    process.env.SOTTO_DAR ??
    resolve(import.meta.dirname, '../../../daml/sotto/.daml/dist/sotto-0.1.0.dar'),
};
