import {
  Account,
  PublicKey,
  Transaction,
  Connection,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { arrayify, hexlify, isHexString } from '@ethersproject/bytes';
import SolletWalletAdapter from '@project-serum/sol-wallet-adapter';

export interface ClojuredWallet {
  publicKey: PublicKey;
  privateKey: string;
  ready: Promise<true>;
  sendAndConfirmTx(description: string, transaction: Transaction): Promise<string>;
}

export class PrivateKeyWallet implements ClojuredWallet {
  private _account: Account;
  private _connection: Connection;

  constructor(secretKey: string, connection: Connection) {
    let _secretKey: Uint8Array | undefined;
    if (typeof secretKey === 'string') {
      if (!isHexString(secretKey)) {
        throw new Error('Private key should be a hex string');
      }
      if (secretKey.length !== 130) {
        throw new Error('Private key should be a 64 bytes hex string');
      }
      _secretKey = arrayify(secretKey);
    }
    this._account = new Account(_secretKey);
    this._connection = connection;
  }

  get publicKey() {
    return this._account.publicKey;
  }

  get privateKey() {
    if (window.confirm('Export private key?')) {
      return hexlify(this._account.secretKey);
    } else {
      throw new Error('User denied signature');
    }
  }

  get ready() {
    return new Promise((res) => res(true)) as Promise<true>;
  }

  sendAndConfirmTx(description: string, transaction: Transaction) {
    if (window.confirm(description)) {
      return sendAndConfirmTransaction(this._connection, transaction, [this._account], {
        skipPreflight: false,
        commitment: 'recent',
        preflightCommitment: 'recent',
      });
    } else {
      throw new Error('User denied signature');
    }
  }
}

export class SolletWallet implements ClojuredWallet {
  private _wallet: SolletWalletAdapter;
  private _connection: Connection;
  publicKey: PublicKey = new PublicKey(0); // initializing with null public key until ready promise is resolved
  ready: Promise<true>;

  constructor(connection: Connection) {
    this._wallet = new SolletWalletAdapter(
      'https://www.sollet.io',
      'https://solana-api.projectserum.com'
    );
    this.ready = new Promise((res) => {
      this._wallet.on('connect', (_publicKey) => {
        // res(_publicKey);
        this.publicKey = _publicKey;
        res(true);
      });
    });
    this._connection = connection;
    this._wallet.connect();
  }

  get privateKey() {
    alert('Private key is locked inside Sollet, cannot export');
    return 'Not supported';
  }

  async sendAndConfirmTx(description: string, transaction: Transaction) {
    const signedTx = await this._wallet.signTransaction(transaction);
    return await this._connection.sendTransaction(signedTx, []);
  }
}

// export function CreateClojuredWallet(secretKey?: string): ClojuredWallet {
//   let _secretKey: Uint8Array | undefined;
//   if (typeof secretKey === 'string') {
//     if (!isHexString(secretKey)) {
//       throw new Error('Private key should be a hex string');
//     }
//     if (secretKey.length !== 130) {
//       throw new Error('Private key should be a 64 bytes hex string');
//     }
//     _secretKey = arrayify(secretKey);
//   }
//   const account = new Account(_secretKey);

//   return {
//     get publicKey() {
//       return account.publicKey.toBase58();
//     },
//     get privateKey() {
//       return this.callback('Do you want to export private key?', handleExportPrivateKey);
//     },
//     callback(description: string, fn: (account?: Account, wallet?: Wallet) => any): any {
//       if (window.confirm(description)) {
//         return fn(account, undefined);
//       } else {
//         throw new Error('User denied signature');
//       }
//     },
//     get ready() {
//       return new Promise((res) => res(true)) as Promise<true>;
//     },
//   };
// }

// export function CreateSolletWallet(): ClojuredWallet {
//   const wallet = new Wallet('https://www.sollet.io', 'https://solana-api.projectserum.com');
//   let publicKey: PublicKey | undefined;
//   const publicKeyPromise = new Promise((res) => {
//     wallet.on('connect', (_publicKey) => {
//       res(_publicKey);
//       publicKey = _publicKey;
//     });
//   });
//   wallet.connect();

//   return {
//     get publicKey() {
//       return publicKey?.toBase58() ?? 'Loading...';
//     },
//     get privateKey() {
//       return this.callback('Do you want to export private key?', handleExportPrivateKey);
//     },
//     callback(description: string, fn: (account?: Account, wallet?: Wallet) => any): any {
//       if (window.confirm(description)) {
//         return fn(undefined, wallet);
//       } else {
//         throw new Error('User denied signature');
//       }
//     },
//     get ready() {
//       return publicKeyPromise.then(() => true) as Promise<true>;
//     },
//   };
// }

// // @ts-ignore
// window.CreateClojuredWallet = CreateClojuredWallet;
// // @ts-ignore
// window.CreateSolletWallet = CreateSolletWallet;
