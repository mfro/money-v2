import { importData } from './import';
import { connect } from './mongo';
import express from 'express';

main();

async function main() {
  const mongo = await connect();

  await importData(mongo);

  const app = express();

  app.get('/data', async (req, rsp) => {
    const accounts = await mongo.accounts.find().toArray();
    const tags = await mongo.tags.find().toArray();
    const labels = await mongo.labels.find().toArray();
    const transactions = await mongo.transactions.find().toArray();

    const data = {
      accounts: accounts.map(o => ({
        description: o.description,
      })),

      tags: tags.map(o => ({
        name: o.name,
      })),

      labels: labels.map(o => ({
        description: o.description,
        tags: o.tags.map(id => tags.findIndex(t => t._id == id)),
      })),

      transactions: transactions.map(t => ({
        date: t.date,
        value: t.value,
        description: t.description,
        account: accounts.findIndex(o => o._id == t.accountId),
        label: t.labelId && labels.findIndex(l => l._id == t.labelId),
      })),
    }
  });

  app.listen(parseInt(process.argv[2]));
}
