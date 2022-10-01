import PDFParser, { PDF } from 'pdf2json';

import { assert } from '@mfro/ts-common/assert';
import { Import, Mongo, Transaction } from '@/mongo';

import { readDir, readFile } from './google-drive';
import { parsePNCDebitStatement } from './pnc/debit';
import { parsePNCCreditStatement } from './pnc/credit';
import { ObjectId } from 'mongodb';

async function parsePDF(src: Buffer) {
  return new Promise<PDF>(resolve => {
    const parser = new PDFParser();

    parser.on("pdfParser_dataReady", data => {
      resolve(data);
    });

    parser.parseBuffer(src);
  });
}

type PDFParseFn = (document: PDF, year: number) => Omit<Transaction, 'accountId'>[]
async function loadGoogleDrivePDFDirectory(mongo: Mongo, accountId: ObjectId, id: string, parse: PDFParseFn) {
  const files = await readDir(id);

  for (const file of files) {
    const existing = await mongo.imports.findOne({ file_id: file.id });
    if (existing) continue;

    console.log(`load statement ${file.name}`);

    const content = await readFile(file.id!);
    const document = await parsePDF(content);

    const match = /Statement_(\w+)_(\d+)_(\d+)\.pdf/.exec(file.name!);
    assert(match != null, 'match');

    const year = parseInt(match[3]);

    const found = parse(document, year);

    await mongo.session.withTransaction(async session => {
      const info = await mongo.imports.insertOne({
        accountId,
        id: file.name!,
      });

      await mongo.transactions.insertMany(found.map(t => ({
        ...t,
        importId: info.insertedId,
        accountId,
      })));
    });
  }
}

export async function importData(mongo: Mongo) {
  {
    await loadGoogleDrivePDFDirectory(
      mongo,
      new ObjectId('63322c55494b4880be1f9da8'),
      '1j0Psbc39iudkTpNIBHKahPCXGzs1WD_A',
      parsePNCCreditStatement
    );
  }

  {
    await loadGoogleDrivePDFDirectory(
      mongo,
      new ObjectId('63322d06494b4880be1f9da9'),
      '185L3i1gzhqwTbKDdgBaoawwQRZjcl1Ir',
      parsePNCDebitStatement
    );
  }
}
