import { Account, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import type { Connection } from '@solana/web3.js';

import { sendAndConfirmTransaction } from './util/send-and-confirm-transaction';
import {
  MAX_PLAYERS_PER_INSTRUCTION,
  Player,
  Root,
  RootLayout,
  LEAGUE_USERS_CAPACITY,
  GAMES_COUNT,
  League,
  ACTIVE_PLAYERS_COUNT,
  MAX_PLAYERS_SCORES_PER_TRANSACTION,
} from './state';
import { SfsInstruction, Player as PlayerInit } from './instruction';
import { u64 } from './util/layout';
import { ClojuredWallet } from '../clojured-wallet';

// The address of the special mint for wrapped native token.
export const NATIVE_MINT: PublicKey = new PublicKey('So11111111111111111111111111111111111111112');

/**
 * SolanaFantasySport
 */
export class SFS {
  /**
   * Create a SFS object attached to the specific root
   *
   * @param connection The connection to use
   * @param publicKey Public key of the root account
   * @param programId SFS programId
   * @param payer Payer of fees
   */
  constructor(
    private connection: Connection,
    /**
     * The public key of root account
     */
    private publicKey: PublicKey,
    /**
     * Program Identifier for the SFS program
     */
    private programId: PublicKey,
    /**
     * Bank account for the SFS program
     */
    private bank: PublicKey
  ) {}

  /**
   * Get the minimum balance for the root to be rent exempt
   *
   * @return Number of lamports required
   */
  static async getMinBalanceRentForExemptRoot(connection: Connection): Promise<number> {
    return await connection.getMinimumBalanceForRentExemption(RootLayout.span);
  }

  /**
   * Create and initialize a root state account.
   *
   * @param connection The connection to use
   * @param payer Fee payer for transaction
   * @param oracleAuthority Account that will control scores
   * @param players An array of player external ids and their positions
   * @param currentWeek A current week of season. 0 - week before season starts
   * @param programId Id of deployed SFS program
   * @return SFS object for the newly created root
   */
  static async initializeRoot(
    connection: Connection,
    payer: Account,
    oracleAuthority: PublicKey,
    players: PlayerInit[],
    currentWeek: number,
    programId: PublicKey
  ): Promise<SFS> {
    const rootAccount = new Account();
    const [bank, _] = await PublicKey.findProgramAddress([Buffer.from([0])], programId);
    const sfs = new SFS(connection, rootAccount.publicKey, programId, bank);

    // Allocate memory for the account
    const balanceNeeded = await SFS.getMinBalanceRentForExemptRoot(connection);

    let transaction = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: rootAccount.publicKey,
        lamports: balanceNeeded,
        space: RootLayout.span,
        programId,
      })
    );

    await sendAndConfirmTransaction('Create account', connection, transaction, payer, rootAccount);

    for (let i = 0; i < players.length / MAX_PLAYERS_PER_INSTRUCTION; i++) {
      // console.log(`Add players ${i * MAX_PLAYERS_PER_INSTRUCTION}-${(i+1) * MAX_PLAYERS_PER_INSTRUCTION} of ${players.length}`);
      console.log(
        `Add players ${i * MAX_PLAYERS_PER_INSTRUCTION} of ${Math.min(
          players.length - 1,
          (i + 1) * MAX_PLAYERS_PER_INSTRUCTION
        )}`
      );
      transaction = new Transaction().add(
        SfsInstruction.createAddPlayersInstruction(
          programId,
          rootAccount.publicKey,
          players.slice(i * MAX_PLAYERS_PER_INSTRUCTION, (i + 1) * MAX_PLAYERS_PER_INSTRUCTION)
        )
      );

      await sendAndConfirmTransaction(
        `Add players ${i * MAX_PLAYERS_PER_INSTRUCTION}-${
          (i + 1) * MAX_PLAYERS_PER_INSTRUCTION
        } of ${players.length}`,
        connection,
        transaction,
        payer
      );
    }

    const pickOrder = Array.from({ length: LEAGUE_USERS_CAPACITY })
      .map((_, i) => i + 1)
      .sort(() => 0.5 - Math.random());

    transaction = new Transaction().add(
      SfsInstruction.createSeedDraftSelectionInstruction(
        programId,
        rootAccount.publicKey,
        pickOrder
      )
    );
    console.log('Seed draft selection');
    await sendAndConfirmTransaction('Seed draft selection', connection, transaction, payer);

    transaction = new Transaction().add(
      SfsInstruction.createInitializeRootInstruction(
        programId,
        rootAccount.publicKey,
        oracleAuthority,
        currentWeek
      )
    );

    console.log('Initialize root');
    await sendAndConfirmTransaction('Initialize root', connection, transaction, payer);

    return sfs;
  }

  /**
   * Create a new league.
   *
   * @param owner User account to pay the fee, will be the first user joined
   * @param name A name for the new league
   * @param bid A bid amount in lamports
   * @param usersLimit Number of users in league
   * @param teamName A name of current user's team
   * @return Index of the created league
   */
  async createLeague(
    owner: ClojuredWallet,
    name: string,
    bid: number | u64,
    usersLimit: number,
    teamName: string
  ): Promise<number> {
    const transaction = new Transaction();
    transaction.add(
      SfsInstruction.createCreateLeagueInstruction(
        this.programId,
        this.publicKey,
        this.bank,
        name,
        bid,
        usersLimit,
        teamName,
        owner.publicKey
      )
    );
    const rootInfo = await this.connection.getAccountInfo(this.publicKey);
    if (rootInfo === null) {
      throw new Error('Failed to find root account');
    }
    // await sendAndConfirmTransaction('Create league', this.connection, transaction, owner);
    await owner.sendAndConfirmTx('Sign on Create League tx?', transaction);

    const root = await this.getRootInfo();
    for (let i = root.leaguesCount; i >= 0; i--) {
      if (root.leagues[i].userStates.some((x) => x.pubKey.equals(owner.publicKey))) {
        return i;
      }
    }
    throw new Error('Created league is not found');
  }

  /**
   * Join an existing league.
   *
   * @param owner User account that will join the league and pay the bid
   * @param leagueIndex Index of league to join
   * @param teamName A name of current user's team
   * @return Public key of the new empty account
   */
  async joinLeague(owner: ClojuredWallet, leagueIndex: number, teamName: string): Promise<void> {
    const transaction = new Transaction();
    transaction.add(
      SfsInstruction.createJoinLeagueInstruction(
        this.programId,
        this.publicKey,
        this.bank,
        leagueIndex,
        teamName,
        owner.publicKey
      )
    );

    // await sendAndConfirmTransaction('Join league', this.connection, transaction, owner);
    await owner.sendAndConfirmTx('Sign on Join League tx?', transaction);
  }

  /**
   * Pick a player to the user's team on user's turn of draft selection.
   *
   * @param owner Current user account
   * @param leagueIndex Index of joined league
   * @param userId A 1-based id of current user in the league
   * @param playerId A 1-based id of player to pick
   */
  async pickPlayer(
    owner: ClojuredWallet,
    leagueIndex: number,
    userId: number,
    playerId: number
  ): Promise<void> {
    const transaction = new Transaction();
    transaction.add(
      SfsInstruction.createPickPlayerInstruction(
        this.programId,
        this.publicKey,
        leagueIndex,
        userId,
        playerId,
        owner.publicKey
      )
    );

    // await sendAndConfirmTransaction('Pick player', this.connection, transaction, owner);
    await owner.sendAndConfirmTx('Sign on Pick Player tx?', transaction);
  }
  /**
   * Update lineup for the next and further weeks.
   *
   * @param owner Current user account
   * @param leagueIndex Index of joined league
   * @param userId A 1-based id of current user in the league
   * @param week A next week number
   * @param activePlayers List of players to be active in next week
   */
  async updateLineup(
    owner: ClojuredWallet,
    leagueIndex: number,
    userId: number,
    week: number,
    activePlayers: number[]
  ): Promise<void> {
    const transaction = new Transaction();
    transaction.add(
      SfsInstruction.createUpdateLineupInstruction(
        this.programId,
        this.publicKey,
        leagueIndex,
        userId,
        week,
        activePlayers,
        owner.publicKey
      )
    );

    // await sendAndConfirmTransaction('Update lineup', this.connection, transaction, owner);
    await owner.sendAndConfirmTx('Sign on Update Lineup tx?', transaction);
  }
  /**
   * Propose a player swap.
   * Only players not active in the current week can be swapped
   *
   * @param owner Proposing user account
   * @param leagueIndex Index of joined league
   * @param proposingUserId A 1-based id of proposing user in the league
   * @param acceptingUserId A 1-based id of accepting user in the league
   * @param givePlayerId A 1-based id of player proposing user gives
   * @param wantPlayerId A 1-based id of player accepting user gives
   */
  async proposeSwap(
    owner: ClojuredWallet,
    leagueIndex: number,
    proposingUserId: number,
    acceptingUserId: number,
    givePlayerId: number,
    wantPlayerId: number
  ): Promise<void> {
    const transaction = new Transaction();
    transaction.add(
      SfsInstruction.createProposeSwapInstruction(
        this.programId,
        this.publicKey,
        leagueIndex,
        proposingUserId,
        acceptingUserId,
        givePlayerId,
        wantPlayerId,
        owner.publicKey
      )
    );

    // await sendAndConfirmTransaction('Propose swap', this.connection, transaction, owner);
    await owner.sendAndConfirmTx('Sign on Propose Swap tx?', transaction);
  }
  /**
   * Accept a player swap proposal.
   *
   * @param owner Accepting user account
   * @param leagueIndex Index of joined league
   * @param acceptingUserId A 1-based id of accepting user in the league
   * @param proposingUserId A 1-based id of user that own a wanted player
   * @param wantPlayerId A 1-based id of player proposing user gives
   * @param givePlayerId A 1-based id of player accepting user gives
   */
  async acceptSwap(
    owner: ClojuredWallet,
    leagueIndex: number,
    acceptingUserId: number,
    proposingUserId: number,
    wantPlayerId: number,
    givePlayerId: number
  ): Promise<void> {
    const transaction = new Transaction();
    transaction.add(
      SfsInstruction.createAcceptSwapInstruction(
        this.programId,
        this.publicKey,
        leagueIndex,
        acceptingUserId,
        proposingUserId,
        wantPlayerId,
        givePlayerId,
        owner.publicKey
      )
    );

    // await sendAndConfirmTransaction('Accept swap', this.connection, transaction, owner);
    await owner.sendAndConfirmTx('Sign on Accept Swap tx?', transaction);
  }
  /**
   * Reject a player swap proposal.
   *
   * @param owner Proposing or accepting user account
   * @param leagueIndex Index of joined league
   * @param acceptingUserId A 1-based id of accepting user in the league
   * @param proposingUserId A 1-based id of user that own a wanted player
   * @param wantPlayerId A 1-based id of player proposing user gives
   * @param givePlayerId A 1-based id of player accepting user gives
   */
  async rejectSwap(
    owner: ClojuredWallet,
    leagueIndex: number,
    acceptingUserId: number,
    proposingUserId: number,
    wantPlayerId: number,
    givePlayerId: number
  ): Promise<void> {
    const transaction = new Transaction();
    transaction.add(
      SfsInstruction.createRejectSwapInstruction(
        this.programId,
        this.publicKey,
        leagueIndex,
        acceptingUserId,
        proposingUserId,
        wantPlayerId,
        givePlayerId,
        owner.publicKey
      )
    );

    // await sendAndConfirmTransaction('Reject swap', this.connection, transaction, owner);
    await owner.sendAndConfirmTx('Sign on Reject Swap tx?', transaction);
  }

  /**
   * Retrieve latest root state information
   *
   * @returns Root state
   */
  async getRootInfo(): Promise<Root> {
    const info = await this.connection.getAccountInfo(this.publicKey);
    if (info === null) {
      throw new Error('Failed to find root account');
    }
    if (!info.owner.equals(this.programId)) {
      throw new Error(`Invalid root owner: ${JSON.stringify(info.owner)}`);
    }
    if (info.data.length != RootLayout.span) {
      throw new Error(`Invalid root size`);
    }

    const data = Buffer.from(info.data);
    const rootInfo = RootLayout.decode(data);

    return rootInfo;
  }

  /**
   * Calculates scores for the certain user for the certain week
   *
   * @param root Root state
   * @param leagueIndex Index of league
   * @param userId A 1-based id of user in league
   * @param week Week to calculate the scores
   * @returns score
   */
  static getWeekScores(root: Root, leagueIndex: number, userId: number, week: number) {
    let league = root.leagues[leagueIndex];
    let score = league.userStates[userId - 1].lineups[week - 1]?.reduce((sum, playerId) => {
      return sum + root.players[playerId - 1].scores[week - 1].score1;
    }, 0);
    return Math.round(score ?? 0);
  }

  /**
   * Calculates scores for each league user for all weeks
   *
   * @param root Root state
   * @param leagueIndex Index of league
   * @returns array of users and their scores and states
   */
  static getUserScores(root: Root, leagueIndex: number) {
    let league = root.leagues[leagueIndex];
    return league.userStates.slice(0, league.userStateCount).map((userState, i) => {
      const score = userState.lineups.slice(league.startWeek - 1).reduce(
        (sum, lineup, lineupIndex) =>
          sum +
          lineup.reduce((sum2, playerId) => {
            return (
              sum2 + root.players[playerId - 1].scores[lineupIndex + league.startWeek - 1].score1
            );
          }, 0),
        0
      );

      return {
        userId: i + 1,
        userState,
        score: Math.round(score),
      };
    });
  }

  /**
   * Returns list of winners for the league
   *
   * @param root
   * @param leagueIndex
   */
  static getWinners(root: Root, leagueIndex: number) {
    const scores = SFS.getUserScores(root, leagueIndex);
    const maxScore = scores.reduce((max, x) => (x.score > max ? x.score : max), 0);
    return scores.filter((x) => x.score === maxScore);
  }

  /**
   * Update player scores for current week
   *
   * @param owner An oracle's account
   * @param scores Array of players and their scores
   */
  async updatePlayerScores(
    owner: ClojuredWallet,
    scores: { playerId: number; playerScore: number }[]
  ): Promise<void> {
    for (let i = 0; i < scores.length / MAX_PLAYERS_SCORES_PER_TRANSACTION; i++) {
      console.log(
        `Uploading scores ${i * MAX_PLAYERS_SCORES_PER_TRANSACTION} of ${Math.min(
          scores.length - 1,
          (i + 1) * MAX_PLAYERS_SCORES_PER_TRANSACTION
        )}`
      );
      const transaction = new Transaction();
      scores
        .slice(i * MAX_PLAYERS_SCORES_PER_TRANSACTION, (i + 1) * MAX_PLAYERS_SCORES_PER_TRANSACTION)
        .forEach((x) => {
          transaction.add(
            SfsInstruction.createUpdatePlayerScoreInstruction(
              this.programId,
              this.publicKey,
              this.bank,
              x.playerId,
              x.playerScore,
              owner.publicKey
            )
          );
        });
      // await sendAndConfirmTransaction(
      //   `Uploading scores ${i * MAX_PLAYERS_SCORES_PER_TRANSACTION} of ${Math.min(
      //     scores.length - 1,
      //     (i + 1) * MAX_PLAYERS_SCORES_PER_TRANSACTION
      //   )}`,
      //   this.connection,
      //   transaction,
      //   owner
      // );

      await owner.sendAndConfirmTx(
        `Sign on Update Scores ${i * MAX_PLAYERS_SCORES_PER_TRANSACTION} of ${Math.min(
          scores.length - 1,
          (i + 1) * MAX_PLAYERS_SCORES_PER_TRANSACTION
        )} transaction?`,
        transaction
      );
    }
  }

  /**
   * Increment current week number
   *
   * @param owner An oracle's account
   */
  async incrementWeek(owner: ClojuredWallet): Promise<void> {
    const transaction = new Transaction();
    transaction.add(
      SfsInstruction.createIncrementWeekInstruction(
        this.programId,
        this.publicKey,
        this.bank,
        owner.publicKey
      )
    );

    // await sendAndConfirmTransaction('Increment week', this.connection, transaction, owner);
    await owner.sendAndConfirmTx('Sign on Increment Week tx?', transaction);
  }

  /**
   * Withdraw the reward to the winners.
   *
   * @param leagueIndex Index of league
   * @param winners Array of the winners
   * @param sender Account to pay the transaction fee
   */
  async claimReward(
    leagueIndex: number,
    winners: PublicKey[],
    sender: ClojuredWallet
  ): Promise<void> {
    const transaction = new Transaction();
    transaction.add(
      SfsInstruction.createClaimRewardInstruction(
        this.programId,
        this.publicKey,
        this.bank,
        leagueIndex,
        winners
      )
    );

    // await sendAndConfirmTransaction('Claim reward', this.connection, transaction, sender);
    await sender.sendAndConfirmTx('Sign on Claim Reward tx?', transaction);
  }
}
