import React, { FunctionComponent, useEffect, useState } from 'react';
import { Container, Row, Col, Card, Form, Table, CardDeck } from 'react-bootstrap';
import { RouteComponentProps } from 'react-router-dom';
import { SFS } from '../../../sdk/sfs';
import { GAMES_COUNT, League, Position, Root, UserState } from '../../../sdk/state';
import { Layout } from '../../Layout';
import { MatchParams } from './Forwarder';

type Position_ = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'D/ST';

interface Player_ {
  externalId: number;
  position: Position_;
  choosenByTeamIndex: number;
}

export const Scoreboard: FunctionComponent<RouteComponentProps<MatchParams>> = (props) => {
  const leagueIndex = +props.match.params.index;

  const [root, setRoot] = useState<Root | null>(null);
  const refreshRoot = async (forceUpdate?: boolean) => {
    const _root = await window.getCachedRootInfo(forceUpdate);
    setRoot(_root);
  };
  useEffect(() => {
    const intervalId = setInterval(() => {
      refreshRoot(false).catch(console.error);
    }, 3000);
    refreshRoot(false).catch(console.error);
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const [league, setLeague] = useState<League | null>(null);
  useEffect(() => {
    if (root === null) return;

    const _league = root.leagues[leagueIndex];

    setLeague(_league);
  }, [root]);

  const [winners, setWinners] = useState<
    | {
        userId: number;
        userState: UserState;
        score: number;
      }[]
    | null
  >(null);
  useEffect(() => {
    if (root === null) return;
    const winners = root.currentWeek == GAMES_COUNT + 1 ? SFS.getWinners(root!, leagueIndex) : null;
    setWinners(winners);
  }, [root]);

  const [players, setPlayers] = useState<Player_[] | null>(null);
  useEffect(() => {
    if (root === null) return;

    const _players = root.players
      .filter((p) => p.isInitialized)
      .map((p, i) => {
        let position: Position_;
        switch (p.position) {
          case Position.RB:
            position = 'RB';
            break;
          case Position.WR:
            position = 'WR';
            break;
          case Position.QB:
            position = 'QB';
            break;
          case Position.TE:
            position = 'TE';
            break;
          case Position.K:
            position = 'K';
            break;
          case Position.DEF:
            position = 'D/ST';
            break;
          default:
            throw new Error(`Position from API not recognized: ${p.position}`);
        }

        const choosenByTeamIndex = root.leagues[leagueIndex].userStates.findIndex((usr) => {
          return usr.userPlayers.includes(i + 1); // id and index (+ 1) thing
        });

        return {
          externalId: p.externalId,
          position,
          choosenByTeamIndex,
        };
      });
    setPlayers(_players);
  }, [root]);

  const [playersResp, setPlayersResp] = useState<
    {
      PlayerID: number;
      Name: string;
      Position: string;
      AverageDraftPosition: number;
    }[]
  >();
  useEffect(() => {
    (async () => {
      const _playersResp = await window.getCachedPlayers();
      setPlayersResp(_playersResp);
    })().catch(console.error);
  }, []);

  const getNameByPlayerIndex = (playerIndex: number | undefined) => {
    return players !== null && playerIndex !== undefined && playersResp !== undefined
      ? playersResp.find((p) => p.PlayerID === players[playerIndex].externalId)?.Name ?? 'No Name'
      : 'Loading...';
  };

  const [spinner, setSpinner] = useState<boolean>(false);

  const claimReward = async () => {
    if (!window.wallet) {
      throw new Error('Wallet not loaded');
    }
    if (!winners) {
      throw new Error('Winners is null');
    }
    const sdk = await window.sfsSDK();
    const resp = await window.wallet.callback('Sign on Claim Reward transaction?', async (acc) => {
      await sdk.claimReward(
        leagueIndex,
        winners.map((x) => x.userState.pubKey),
        acc
      );
    });
    console.log({ resp });
  };

  return (
    <Layout removeTopMargin heading="Scoreboard">
      <p>
        The scores for each players are calculated based on ESPN's{' '}
        <a
          href="https://www.espn.in/fantasy/football/ffl/story?page=fflrulesstandardscoring"
          rel="noopenner noreferrer"
          target="_blank"
        >
          Standard Scoring System
        </a>
        .
      </p>
      {!root ? (
        <Container>
          <h4 className="mb-4">Loading...</h4>
        </Container>
      ) : (
        <Container>
          {winners ? (
            <>
              <h4 className="align-left mb-4">Winners</h4>
              <Card style={{ maxWidth: '400px', margin: '0 auto' }}>
                <Card.Body>
                  {winners.map((x) => (
                    <>
                      <strong>Team {x.userState.teamName}</strong>
                      <br />
                      {x.score}
                      <br />
                      <br />
                      Prize:{' '}
                      {(root.leagues[leagueIndex].usersLimit *
                        // @ts-ignore
                        root.leagues[leagueIndex].bid.toNumber()) /
                        10 ** 9}{' '}
                      SOL
                    </>
                  ))}
                  {!league?.isRewardClaimed && (
                    <button
                      disabled={spinner}
                      onClick={() => {
                        setSpinner(true);
                        claimReward()
                          .then(() => {
                            setSpinner(false);
                          })
                          .catch((err) => {
                            alert('Error:' + err?.message ?? err);
                            console.log(err);
                            setSpinner(false);
                          });
                      }}
                      className="btn mt-4"
                    >
                      {spinner ? 'Claiming rewards...' : <>Claim rewards</>}
                    </button>
                  )}
                </Card.Body>
              </Card>
            </>
          ) : null}
          <h4 className="align-left mb-4">Total Scores</h4>
          <Row className="pb-3">
            <Col>
              <div className="team-card-scroll-deck">
                {league?.userStates?.slice(0, league.userStateCount).map((userState, index) => (
                  <Card key={index}>
                    <Card.Body>
                      <strong>Team #{index}</strong>
                      <br />
                      {userState.teamName}
                      <br />
                      <br />
                      <u>Total Score</u>
                      <br />
                      {SFS.getUserScores(root, leagueIndex)[index].score}
                    </Card.Body>
                  </Card>
                ))}
              </div>
            </Col>
          </Row>
          {league?.startWeek
            ? Array.from({
                length:
                  (root.currentWeek > GAMES_COUNT ? GAMES_COUNT : root.currentWeek) -
                  league?.startWeek +
                  1,
              })
                .map((_, i) => league.startWeek + i)
                .reverse()
                .map((week) => (
                  <>
                    <h4 className="align-left my-4">Week {week} Scoreboard</h4>
                    <Row className="pb-3">
                      <Col>
                        <div className="team-card-scroll-deck">
                          {league?.userStates
                            ?.slice(0, league.userStateCount)
                            .map((userState, userIndex) => (
                              <Card key={userIndex}>
                                <Card.Body>
                                  <strong>Team #{userIndex}</strong>
                                  <br />
                                  {userState.teamName}
                                  <br />
                                  <br />
                                  <u>Score</u>
                                  <br />
                                  {SFS.getWeekScores(root, leagueIndex, userIndex + 1, week)}
                                  <br />
                                  <br />
                                  <u>Lineups</u>
                                  <br />
                                  {userState.lineups[week - 1]?.map((playerId) => (
                                    <>
                                      {players ? (
                                        <>
                                          {getNameByPlayerIndex(playerId - 1)} (
                                          {players[playerId - 1].position})
                                        </>
                                      ) : (
                                        playerId
                                      )}
                                      <br />
                                    </>
                                  ))}
                                </Card.Body>
                              </Card>
                            ))}
                        </div>
                      </Col>
                    </Row>
                  </>
                ))
            : null}
        </Container>
      )}
    </Layout>
  );
};
