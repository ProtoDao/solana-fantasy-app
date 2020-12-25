import React, { FunctionComponent, useEffect, useState } from 'react';
import { Card, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { PublicKey } from '@solana/web3.js';
import { Layout } from '../Layout';

export const Wallet: FunctionComponent<{}> = (props) => {
  const [balance, setBalance] = useState<number | null>(null);

  const updateBalance = async () => {
    if (window.wallet) {
      const balance = await window.connection.getBalance(window.wallet.publicKey);
      setBalance(balance);
    }
  };

  useEffect(() => {
    updateBalance().catch(console.log);
  }, []);

  const [, forceRerender] = useState({});
  const [privateKeyDisplay, setPrivateKeyDisplay] = useState<string | null>(null);

  const walletChangeHook = () => {
    forceRerender({});
  };

  if (!window.walletStatusChangeHooks) {
    window.walletStatusChangeHooks = { navbar: () => {}, walletPage: walletChangeHook };
  } else {
    window.walletStatusChangeHooks.walletPage = walletChangeHook;
  }

  const processLogout = () => {
    delete window.wallet;
    Object.entries(window.walletStatusChangeHooks).forEach((entries) => {
      try {
        entries[1]();
      } catch {}
    });
  };

  const showPrivateKey = () => {
    if (window.wallet) {
      try {
        const privateKey = window.wallet.privateKey;
        setPrivateKeyDisplay(privateKey);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const hidePrivateKey = () => {
    setPrivateKeyDisplay(null);
  };

  let [airdropSpinner, setAirdropSpinner] = useState<boolean>(false);

  return (
    <Layout heading="Wallet">
      <Card style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Card.Body>
          {window.wallet ? (
            <>
              <p>
                Public Key: <span className="monospace">{window.wallet?.publicKey.toBase58()}</span>
              </p>
              <p>
                Private Key:{' '}
                {privateKeyDisplay !== null ? (
                  <>
                    <span className="monospace">{privateKeyDisplay}</span>
                    <button onClick={hidePrivateKey} className="btn my-2">
                      Hide
                    </button>
                  </>
                ) : (
                  <button onClick={showPrivateKey} className="btn my-2">
                    Show
                  </button>
                )}
              </p>
              <p>
                Balance:{' '}
                {balance !== null ? (
                  <>
                    <span className="monospace">{balance / 10 ** 9}</span> SOL{' '}
                    <button
                      className="btn my-2"
                      disabled={airdropSpinner}
                      onClick={async () => {
                        setAirdropSpinner(true);
                        if (window.wallet) {
                          const pub = window.wallet.publicKey;
                          await window.connection.requestAirdrop(pub, 1 * 10 ** 9);
                          await new Promise((res) => setTimeout(res, 1000));
                          await updateBalance();
                        }
                        setAirdropSpinner(false);
                      }}
                    >
                      {airdropSpinner ? 'Requesting...' : 'Request AirDrop'}
                    </button>
                  </>
                ) : (
                  'Loading...'
                )}
              </p>
              <button onClick={processLogout} className="btn my-2">
                Logout
              </button>
            </>
          ) : (
            <>
              <Alert variant="danger">Wallet is not loaded</Alert>
              <p>
                You can load your wallet from <Link to="/wallet/import">Import Wallet</Link>
              </p>
            </>
          )}
        </Card.Body>
      </Card>
    </Layout>
  );
};
