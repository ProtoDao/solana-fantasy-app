import React, { useState } from 'react';
import { Button, Card, Form } from 'react-bootstrap';
import { useHistory } from 'react-router-dom';
import { Layout } from '../Layout';

export function CreateLeague() {
  const history = useHistory();

  const [spinner, setSpinner] = useState<boolean>(false);
  const [leagueNameInput, setLeagueNameInput] = useState<string>('');
  const [leagueEntryCostInput, setLeagueEntryCostInput] = useState<string>('');
  const [leagueSizeInput, setLeagueSizeInput] = useState<string>('');
  const [teamNameInput, setTeamNameInput] = useState<string>('');

  const createLeague = async () => {
    if (!window.wallet) {
      throw new Error('Wallet is not loaded');
    }
    const sdk = await window.sfsSDK();

    const bid = +leagueEntryCostInput;
    if (isNaN(bid)) {
      throw new Error('Bid value is NaN');
    }
    const leagueSize = +leagueSizeInput;
    if (isNaN(leagueSize)) {
      throw new Error('leagueSize value is NaN');
    }

    // const resp = await window.wallet.callback('Sign on Create League transaction?', (acc) => {
    //   return sdk.createLeague(acc, leagueNameInput, bid * 10 ** 9, leagueSize, teamNameInput);
    // });
    const resp = await sdk.createLeague(
      window.wallet,
      leagueNameInput,
      bid * 10 ** 9,
      leagueSize,
      teamNameInput
    );

    console.log({ resp });
  };

  return (
    <Layout heading="Create a League">
      <Card style={{ maxWidth: '400px', margin: '0 auto' }}>
        <Card.Body>
          <Form.Control
            disabled={spinner}
            className="align-items-center"
            onChange={(event) => setLeagueNameInput(event.target.value)}
            value={leagueNameInput}
            type="text"
            placeholder="Enter League Name"
            autoComplete="off"
            // isInvalid={}
          />

          <Form.Control
            disabled={spinner}
            className="align-items-center my-4"
            onChange={(event) => setLeagueSizeInput(event.target.value)}
            value={leagueSizeInput}
            type="text"
            placeholder="Enter League Size"
            autoComplete="off"
            // isInvalid={}
          />

          <Form.Control
            disabled={spinner}
            className="align-items-center my-4"
            onChange={(event) => setLeagueEntryCostInput(event.target.value)}
            value={leagueEntryCostInput}
            type="text"
            placeholder="Enter League Entry Cost"
            autoComplete="off"
            // isInvalid={}
          />

          <Form.Control
            disabled={spinner}
            className="align-items-center"
            onChange={(event) => setTeamNameInput(event.target.value)}
            value={teamNameInput}
            type="text"
            placeholder="Enter your team name"
            autoComplete="off"
            // isInvalid={}
          />

          {/* <Button>Submit</Button> */}
          <button
            className="btn mt-4"
            disabled={spinner}
            onClick={() => {
              setSpinner(true);
              createLeague()
                .then(() => {
                  setSpinner(false);
                  history.push(`/leagues?forceRootUpdate=true`);
                })
                .catch((err) => {
                  alert('Error:' + err?.message ?? err);
                  console.log(err);
                  setSpinner(false);
                });
            }}
          >
            {!spinner
              ? `Create League and Join${
                  leagueEntryCostInput ? ` by paying ${leagueEntryCostInput} SOL` : ''
                }`
              : 'Creating...'}
          </button>
        </Card.Body>
      </Card>
    </Layout>
  );
}
