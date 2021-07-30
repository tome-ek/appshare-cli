import fs = require('fs');
import { StorageKey, storageProvider } from './storageProvider';
import FormData = require('form-data');
import fetch from 'node-fetch';

export interface ApiService {
  uploadZipFile: (zipFile: string) => Promise<string>;
  getRefreshToken: (email: string, password: string) => Promise<string>;
}

export const apiService = (): ApiService => {
  const ApiUrl = 'http://localhost:3000';

  const storage = storageProvider();

  const authorizationHeader = (idToken: string) => {
    return {
      Authorization: 'Bearer ' + idToken,
    };
  };

  const fetchIdToken = async () => {
    const { idToken } = await fetch(`${ApiUrl}/accounts/id-tokens`, {
      method: 'POST',
      body: JSON.stringify({
        refreshToken: storage.get(StorageKey.RefreshToken),
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(r => r.json());
    return idToken;
  };

  const fetchUserId = async (idToken: string) => {
    const { id } = await fetch(`${ApiUrl}/users/me`, {
      headers: authorizationHeader(idToken),
    }).then(response => response.json());
    return id;
  };

  return {
    uploadZipFile: async zipFile => {
      const idToken = await fetchIdToken();
      const userId = await fetchUserId(idToken);

      const form = new FormData();
      form.append('app', fs.createReadStream(zipFile));

      const options = {
        method: 'POST',
        body: form,
        headers: {
          ...authorizationHeader(idToken),
          ...form.getHeaders(),
        },
      };

      const { id: appId } = await fetch(
        `${ApiUrl}/users/${userId}/apps`,
        options
      ).then(response => response.json());

      return appId;
    },
    getRefreshToken: async (email, password) => {
      const { refreshToken } = await fetch(
        `${ApiUrl}/accounts/refresh-tokens`,
        {
          method: 'POST',
          body: JSON.stringify({
            email: email,
            password: password,
            returnSecureToken: true,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      ).then(res => res.json());
      return refreshToken;
    },
  };
};
