import React, { FunctionComponent, useEffect, useState } from 'react';
import { Card, Form, InputGroup } from 'react-bootstrap';
import { RouteComponentProps, useHistory } from 'react-router-dom';
import { Layout } from '../../Layout';
import { DraftSelection } from './DraftSelection';
import { JoinLeague } from './Join';
import { isUserAlreadyJoined } from '../../../utils';
import { TEAM_PLAYERS_COUNT } from '../../../sdk/state';

export interface MatchParams {
  index: string;
}

export const Forwarder: FunctionComponent<RouteComponentProps<MatchParams>> = (props) => {
  const leagueIndex = +props.match.params.index;
  const history = useHistory();
  useEffect(() => {
    (async () => {
      if (window.wallet) {
        const isJoined = await isUserAlreadyJoined(window.wallet.publicKey.toBase58(), leagueIndex);
        if (!isJoined) {
          history.replace(`/leagues/${leagueIndex}/join`);
          window.leagueTabHook();
        } else {
          const root = await window.getCachedRootInfo();
          const { currentPick, usersLimit } = root.leagues[leagueIndex];
          const isDraftSelectionOver = currentPick >= usersLimit * TEAM_PLAYERS_COUNT;
          if (!isDraftSelectionOver) {
            history.replace(`/leagues/${leagueIndex}/draft-selection`);
          } else {
            history.replace(`/leagues/${leagueIndex}/lineups`);
          }
          window.leagueTabHook();
        }
      }
    })().catch(console.error);
  }, []);
  return (
    <Layout removeTopMargin heading="League">
      Please wait...
    </Layout>
  );
};
