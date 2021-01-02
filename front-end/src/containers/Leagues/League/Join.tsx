import React, { FunctionComponent, useEffect, useState } from 'react';
import { Alert, Card, Form, InputGroup, Table } from 'react-bootstrap';
import { RouteComponentProps, useHistory } from 'react-router-dom';
import { MatchParams } from './Forwarder';
import { Layout } from '../../Layout';
import { isUserAlreadyJoined } from '../../../utils';
import { UserState } from '../../../sdk/state';

export const JoinLeague: FunctionComponent<RouteComponentProps<MatchParams>> = (props) => {
  const leagueIndex = +props.match.params.index;
  const history = useHistory();

  const [spinner, setSpinner] = useState<boolean>(false);
  const [teamNameInput, setTeamNameInput] = useState<string>('');
  const [feesInput, setFeesInput] = useState<string>('50');
  const [leagueName, setLeagueName] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      if (window.wallet) {
        const _isJoined = await isUserAlreadyJoined(
          window.wallet.publicKey.toBase58(),
          leagueIndex
        );
        setIsJoined(_isJoined);
      }
    })().catch(console.error);
  }, []);

  useEffect(() => {
    (async () => {
      const root = await window.getCachedRootInfo();
      /** @ts-ignore */
      setFeesInput(String(root.leagues[leagueIndex].bid.toNumber() / 10 ** 9));
      setLeagueName(root.leagues[leagueIndex].name);
    })().catch(console.error);
  }, []);

  const joinLeague = async () => {
    if (!window.wallet) {
      throw new Error('Wallet not loaded');
    }
    const sdk = await window.sfsSDK();

    const resp = await sdk.joinLeague(window.wallet, leagueIndex, teamNameInput);
    console.log({ resp });
  };

  const [joinedTeams, setJoinedTeams] = useState<UserState[] | null>(null);
  const [pendingJoins, setPendingJoins] = useState<number | null>(null);
  useEffect(() => {
    (async () => {
      const root = await window.getCachedRootInfo();
      const league = root.leagues[leagueIndex];
      setJoinedTeams(league.userStates.filter((u) => u.isInitialized));
      setPendingJoins(league.usersLimit - league.userStateCount);
    })().catch(console.error);
  }, []);

  return (
    <Layout removeTopMargin heading="Join League">
      {!window.wallet ? (
        <Alert variant="danger">
          Wallet is not loaded. If you just refreshed the page, then your wallet was flushed from
          memory when you refreshed the page. When you import your wallet, you can choose to cache
          it locally to prevent this behaviour.
        </Alert>
      ) : (
        <>
          {isJoined ? (
            <Alert variant="danger">Already Joined</Alert>
          ) : (
            <Card style={{ maxWidth: '400px', margin: '0 auto' }}>
              <p className="mt-2 mb-0">
                Join the{' '}
                <strong>{leagueName ? <>{leagueName} league</> : <>leage {leagueIndex}</>}</strong>{' '}
                by creating a team
              </p>
              <Card.Body>
                <Form.Control
                  disabled={spinner}
                  className="align-items-center"
                  onChange={(event) => setTeamNameInput(event.target.value)}
                  value={teamNameInput}
                  type="text"
                  placeholder="Enter Team Name"
                  autoComplete="off"
                  // isInvalid={}
                />

                <InputGroup className="my-4">
                  <Form.Control
                    disabled={spinner}
                    className="align-items-center"
                    onChange={(event) => setFeesInput(event.target.value)}
                    value={feesInput}
                    type="text"
                    placeholder="Enter fees"
                    autoComplete="off"
                    isInvalid={isNaN(+feesInput)}
                  />
                  <InputGroup.Append>
                    <InputGroup.Text id="basic-addon2">SOL</InputGroup.Text>
                  </InputGroup.Append>
                </InputGroup>

                <button
                  disabled={spinner}
                  onClick={() => {
                    setSpinner(true);
                    joinLeague()
                      .then(() => {
                        setSpinner(false);
                        history.push(`/leagues/${leagueIndex}/draft-selection`);
                      })
                      .catch((err) => {
                        alert('Error:' + err?.message ?? err);
                        console.log(err);
                        setSpinner(false);
                      });
                  }}
                  className="btn mt-4"
                >
                  {spinner ? 'Joining...' : <>Join by paying {feesInput} SOL</>}
                </button>
              </Card.Body>
            </Card>
          )}
        </>
      )}

      {joinedTeams !== null ? (
        <div className="mt-4">
          <h3>Joined users</h3>
          <Table responsive>
            <thead>
              <tr>
                <th>User Public Key</th>
                <th>Team Name</th>
              </tr>
            </thead>
            <tbody>
              {joinedTeams.map((team) => (
                <tr>
                  <td>{team.pubKey.toBase58()}</td>
                  <td>{team.teamName}</td>
                </tr>
              ))}
            </tbody>
          </Table>

          {pendingJoins !== null ? (
            pendingJoins !== 0 ? (
              <p>
                More {pendingJoins} join{pendingJoins > 1 ? 's are' : ' is'} pending.
              </p>
            ) : (
              <p>The league is full.</p>
            )
          ) : null}
        </div>
      ) : null}
    </Layout>
  );
};
