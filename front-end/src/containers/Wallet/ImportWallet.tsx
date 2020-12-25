import React, { FunctionComponent, useState } from 'react';
import { Alert, Card, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { Layout } from '../Layout';

import { hexlify, isHexString } from '@ethersproject/bytes';
import { PrivateKeyWallet, SolletWallet } from '../../clojured-wallet';

export const ImportWallet: FunctionComponent<{}> = (props) => {
  let [privateKeyInput, setPrivateKeyInput] = useState<string>('');
  let [display, setDisplay] = useState<{ message: string; variant: string } | null>(null);

  const importWallet = () => {
    try {
      setDisplay({
        message: 'Please wait importing wallet...',
        variant: 'warning',
      });
      const wallet = new PrivateKeyWallet(privateKeyInput, window.connection);
      window.wallet = wallet;
      // try {
      //   window.wallet.callback(
      //     'Wallet Imported! Do you want to locally cache your wallet?',
      //     (acc) => {
      //       try {
      //         localStorage.setItem('sfs-secret', hexlify(acc.secretKey));
      //       } catch {}
      //     }
      //   );
      // } catch {}
      setDisplay({
        message: 'Wallet imported successfully!',
        variant: 'success',
      });

      Object.entries(window.walletStatusChangeHooks).forEach((entries) => {
        try {
          entries[1]();
        } catch {}
      });
    } catch (error) {
      setDisplay({
        message: `Error: ${error.message}`,
        variant: 'danger',
      });
    }
  };

  return (
    <Layout heading="Import Wallet">
      <Card style={{ maxWidth: '400px', margin: '0 auto' }}>
        <Card.Body>
          Solana Fantasy Sports Wallet keeps your keys in your browser until you use this app and
          they are erased from the browser if you closed the tab or even refreshed the page.
          <Form.Control
            className="align-items-center my-2"
            onChange={(event) => setPrivateKeyInput(event.target.value)}
            value={privateKeyInput}
            type="text"
            placeholder="Enter your wallet's private key"
            autoComplete="off"
            isInvalid={
              privateKeyInput !== '' &&
              (!isHexString(privateKeyInput) || privateKeyInput.length !== 130)
            }
          />
          {display !== null ? (
            <Alert className="my-2" variant={display.variant}>
              {display.message}
            </Alert>
          ) : null}
          {display?.variant !== 'success' ? (
            <>
              <button onClick={importWallet} className="btn my-2">
                Import Wallet
              </button>
              <span className="small mt-2 mb-0 display-block">
                <Link to="/wallet/create">But I don't have a wallet.</Link>
              </span>
            </>
          ) : (
            <Link to="/wallet">
              <span className="btn mb-2">Go to my wallet</span>
            </Link>
          )}
        </Card.Body>
      </Card>
    </Layout>
  );
};
