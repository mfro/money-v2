import * as fs from 'fs/promises';
import { Readable } from 'stream';
import { assert } from '@mfro/ts-common/assert';

import { authenticate } from '@google-cloud/local-auth';
import { AuthClient } from 'google-auth-library';
import { drive_v3, google } from 'googleapis';

const keyfilePath = './client-secret.json';
const credentialsPath = './credentials.json';

async function loadCredentials() {
  try {
    const content = await fs.readFile(credentialsPath, 'utf8');
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function saveCredentials(client: AuthClient) {
  const content = await fs.readFile(keyfilePath, 'utf8');
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });

  await fs.writeFile(credentialsPath, payload);
}

async function getNewCredentials() {
  const auth = await authenticate({
    keyfilePath,
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
    ],
  });

  await saveCredentials(auth);

  return auth;
}

async function stream2buffer(stream: Readable): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', err => reject(`error converting stream - ${err}`));
  });
}

let drive: drive_v3.Drive | undefined;

async function getDrive() {
  if (!drive) {
    const auth = await loadCredentials() ?? await getNewCredentials();
    google.options({ auth });

    drive = google.drive('v3');
  }

  return drive;
}

export async function readDir(dirId: string) {
  const drive = await getDrive();

  const list = [];

  let pageToken: string | undefined;
  do {
    const rsp = await drive.files.list({
      q: `'${dirId}' in parents`,
      pageSize: 1000,
      pageToken,
    });

    list.push(...rsp.data.files!);

    pageToken = rsp.data.nextPageToken!;
  } while (pageToken);

  return list;
}

export async function readFile(fileId: string) {
  const drive = await getDrive();

  const stream = await drive.files.get({
    fileId,
    alt: 'media',
    acknowledgeAbuse: true,
  }, {
    responseType: 'stream',
  });

  return await stream2buffer(stream.data);
}
