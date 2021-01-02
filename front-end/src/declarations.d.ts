declare module '@project-serum/sol-wallet-adapter' {
  import EventEmitter from 'eventemitter3';
  import { PublicKey, Transaction } from '@solana/web3.js';

  export default class Wallet {
    constructor(providerUrl: string, network: string);
    publicKey: PublicKey;
    connected: boolean;
    autoApprove: boolean;
    connect: () => Promise<void>;
    disconnect: () => void;
    on: (type: 'connect', callback: (_publicKey: PublicKey) => void) => void;
    signTransaction: (transaction: Transaction) => Promise<Transaction>;
    signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
    _sendRequest: (method: string, params: any) => Promise<any>;
  }
}
