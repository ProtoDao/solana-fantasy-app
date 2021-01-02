import React, { FunctionComponent, useEffect, useState } from 'react';
import { Container, Row, Col, Card, Form, Table, CardDeck, Alert } from 'react-bootstrap';
import { Link, RouteComponentProps } from 'react-router-dom';
import { GAMES_COUNT, League, Player, Position, Root, UserState } from '../../../sdk/state';
import { publicKey } from '../../../sdk/util/layout';
import { Layout } from '../../Layout';
import { MatchParams } from './Forwarder';

interface Player_ {
  externalId: number;
  position: Position_;
  choosenByTeamIndex: number;
}

type Position_ = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'D/ST';

export const Lineups: FunctionComponent<RouteComponentProps<MatchParams>> = (props) => {
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

  const [selfTeamIndex, setSelfTeamIndex] = useState<number | null>(null);
  useEffect(() => {
    if (league === null) return;

    const index = league.userStates.findIndex((usr) => {
      return !!window.wallet && window.wallet.publicKey.toBase58() === usr.pubKey.toBase58();
    });

    if (index !== -1) {
      setSelfTeamIndex(index);
    }
  }, [league]);

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

  const [teams, setTeams] = useState<UserState[] | null>(null);
  useEffect(() => {
    if (league === null) return;
    setTeams(league.userStates.filter((u) => u.isInitialized));
  }, [league]);

  const [newLineup, setNewLineup] = useState<number[] | null>(null);
  useEffect(() => {
    if (root === null || league === null || selfTeamIndex === null) return;
    if (newLineup === null) {
      const lineupsNextWeek = league.userStates[selfTeamIndex].lineups[root.currentWeek];

      // console.log({ lineupsNextWeek });
      if (!lineupsNextWeek) return;
      if (league.userStates[selfTeamIndex].isLineupSet) {
        setNewLineup(lineupsNextWeek.filter((l) => l !== 0));
      } else {
        setNewLineup([]);
      }
    }
  }, [root, league, selfTeamIndex]);

  const isLineupChanged = (() => {
    if (root === null || league === null || selfTeamIndex === null) return null;
    const _nextWeekLineups = league.userStates[selfTeamIndex].lineups[root.currentWeek + 1];
    if (!_nextWeekLineups) return false;
    const lineupInContract = [..._nextWeekLineups].sort();
    const lineupUI = [...(newLineup ?? [])].sort();
    if (lineupUI.length !== lineupInContract.length) return false;
    for (let i = 0; i < lineupUI.length; i++) {
      if (lineupUI[i] !== lineupInContract[i]) return true;
    }
    return false;
  })();

  const [spinner, setSpinner] = useState<boolean>(false);
  const updateLineupTx = async () => {
    if (!window.wallet) {
      throw new Error('Wallet not loaded');
    }
    const sdk = await window.sfsSDK();

    if (root === null) {
      throw new Error('root is null');
    }
    if (newLineup === null) {
      throw new Error('newLineup is null');
    }
    if (selfTeamIndex === null) {
      throw new Error('selfTeamIndex is null');
    }
    const resp = await sdk.updateLineup(
      window.wallet,
      leagueIndex,
      selfTeamIndex + 1,
      root.currentWeek + 1,
      newLineup
    );

    console.log({ resp });
  };

  return (
    <Layout removeTopMargin heading="Lineups">
      {!window.wallet ? (
        <Alert variant="danger">
          Wallet is not loaded. If you just refreshed the page, then your wallet was flushed from
          memory when you refreshed the page. When you import your wallet, you can choose to cache
          it locally to prevent this behaviour.
        </Alert>
      ) : root !== null && root.currentWeek >= GAMES_COUNT ? (
        <Alert variant="warning">
          The season is finished. Please proceed to the{' '}
          <Link to={`/leagues/${leagueIndex}/scoreboard`}>scoreboard</Link> to check result.
        </Alert>
      ) : (
        <Container>
          <h4 className="align-left mb-4">
            Upcomming Week's Lineup Selection (Week{' '}
            {root !== null ? root.currentWeek + 1 : 'Loading...'})
          </h4>
          {newLineup === null ? (
            <p>Loading existing lineups set for the next week...</p>
          ) : (
            <Row className="pb-3">
              <Col>
                <Card>
                  <Card.Body>
                    <h4>Bench List</h4>
                    <p className="small mb-0">Click on player to include</p>

                    <br />
                    {players
                      ?.map((p, i): [Player_, number] => [p, i])
                      .filter(
                        (playerEntry) =>
                          playerEntry[0].choosenByTeamIndex === selfTeamIndex &&
                          !newLineup.includes(playerEntry[1] + 1)
                      )
                      .map((playerEntry) => {
                        const [player, index] = playerEntry;
                        return (
                          <>
                            <span
                              className="cursor-pointer"
                              onClick={() => {
                                if (newLineup.length < 8) {
                                  setNewLineup((prevNewLineup) => {
                                    const _newLineup = [...(prevNewLineup ?? [])];
                                    _newLineup.push(index + 1);
                                    return _newLineup;
                                  });
                                } else {
                                  window.alert('Max 8 players can be selected in lineup');
                                }
                              }}
                            >
                              {playersResp?.find((p) => p.PlayerID === player.externalId)?.Name} (
                              {player.position})
                            </span>
                            <br />
                          </>
                        );
                      })}
                  </Card.Body>
                </Card>
              </Col>
              <Col xs={2}>
                <Card.Body>
                  <img src="https://img.icons8.com/carbon-copy/100/000000/arrow.png" />
                </Card.Body>
              </Col>
              <Col>
                <Card>
                  <Card.Body>
                    <h4>Weekly Lineup (8 Players)</h4>
                    <p className="small mb-0">Click on player to remove</p>

                    <br />
                    {newLineup.map((playerId, index) => (
                      <span
                        className="cursor-pointer"
                        onClick={() => {
                          setNewLineup((prevNewLineup) => {
                            const _newLineup = (prevNewLineup ?? []).slice();
                            _newLineup.splice(index, 1);
                            return _newLineup;
                          });
                        }}
                      >
                        {players ? (
                          <>
                            {getNameByPlayerIndex(playerId - 1)} ({players[playerId - 1].position})
                          </>
                        ) : (
                          playerId
                        )}
                        <br />
                      </span>
                    ))}

                    {newLineup.length === 8 ? (
                      isLineupChanged ? (
                        <button
                          className="btn mt-4"
                          disabled={!isLineupChanged}
                          onClick={() => {
                            setSpinner(true);
                            updateLineupTx()
                              .then(() => {
                                setSpinner(false);
                                setTimeout(() => {
                                  refreshRoot(true).catch(console.error);
                                  alert('Tx sent!');
                                }, 1000);
                              })
                              .catch((err) => {
                                alert('Error:' + err?.message ?? err);
                                console.log(err);
                                setSpinner(false);
                              });
                          }}
                        >
                          Submit Lineup Selection
                        </button>
                      ) : (
                        <Alert variant="success" className="mb-0 mt-3">
                          Add or remove players from lineup by clicking on the list.
                        </Alert>
                      )
                    ) : newLineup.length === 0 ? (
                      <Alert variant="success" className="mb-0 mt-3">
                        Week {root !== null ? root.currentWeek : 'Loading...'} is ongoing, set your
                        Lineup for the upcoming Week{' '}
                        {root !== null ? root.currentWeek + 1 : 'Loading...'} by selecting players
                        from the left pane.
                      </Alert>
                    ) : null}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}

          {root !== null && league !== null && root.currentWeek === league.startWeek ? (
            <p>
              {root.currentWeek !== 0 ? (
                <>This league was created while week {root.currentWeek} was going on. </>
              ) : null}
              You can choose your lineup for next week using above.
            </p>
          ) : null}

          {root !== null && root.currentWeek ? (
            <>
              <h4 className="align-left my-4">Current Lineups (Week {root.currentWeek})</h4>

              {root.currentWeek > 0 ? (
                <Row className="pb-3">
                  <Col>
                    <div className="team-card-scroll-deck">
                      {teams?.map((team, index) => (
                        <Card key={index}>
                          <Card.Body>
                            <strong>Team #{index}</strong>
                            <br />
                            {team.teamName}
                            <br />
                            <br />
                            <u>Lineups</u>
                            <br />
                            {root &&
                              team.lineups[root.currentWeek - 1]
                                ?.filter((l) => l !== 0)
                                .map((playerId) => (
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
              ) : null}
            </>
          ) : null}
        </Container>
      )}
    </Layout>
  );
};
