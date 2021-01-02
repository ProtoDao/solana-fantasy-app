import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './global';
import './clojured-wallet';
import { Connection, PublicKey } from '@solana/web3.js';
import { SFS } from './sdk/sfs';
import { PrivateKeyWallet } from './clojured-wallet';
import { Buffer } from 'buffer';
import { Root } from './sdk/state';
import axios, { AxiosResponse } from 'axios';

window.Buffer = Buffer;
window.sfsProgramId = new PublicKey('Dp4skonbWvN4vcGn8brhTZjCq7dPwTSThdufpkiFtdYC');
window.sfsRoot = new PublicKey('3RWZuNZ5vrHDiN8n6K3ZsHdJyseswcyqxXAg166cbibD');
window.connection = new Connection('https://devnet.solana.com', 'recent');
const bankPromise = PublicKey.findProgramAddress([Buffer.from([0])], window.sfsProgramId);
window.sfsSDK = async () =>
  new SFS(window.connection, window.sfsRoot, window.sfsProgramId, (await bankPromise)[0]);

let root_cache: { root: Root; expiry: number } | null = null;
let root_new_fetching_promise: Promise<Root> | null = null;
window.getCachedRootInfo = async (forceUpdate?: boolean): Promise<Root> => {
  const sfs = await window.sfsSDK();
  if (root_cache === null || forceUpdate || Date.now() > root_cache.expiry) {
    if (root_new_fetching_promise === null) {
      root_new_fetching_promise = sfs.getRootInfo().then((root) => {
        root_cache = { root, expiry: Date.now() + 10000 };
        root_new_fetching_promise = null;
        return root;
      });
    }

    if (root_cache === null || forceUpdate) {
      const prom = await root_new_fetching_promise;
      // @ts-ignore When root_new_fetching_promise is resolved, it sets root_cache
      return root_cache.root;
    }
  }

  return root_cache.root;
};

if (process.env.NODE_ENV !== 'production') {
  window.wallet = new PrivateKeyWallet(
    '0xebda988ca9dfd8f5094ffc87c5fdf13e72413af1a92bc73d67133ce5f37cf4af3c09fd5042247925005dd7dd5f2d10d0a826d907e38336e4984b34588a9af74b',
    window.connection
  );
}
try {
  const secret = localStorage.getItem('sfs-secret');
  if (secret) {
    window.wallet = new PrivateKeyWallet(secret, window.connection);
  }
} catch {}
window.getCachedRootInfo();

interface PlayerResp {
  PlayerID: number; // 19801,
  Name: string; // 'Josh Allen',
  Position: string; // 'QB',
  AverageDraftPosition: number; // 108.9,
}

let playersResp: PlayerResp[] | null = null;
window.getCachedPlayers = async () => {
  if (playersResp) {
    return playersResp;
  }
  const response: AxiosResponse<PlayerResp[]> = await axios.get(
    'https://api.sportsdata.io/v3/nfl/stats/json/FantasyPlayers?key=014d8886bd8f40dfabc9f75bc0451a0d'
  );
  playersResp = response.data;
  return playersResp;
};
// window.getCachedPlayers();

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
