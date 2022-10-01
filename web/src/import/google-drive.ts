function init_gapi() {
  return new Promise<void>(resolve => {
    gapi.load('client', async () => {
      await gapi.client.init({
        discoveryDocs: [
          'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
        ],
      });

      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: '122648074077-tslab3v89tpmm1u094ub1e5r6hneq4e4.apps.googleusercontent.com',
        prompt: '',
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        hint: 'mfroehli@umich.edu',
        callback(response) {
          resolve();
        },
      });

      tokenClient.requestAccessToken();
    });
  });
}

let init = false;
async function getDrive() {
  if (!init) {
    init = true;
    await init_gapi();
  }

  return gapi.client.drive;
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

    list.push(...rsp.result.files!);

    pageToken = rsp.result.nextPageToken!;
  } while (pageToken);

  return list;
}

export async function readFile(fileId: string) {
  const accessToken = gapi.auth.getToken().access_token;

  const xhr = new XMLHttpRequest();
  xhr.open('GET', `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&acknowledgeAbuse=true`);
  xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
  xhr.responseType = 'arraybuffer';

  return new Promise<ArrayBuffer>((resolve, reject) => {
    xhr.onload = function () {
      resolve(xhr.response);
    };

    xhr.onerror = function () {
      reject();
    };

    xhr.send();
  });
}
