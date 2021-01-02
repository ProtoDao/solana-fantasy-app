import React, { FunctionComponent, useEffect, useState } from 'react';
import { Container, Row, Col, Card, Dropdown, Alert, Table } from 'react-bootstrap';
import { Link, RouteComponentProps } from 'react-router-dom';
import { GAMES_COUNT, League, Player, Position, Root, UserState } from '../../../sdk/state';
import { Layout } from '../../Layout';
import { MatchParams } from './Forwarder';

interface Player_ {
  externalId: number;
  position: Position_;
  choosenByTeamIndex: number;
}

type Position_ = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'D/ST';

interface SwapProposal_ {
  acceptingUserId: number;
  proposingUserId: number;
  wantPlayerId: number;
  givePlayerId: number;
}

export const Swaps: FunctionComponent<RouteComponentProps<MatchParams>> = (props) => {
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

  const getNameByPlayerIndex = (playerIndex: number) => {
    return players !== null && playersResp !== undefined
      ? playersResp.find((p) => p.PlayerID === players[playerIndex].externalId)?.Name ?? 'No Name'
      : 'Loading...';
  };
  const getNameByPlayerExternalId = (playerExternalId: number) => {
    return players !== null && playersResp !== undefined
      ? playersResp.find((p) => p.PlayerID === playerExternalId)?.Name ?? 'No Name'
      : 'Loading...';
  };

  const [teams, setTeams] = useState<UserState[] | null>(null);
  useEffect(() => {
    if (league === null) return;
    setTeams(league.userStates.filter((u) => u.isInitialized));
  }, [league]);

  // const [selfTeamIndex, setSelfTeamIndex] = useState<number | null>(null);
  const [otherTeamIndex, setOtherTeamIndex] = useState<number | null>(null);
  useEffect(() => {
    if (teams === null) return;

    if (otherTeamIndex === null) {
      const otherTeams = teams
        ?.map((t, i): [UserState, number] => [t, i])
        .filter((tEntry) => tEntry[1] !== selfTeamIndex);
      if (otherTeams.length) {
        setOtherTeamIndex(otherTeams[0][1]);
      }
    }
  }, [teams]);

  const [givePlayer, setGivePlayer] = useState<number | null>(null);
  const [wantPlayer, setWantPlayer] = useState<number | null>(null);

  const getPlayersOfTeamIndex = (teamIndex: number) => {
    return (
      players
        ?.map((p, i): [Player_, number] => [p, i])
        .filter((playerEntry) => playerEntry[0].choosenByTeamIndex === teamIndex) ?? []
    );
  };

  const [spinner, setSpinner] = useState<boolean>(false);
  const proposeSwapTx = async () => {
    if (!window.wallet) {
      throw new Error('Wallet not loaded');
    }
    const sdk = await window.sfsSDK();

    if (root === null) {
      throw new Error('root is null');
    }
    if (league === null) {
      throw new Error('league is null');
    }
    if (selfTeamIndex === null) {
      throw new Error('selfTeamIndex is null');
    }
    if (otherTeamIndex === null) {
      throw new Error('otherTeamIndex is null');
    }
    if (givePlayer === null) {
      throw new Error('givePlayer is null');
    }
    if (wantPlayer === null) {
      throw new Error('wantPlayer is null');
    }

    const resp = await sdk.proposeSwap(
      window.wallet,
      leagueIndex,
      selfTeamIndex + 1,
      otherTeamIndex + 1,
      // givePlayerInSelfUserPlayers,
      // wantPlayerInOtherUserPlayers
      givePlayer,
      wantPlayer
    );

    console.log({ resp });
  };

  const [swapProposals, setSwapProposals] = useState<SwapProposal_[] | null>(null);
  useEffect(() => {
    (async () => {
      if (league === null) return;
      if (selfTeamIndex === null) return;
      const myPlayers = getPlayersOfTeamIndex(selfTeamIndex);
      const swapProposalsForMe: SwapProposal_[] = [];
      league.userStates
        .filter((u) => u.isInitialized)
        .forEach((user, userIndex) => {
          user.swapProposals
            .filter((sp) => sp.isInitialized)
            .forEach((sp, spIndex) => {
              const acceptingUserIndex = league.userStates
                .filter((u) => u.isInitialized)
                .findIndex((_, userIndex_) => {
                  return !!getPlayersOfTeamIndex(userIndex_).find(
                    (playerEntry) => playerEntry[1] + 1 === sp.wantPlayerId
                  );
                });

              const { wantPlayerId, givePlayerId } = sp;
              swapProposalsForMe.push({
                acceptingUserId: acceptingUserIndex + 1,
                proposingUserId: userIndex + 1,
                wantPlayerId,
                givePlayerId,
              });
            });
        });
      setSwapProposals(swapProposalsForMe);
    })().catch(console.error);
  }, [league, selfTeamIndex]);

  const swapProposalsForSelf =
    selfTeamIndex !== null && swapProposals !== null
      ? swapProposals.filter((sp) => sp.acceptingUserId === selfTeamIndex + 1)
      : null;
  const swapProposalsBySelf =
    selfTeamIndex !== null && swapProposals !== null
      ? swapProposals.filter((sp) => sp.acceptingUserId !== selfTeamIndex + 1)
      : null;

  const acceptSwapTx = async (
    acceptingUserId: number,
    proposingUserId: number,
    wantPlayerId: number,
    givePlayerId: number
  ) => {
    if (!window.wallet) {
      throw new Error('Wallet not loaded');
    }
    const sdk = await window.sfsSDK();
    const resp = await sdk.acceptSwap(
      window.wallet,
      leagueIndex,
      acceptingUserId,
      proposingUserId,
      wantPlayerId,
      givePlayerId
    );

    console.log({ resp });
  };

  const rejectSwapTx = async (
    acceptingUserId: number,
    proposingUserId: number,
    wantPlayerId: number,
    givePlayerId: number
  ) => {
    if (!window.wallet) {
      throw new Error('Wallet not loaded');
    }
    const sdk = await window.sfsSDK();
    const resp = await sdk.rejectSwap(
      window.wallet,
      leagueIndex,
      acceptingUserId,
      proposingUserId,
      wantPlayerId,
      givePlayerId
    );
    console.log({ resp });
  };

  return (
    <Layout removeTopMargin heading="Swaps">
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
          <h4 className="align-left mb-4">Swap a player</h4>
          <Row className="pb-3">
            <Col>
              <Card>
                <Card.Body>
                  <h4>My Team (Players on the Bench)</h4>
                  <p className="small mb-0">Click on player to select</p>
                  <br />

                  {(() => {
                    const arr =
                      selfTeamIndex !== null &&
                      getPlayersOfTeamIndex(selfTeamIndex).map((playerEntry) => {
                        const [player, index] = playerEntry;
                        if (
                          root !== null &&
                          league !== null &&
                          selfTeamIndex !== null &&
                          league.userStates[selfTeamIndex].lineups[root.currentWeek]?.includes(
                            index + 1
                          )
                        ) {
                          return null;
                        }
                        return (
                          <>
                            <span
                              className="cursor-pointer"
                              style={{
                                backgroundColor: givePlayer === index + 1 ? '#3333' : undefined,
                              }}
                              onClick={setGivePlayer.bind(null, index + 1)}
                            >
                              {getNameByPlayerExternalId(player.externalId)} ({player.position})
                            </span>
                            <br />
                          </>
                        );
                      });
                    return arr
                      ? arr.filter((a) => a !== null).length > 0
                        ? arr
                        : 'No Lineups selected'
                      : 'Loading...';
                  })()}
                </Card.Body>
              </Card>
            </Col>
            <Col xs={2}>
              <Card.Body>
                <img src="https://img.icons8.com/pastel-glyph/64/000000/sorting-arrows-horizontal.png" />
              </Card.Body>
            </Col>
            <Col>
              <Card>
                {otherTeamIndex !== null ? (
                  <Card.Body>
                    <Dropdown className="mb-2">
                      <Dropdown.Toggle variant="success" id="dropdown-basic">
                        {teams ? (
                          <>
                            Team#{otherTeamIndex !== null ? otherTeamIndex + 1 : 'loading...'}{' '}
                            {otherTeamIndex !== null
                              ? teams[otherTeamIndex].teamName
                              : 'Loading...'}
                          </>
                        ) : (
                          'Loading...'
                        )}
                      </Dropdown.Toggle>

                      <Dropdown.Menu>
                        {teams
                          ?.map((t, i): [UserState, number] => [t, i])
                          .filter((tEntry) => tEntry[1] !== selfTeamIndex)
                          .map((tEntry) => (
                            <Dropdown.Item
                              onClick={() => {
                                setOtherTeamIndex(tEntry[1]);
                                setWantPlayer(null);
                              }}
                            >
                              Team#{tEntry[1] + 1} {tEntry[0].teamName}
                            </Dropdown.Item>
                          ))}
                      </Dropdown.Menu>
                    </Dropdown>

                    {(() => {
                      const arr =
                        otherTeamIndex !== null &&
                        getPlayersOfTeamIndex(otherTeamIndex).map((playerEntry) => {
                          const [player, index] = playerEntry;
                          if (
                            root !== null &&
                            league !== null &&
                            otherTeamIndex !== null &&
                            league.userStates[otherTeamIndex].lineups[root.currentWeek]?.includes(
                              index + 1
                            )
                          ) {
                            return null;
                          }
                          return (
                            <>
                              <span
                                className="cursor-pointer"
                                style={{
                                  backgroundColor: wantPlayer === index + 1 ? '#3333' : undefined,
                                }}
                                onClick={setWantPlayer.bind(null, index + 1)}
                              >
                                {getNameByPlayerExternalId(player.externalId)} ({player.position})
                              </span>
                              <br />
                            </>
                          );
                        });

                      return arr
                        ? arr.filter((a) => a !== null).length > 0
                          ? arr
                          : 'This team has not pushed their lineup selection.'
                        : 'Loading...';
                    })()}
                  </Card.Body>
                ) : (
                  <Alert variant="danger">No other teams</Alert>
                )}
              </Card>
            </Col>
          </Row>

          <Row className="pb-3 mt-4">
            <Col>
              {givePlayer !== null && players !== null ? (
                <p>
                  Requesting Swap of {getNameByPlayerIndex(givePlayer - 1)} for{' '}
                  {wantPlayer !== null ? getNameByPlayerIndex(wantPlayer - 1) : '...'}
                </p>
              ) : null}

              <button
                className="btn m-4"
                disabled={givePlayer === null || wantPlayer === null}
                onClick={() => {
                  setSpinner(true);
                  proposeSwapTx()
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
                Request
              </button>
            </Col>
          </Row>
          <Row>
            <Col xs={12}>
              <Card>
                <Card.Body>
                  <h5>Open Swap Proposals for you</h5>
                  {swapProposalsForSelf !== null ? (
                    swapProposalsForSelf.length !== 0 ? (
                      <Table responsive>
                        <thead>
                          <tr>
                            <th>Proposer Team</th>
                            <th>Give Player</th>
                            <th>Want Player</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {swapProposalsForSelf.map((sp) => (
                            <tr>
                              <td>
                                Team #{sp.proposingUserId}{' '}
                                {league?.userStates[sp.proposingUserId - 1].teamName}
                              </td>
                              <td>{getNameByPlayerIndex(sp.givePlayerId - 1)}</td>
                              <td>{getNameByPlayerIndex(sp.wantPlayerId - 1)}</td>
                              <td>
                                <button
                                  className="btn"
                                  disabled={spinner}
                                  onClick={() => {
                                    setSpinner(true);
                                    acceptSwapTx(
                                      sp.acceptingUserId,
                                      sp.proposingUserId,
                                      sp.wantPlayerId,
                                      sp.givePlayerId
                                    )
                                      .then(() => {
                                        setSpinner(false);
                                        alert('Tx sent!');
                                      })
                                      .catch((err) => {
                                        alert('Error:' + err?.message ?? err);
                                        console.log(err);
                                        setSpinner(false);
                                      });
                                  }}
                                >
                                  Accept
                                </button>
                                <button
                                  className="btn"
                                  disabled={spinner}
                                  onClick={() => {
                                    setSpinner(true);
                                    rejectSwapTx(
                                      sp.acceptingUserId,
                                      sp.proposingUserId,
                                      sp.wantPlayerId,
                                      sp.givePlayerId
                                    )
                                      .then(() => {
                                        setSpinner(false);
                                        alert('Tx sent!');
                                      })
                                      .catch((err) => {
                                        alert('Error:' + err?.message ?? err);
                                        console.log(err);
                                        setSpinner(false);
                                      });
                                  }}
                                >
                                  Reject
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    ) : (
                      'No swap proposals'
                    )
                  ) : (
                    'Loading...'
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col xs={12} className="mt-4">
              <Card>
                <Card.Body>
                  <h5>Open Swap Proposals created by you</h5>
                  {swapProposalsBySelf !== null ? (
                    swapProposalsBySelf.length !== 0 ? (
                      <Table responsive>
                        <thead>
                          <tr>
                            <th>For Team</th>
                            <th>Give Player</th>
                            <th>Want Player</th>
                            {/* <th>Action</th> */}
                          </tr>
                        </thead>
                        <tbody>
                          {swapProposalsBySelf.map((sp) => (
                            <tr>
                              <td>
                                Team #{sp.acceptingUserId}{' '}
                                {league?.userStates[sp.acceptingUserId - 1].teamName}
                              </td>
                              <td>{getNameByPlayerIndex(sp.givePlayerId - 1)}</td>
                              <td>{getNameByPlayerIndex(sp.wantPlayerId - 1)}</td>
                              {/* <td>Accept</td> */}
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    ) : (
                      'No swap proposals'
                    )
                  ) : (
                    'Loading...'
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      )}
    </Layout>
  );
};
