import React, { FunctionComponent, useEffect, useState } from 'react';
import { Table } from 'react-bootstrap';
import { useHistory, RouteComponentProps } from 'react-router-dom';
import { League } from '../../sdk/state';
import { isUserAlreadyJoined } from '../../utils';
import { Layout } from '../Layout';

export const LeagueList: FunctionComponent<RouteComponentProps> = (props) => {
  const [leagues, setLeagues] = useState<League[] | null>();
  // @ts-ignore
  window.leagues = leagues;

  useEffect(() => {
    (async () => {
      let forceUpdate = false;
      if (window.URLSearchParams) {
        const sp = new URLSearchParams(props.location.search);
        forceUpdate = !!sp.get('forceRootUpdate');
      }
      const root = await window.getCachedRootInfo(forceUpdate || undefined);
      setLeagues(root.leagues.filter((league) => league.isInitialized));
    })().catch(console.log);
  }, []);
  return (
    <Layout heading="Leagues">
      {leagues ? (
        leagues.length !== 0 ? (
          <Table>
            <thead>
              <tr>
                <th>Leage Index</th>
                <th>Leage Name</th>
                <th>Bid</th>
                <th>Users</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {leagues.map((league, i) => (
                <LeagueRow key={i} league={league} leagueIndex={i} />
              ))}
            </tbody>
          </Table>
        ) : (
          'No leagues are there. You can create one by clicking on Create League in navbar.'
        )
      ) : (
        'Loading state from Solana...'
      )}
    </Layout>
  );
};

export const LeagueRow: FunctionComponent<{ league: League; leagueIndex: number }> = (props) => {
  const history = useHistory();

  const [isAlreadyJoined, setIsAlreadyJoined] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      if (window.wallet) {
        setIsAlreadyJoined(await isUserAlreadyJoined(window.wallet.publicKey, props.leagueIndex));
      }
    })().catch(console.error);
  }, []);

  return (
    <tr>
      <td>{props.leagueIndex}</td>
      <td>{props.league.name || 'No Name'}</td>
      <td>{props.league.bid.toNumber() / 10 ** 9} SOL</td>
      <td>
        {props.league.userStateLength}/{props.league.usersLimit}
      </td>
      <td>
        <button
          disabled={isAlreadyJoined || props.league.userStateLength >= props.league.usersLimit}
          onClick={() => history.push(`/leagues/${props.leagueIndex}`)}
          className="btn"
        >
          {isAlreadyJoined
            ? 'Joined'
            : props.league.userStateLength >= props.league.usersLimit
            ? 'Full'
            : 'Join'}
        </button>
      </td>
    </tr>
  );
};
