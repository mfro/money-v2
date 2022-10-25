import { Context } from 'common';

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

import { watch } from '@vue/runtime-core'
import { WebSocket } from 'ws';
import { Configuration, CountryCode, PlaidApi, PlaidEnvironments, Products, TransactionsSyncRequest } from 'plaid';
import { assert } from '@mfro/assert'
import { createWebSocketEngine } from '@mfro/sync-vue'

Object.assign(global, {
  localStorage: {
    getItem: () => undefined,
    setItem: () => undefined,
  },
  WebSocket: WebSocket,
});

const client = new PlaidApi(new Configuration({
  basePath: PlaidEnvironments.development,
  baseOptions: {
    headers: {
      'PLAID-SECRET': process.env['PLAID-SECRET'],
      'PLAID-CLIENT-ID': process.env['PLAID-CLIENT-ID'],
    },
  },
}));

const initialized = new Set<string>();

const app = express();

app.use(bodyParser.json());
app.use(cors({
  origin: ['http://localhost:8080', 'https://mfro.me'],
}));

app.post('/initialize', async (request, response) => {
  const { id } = request.body;

  if (!initialized.has(id)) {
    initialized.add(id);
    const { data } = await createWebSocketEngine<Context>({
      host: 'wss://api.mfro.me/sync',
      id: id,
    });

    watch(() => data.plaid.token, async token => {
      console.log(JSON.stringify(token));

      if (token.type == 'none') {
        console.log('create link token');

        const response = await client.linkTokenCreate({
          client_name: 'mfro',
          language: 'en',
          country_codes: [CountryCode.Us],
          user: {
            client_user_id: '5179023',
          },
          products: [
            Products.Transactions,
          ],
        });

        data.plaid.token = {
          type: 'link',
          value: response.data.link_token,
        };
      }

      else if (token.type == 'public') {
        console.log('exchange public token');

        const response = await client.itemPublicTokenExchange({
          public_token: token.value,
        });

        data.plaid.token = {
          type: 'access',
          value: response.data.access_token,
        };
      }

      else if (token.type == 'access') {
        {
          const response = await client.itemGet({
            access_token: token.value,
          })
          console.log(JSON.stringify(response.data, null, '  '));
        }
        {
          const response = await client.accountsGet({
            access_token: token.value,
          })
          console.log(JSON.stringify(response.data, null, '  '));
        }

        sync(data);
      }
    }, { immediate: true });
  }

  response.status(200);
  response.end();
});

app.listen(parseInt(process.argv[2]));

async function sync(data: Context) {
  assert(data.plaid.token.type == 'access', 'valid plaid state');

  const request: TransactionsSyncRequest = {
    access_token: data.plaid.token.value,
  };

  if (data.plaid.transactions_sync_cursor) {
    request.cursor = data.plaid.transactions_sync_cursor;
  }

  const response = await client.transactionsSync(request);

  console.log(JSON.stringify(response.data, null, '  '));

  data.plaid.transactions_sync_cursor = response.data.next_cursor;

  for (const t of response.data.added) {
    data.plaid.transactions.set(t.transaction_id, t);
  }

  for (const t of response.data.modified) {
    data.plaid.transactions.set(t.transaction_id, t);
  }

  for (const t of response.data.removed) {
    assert(t.transaction_id !== undefined, 'removed transaction');
    data.plaid.transactions.remove(t.transaction_id);
  }

  if (response.data.has_more) {
    sync(data);
  }
}
