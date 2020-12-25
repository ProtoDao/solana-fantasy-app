import React, { useEffect, useState } from 'react';
import { Card } from 'react-bootstrap';
import { Layout } from '../Layout';
import { wait } from '../../utils';
import { calculateScore } from './calculate-score-api';

interface SdkScore {
  playerId: number;
  playerScore: number;
}

export function Admin() {
  const [lines, setLines] = useState<{ text: string; color: string }[]>([]);
  function pushLine(line: { text: string; color: string }) {
    setLines((l) => [...l, line]);
  }
  function popLine() {
    setLines((l) => l.slice(0, l.length - 1));
  }
  function reset() {
    setLines([
      {
        text: 'Press below button to load the script.',
        color: 'white',
      },
    ]);
  }
  useEffect(() => {
    reset();
  }, []);

  const [spinner, setSpinner] = useState<boolean>(false);

  const incrementWeekAndSubmitScores = async () => {
    reset();
    popLine();
    pushLine({
      text: 'Loading the script...',
      color: 'white',
    });

    await wait(1000);

    try {
      if (!window.wallet) {
        throw new Error('Wallet is not loaded');
      }
      const sdk = await window.sfsSDK();

      pushLine({
        text: 'Script Loaded!\n',
        color: 'white',
      });
      pushLine({
        text: '', // empty line
        color: 'white',
      });

      {
        pushLine({
          text: 'Initial Week: Loading...',
          color: 'white',
        });
        const root = await window.getCachedRootInfo(true);
        popLine();
        pushLine({
          text: `Initial Week: ${root.currentWeek + 1}`,
          color: 'white',
        });
      }

      await wait(700);
      pushLine({
        text: 'Requesting signature on Increment Week tx...',
        color: 'white',
      });

      await wait(1500);

      // await window.wallet.callback('Sign on Increment Week transaction?', (acc) => {
      //   // return wait(1500);
      // });
      pushLine({
        text: 'Signing on transaction and submitting...',
        color: 'white',
      });
      await sdk.incrementWeek(window.wallet);

      pushLine({
        text: 'Increment week tx was submitted!',
        color: 'lightgreen',
      });

      await wait(1000);
      {
        pushLine({
          text: 'Current Week: Loading...',
          color: 'white',
        });
        const root = await window.getCachedRootInfo(true);
        popLine();
        pushLine({
          text: `Current Week: ${root.currentWeek + 1}`,
          color: 'white',
        });
      }

      await wait(700);
      pushLine({
        text: '', // empty line
        color: 'white',
      });
      const root = await sdk.getRootInfo();
      pushLine({
        text: 'Calculating scores for Week ' + root.currentWeek,
        color: 'white',
      });

      // API call
      pushLine({
        text: 'Collecting players list from smart contract...',
        color: 'white',
      });
      const idArr = root.players.filter((p) => p.isInitialized).map((p) => p.externalId);
      popLine();
      pushLine({
        text: 'Collected players list from smart contract.',
        color: 'white',
      });
      const { scoresArr } = await calculateScore(idArr, root.currentWeek, pushLine, popLine);
      console.log('calculated scores', scoresArr);

      const scores: SdkScore[] = [];

      for (const [index, score] of scoresArr.entries()) {
        scores.push({
          playerId: index + 1,
          playerScore: score,
        });
        // console.log(`Score of player id ${index + 1}: ${score}`);
      }

      // API call end

      pushLine({
        text: 'Requesting signature on Update Scores tx...',
        color: 'white',
      });
      await wait(1500);

      pushLine({
        text: 'Signing on transaction and submitting...',
        color: 'white',
      });
      await sdk.updatePlayerScores(window.wallet, scores);

      pushLine({
        text: 'Update Player Scores tx was submitted!',
        color: 'lightgreen',
      });
    } catch (error) {
      console.error(error);
      pushLine({
        text: `${error.message}`,
        color: 'orangered',
      });
    }
  };

  return (
    <Layout heading="Admin Panel">
      <Card style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Card.Body>
          <div
            style={{
              fontFamily: 'monospace',
              backgroundColor: '#222e',
              borderRadius: '5px',
              textAlign: 'left',
            }}
            className="p-4"
          >
            <p style={{ color: 'white' }}>
              Solana Fantasy Sports v1.0.0
              <br />
              Copyright (c) 2020
            </p>
            {lines.map((line) =>
              line.text ? (
                <p className="mb-0" style={{ color: line.color }}>
                  {line.text}
                </p>
              ) : (
                <br />
              )
            )}
          </div>
          <button
            className="btn mt-4"
            disabled={spinner}
            onClick={() => {
              setSpinner(true);
              incrementWeekAndSubmitScores()
                .then(() => {
                  setSpinner(false);
                })
                .catch((err) => {
                  alert('Error:' + err?.message ?? err);
                  console.log(err);
                  setSpinner(false);
                });
            }}
          >
            {!spinner ? `Increment Week and Update Player Scores` : 'Working...'}
          </button>
        </Card.Body>
      </Card>
    </Layout>
  );
}
