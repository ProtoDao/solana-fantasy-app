import {
  PublicKey,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
} from '@solana/web3.js';

import * as Layout from './util/layout';
import { BufferLayout } from './util/layout';
import {
  Position,
  MAX_PLAYERS_PER_INSTRUCTION,
  LEAGUE_NAME_MAX_SYMBOLS,
  LEAGUE_USERS_CAPACITY,
} from './state';

enum Command {
  Uninitialized,
  AddPlayers,
  InitializeRoot,
  SeedDraftSelection,
  StartSeason,
  CreateLeague,
  JoinLeague,
  UpdateLineup,
  PickPlayer,
  ProposeSwaps,
  AcceptSwap,
  UpdatePlayerScore,
}

export type Player = {
  externalId: number;
  position: Position;
};

export const PlayerLayout: typeof BufferLayout.Structure = BufferLayout.struct([
  BufferLayout.u16('externalId'),
  BufferLayout.u8('position'),
]);

export class SfsInstruction {
  /**
   * Construct an InitializeRoot instruction
   *
   * @param programId SFS program account
   * @param root SFS root account
   * @param oracleAuthority Oracle authority
   */
  static createInitializeRootInstruction(
    programId: PublicKey,
    root: PublicKey,
    oracleAuthority: PublicKey,
    currentWeek: number
  ): TransactionInstruction {
    let keys = [
      { pubkey: root, isSigner: false, isWritable: true },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ];
    const commandDataLayout = BufferLayout.struct([
      BufferLayout.u8('instruction'),
      Layout.publicKey('oracleAuthority'),
      BufferLayout.u8('currentWeek'),
    ]);
    let data = Buffer.alloc(commandDataLayout.span);
    {
      const encodeLength = commandDataLayout.encode(
        {
          instruction: Command.InitializeRoot,
          oracleAuthority,
          currentWeek,
        },
        data
      );
      data = data.slice(0, encodeLength);
    }

    return new TransactionInstruction({
      keys,
      programId,
      data,
    });
  }

  /**
   * Construct an AddPlayers instruction
   *
   * @param programId SFS program account
   * @param root SFS root account
   * @param players players
   */
  static createAddPlayersInstruction(
    programId: PublicKey,
    root: PublicKey,
    players: Player[]
  ): TransactionInstruction {
    let keys = [{ pubkey: root, isSigner: false, isWritable: true }];
    const commandDataLayout = BufferLayout.struct([
      BufferLayout.u8('instruction'),
      BufferLayout.u8('length'),
      BufferLayout.seq(PlayerLayout, MAX_PLAYERS_PER_INSTRUCTION, 'players'),
    ]);
    let data = Buffer.alloc(commandDataLayout.span);
    {
      const encodeLength = commandDataLayout.encode(
        {
          instruction: Command.AddPlayers,
          length: players.length,
          players: players,
        },
        data
      );
    }

    return new TransactionInstruction({
      keys,
      programId,
      data,
    });
  }

  /**
   * Construct an SeedDraftSelection instruction
   *
   * @param programId SFS program account
   * @param root SFS root account
   * @param pickOrder pick order seed
   */
  static createSeedDraftSelectionInstruction(
    programId: PublicKey,
    root: PublicKey,
    pickOrder: number[]
  ): TransactionInstruction {
    let keys = [{ pubkey: root, isSigner: false, isWritable: true }];
    const commandDataLayout = BufferLayout.struct([
      BufferLayout.u8('instruction'),
      BufferLayout.seq(BufferLayout.u8(), LEAGUE_USERS_CAPACITY, 'pickOrder'),
    ]);
    let data = Buffer.alloc(commandDataLayout.span);
    {
      const encodeLength = commandDataLayout.encode(
        {
          instruction: Command.SeedDraftSelection,
          pickOrder,
        },
        data
      );
    }

    return new TransactionInstruction({
      keys,
      programId,
      data,
    });
  }

  /**
   * Construct an CreateLeague instruction
   */
  static createCreateLeagueInstruction(
    programId: PublicKey,
    root: PublicKey,
    bank: PublicKey,
    name: string,
    bid: number | Layout.u64,
    usersLimit: number,
    owner: PublicKey
  ): TransactionInstruction {
    let keys = [
      { pubkey: root, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: bank, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];
    const commandDataLayout = BufferLayout.struct([
      BufferLayout.u8('instruction'),
      Layout.utf16FixedString(LEAGUE_NAME_MAX_SYMBOLS, 'name'),
      Layout.uint64('bid'),
      BufferLayout.u8('usersLimit'),
    ]);

    let data = Buffer.alloc(commandDataLayout.span);
    {
      const encodeLength = commandDataLayout.encode(
        {
          instruction: Command.CreateLeague,
          name,
          bid,
          usersLimit,
        },
        data
      );
    }

    return new TransactionInstruction({
      keys,
      programId,
      data,
    });
  }

  /**
   * Construct an JoinLeague instruction
   */
  static createJoinLeagueInstruction(
    programId: PublicKey,
    root: PublicKey,
    bank: PublicKey,
    leagueId: number,
    owner: PublicKey
  ): TransactionInstruction {
    let keys = [
      { pubkey: root, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: bank, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];
    const commandDataLayout = BufferLayout.struct([
      BufferLayout.u8('instruction'),
      BufferLayout.u16('leagueId'),
    ]);

    let data = Buffer.alloc(commandDataLayout.span);
    {
      const encodeLength = commandDataLayout.encode(
        {
          instruction: Command.JoinLeague,
          leagueId,
        },
        data
      );
    }

    return new TransactionInstruction({
      keys,
      programId,
      data,
    });
  }

  /**
   * Construct an PickPlayer instruction
   */
  static createPickPlayerInstruction(
    programId: PublicKey,
    root: PublicKey,
    leagueId: number,
    userId: number,
    playerId: number,
    owner: PublicKey
  ): TransactionInstruction {
    let keys = [
      { pubkey: root, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ];
    const commandDataLayout = BufferLayout.struct([
      BufferLayout.u8('instruction'),
      BufferLayout.u16('leagueId'),
      BufferLayout.u8('userId'),
      BufferLayout.u16('playerId'),
    ]);

    let data = Buffer.alloc(commandDataLayout.span);
    {
      const encodeLength = commandDataLayout.encode(
        {
          instruction: Command.PickPlayer,
          leagueId,
          userId,
          playerId,
        },
        data
      );
    }

    return new TransactionInstruction({
      keys,
      programId,
      data,
    });
  }
  /**
   * Construct an JoinLeague instruction
   */
  static createUpdatePlayerScoreInstruction(
    programId: PublicKey,
    root: PublicKey,
    bank: PublicKey,
    playerId: number,
    playerScore: number,
    owner: PublicKey
  ): TransactionInstruction {
    let keys = [
      { pubkey: root, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: bank, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];
    const commandDataLayout = BufferLayout.struct([
      BufferLayout.u8('instruction'),
      BufferLayout.u16('playerId'),
      BufferLayout.u16('playerScore'),
    ]);

    let data = Buffer.alloc(commandDataLayout.span);
    {
      const encodeLength = commandDataLayout.encode(
        {
          instruction: Command.UpdatePlayerScore,
          playerId,
          playerScore,
        },
        data
      );
    }

    return new TransactionInstruction({
      keys,
      programId,
      data,
    });
  }
}
