/**
 * Account Parser for Market and Position PDAs
 * Deserializes account data from blockchain
 */

import { PublicKey } from '@solana/web3.js';
import { createClientLogger } from '@/lib/logger';

const logger = createClientLogger();

export interface ParsedMarketAccount {
  founder: string;
  ipfsCid: string;
  targetPool: string; // bigint as string
  poolBalance: string;
  yesPool: string;
  noPool: string;
  totalYesShares: string;
  totalNoShares: string;
  expiryTime: string; // i64 as string
  phase: number; // 0=Prediction, 1=Funding
  resolution: number; // 0=Unresolved, 1=YesWins, 2=NoWins, 3=Refund
  metadataUri: string;
  tokenMint: string | null;
  platformTokensAllocated: string;
  platformTokensClaimed: boolean;
  yesVoterTokensAllocated: string;
  distributionPool: string;
  treasury: string;
  bump: number;
}

export interface ParsedPositionAccount {
  user: string;
  market: string;
  yesShares: string;
  noShares: string;
  totalInvested: string;
  claimed: boolean;
  bump: number;
}

/**
 * Parse Market account data
 */
export function parseMarketAccount(base64Data: string): ParsedMarketAccount {
  try {
    const accountData = Buffer.from(base64Data, 'base64');

    // Skip 8-byte discriminator
    const dataWithoutDiscriminator = accountData.slice(8);

    const decoder = new TextDecoder();
    let offset = 0;

    // Read founder (32 bytes - PublicKey)
    const founder = new PublicKey(dataWithoutDiscriminator.slice(offset, offset + 32));
    offset += 32;

    // Read ipfs_cid (String - 4 bytes length + data)
    const ipfsCidLen = dataWithoutDiscriminator.readUInt32LE(offset);
    offset += 4;
    const ipfsCid = decoder.decode(dataWithoutDiscriminator.slice(offset, offset + ipfsCidLen));
    offset += ipfsCidLen;

    // Read target_pool (8 bytes - u64)
    const targetPool = dataWithoutDiscriminator.readBigUInt64LE(offset);
    offset += 8;

    // Read pool_balance (8 bytes - u64)
    const poolBalance = dataWithoutDiscriminator.readBigUInt64LE(offset);
    offset += 8;

    // Read distribution_pool (8 bytes - u64) - NEW FIELD
    const distributionPool = dataWithoutDiscriminator.readBigUInt64LE(offset);
    offset += 8;

    // Read yes_pool (8 bytes - u64)
    const yesPool = dataWithoutDiscriminator.readBigUInt64LE(offset);
    offset += 8;

    // Read no_pool (8 bytes - u64)
    const noPool = dataWithoutDiscriminator.readBigUInt64LE(offset);
    offset += 8;

    // Read total_yes_shares (8 bytes - u64)
    const totalYesShares = dataWithoutDiscriminator.readBigUInt64LE(offset);
    offset += 8;

    // Read total_no_shares (8 bytes - u64)
    const totalNoShares = dataWithoutDiscriminator.readBigUInt64LE(offset);
    offset += 8;

    // Read expiry_time (8 bytes - i64)
    const expiryTime = dataWithoutDiscriminator.readBigInt64LE(offset);
    offset += 8;

    // Read phase (1 byte enum) - 0=Prediction, 1=Funding
    const phaseByte = dataWithoutDiscriminator[offset];
    offset += 1;

    // Read resolution (1 byte enum) - 0=Unresolved, 1=YesWins, 2=NoWins, 3=Refund
    const resolutionByte = dataWithoutDiscriminator[offset];
    offset += 1;

    // Read metadata_uri (String - 4 bytes length + data)
    const metadataUriLen = dataWithoutDiscriminator.readUInt32LE(offset);
    offset += 4;
    const metadataUri = decoder.decode(dataWithoutDiscriminator.slice(offset, offset + metadataUriLen));
    offset += metadataUriLen;

    // Read token_mint (Option<PublicKey> - 1 byte for Some/None + 32 bytes if Some)
    const hasTokenMint = dataWithoutDiscriminator[offset];
    offset += 1;
    const tokenMint = hasTokenMint
      ? new PublicKey(dataWithoutDiscriminator.slice(offset, offset + 32)).toBase58()
      : null;
    if (hasTokenMint) offset += 32;

    // Read platform_tokens_allocated (8 bytes - u64)
    const platformTokensAllocated = dataWithoutDiscriminator.readBigUInt64LE(offset);
    offset += 8;

    // Read platform_tokens_claimed (1 byte - bool)
    const platformTokensClaimed = dataWithoutDiscriminator[offset] !== 0;
    offset += 1;

    // Read yes_voter_tokens_allocated (8 bytes - u64)
    const yesVoterTokensAllocated = dataWithoutDiscriminator.readBigUInt64LE(offset);
    offset += 8;

    // Read treasury (32 bytes - PublicKey)
    const treasury = new PublicKey(dataWithoutDiscriminator.slice(offset, offset + 32));
    offset += 32;

    // Read bump (1 byte - u8)
    const bump = dataWithoutDiscriminator[offset];

    return {
      founder: founder.toBase58(),
      ipfsCid,
      targetPool: targetPool.toString(),
      poolBalance: poolBalance.toString(),
      distributionPool: distributionPool.toString(),
      yesPool: yesPool.toString(),
      noPool: noPool.toString(),
      totalYesShares: totalYesShares.toString(),
      totalNoShares: totalNoShares.toString(),
      expiryTime: expiryTime.toString(),
      phase: phaseByte,
      resolution: resolutionByte,
      metadataUri,
      tokenMint,
      platformTokensAllocated: platformTokensAllocated.toString(),
      platformTokensClaimed,
      yesVoterTokensAllocated: yesVoterTokensAllocated.toString(),
      treasury: treasury.toBase58(),
      bump,
    };
  } catch (error) {
    logger.error('Failed to parse market account:', error);
    throw error;
  }
}

/**
 * Parse Position account data
 */
export function parsePositionAccount(base64Data: string): ParsedPositionAccount {
  try {
    const accountData = Buffer.from(base64Data, 'base64');

    // Skip 8-byte discriminator
    const dataWithoutDiscriminator = accountData.slice(8);

    let offset = 0;

    // Read user (32 bytes - PublicKey)
    const user = new PublicKey(dataWithoutDiscriminator.slice(offset, offset + 32));
    offset += 32;

    // Read market (32 bytes - PublicKey)
    const market = new PublicKey(dataWithoutDiscriminator.slice(offset, offset + 32));
    offset += 32;

    // Read yes_shares (8 bytes - u64)
    const yesShares = dataWithoutDiscriminator.readBigUInt64LE(offset);
    offset += 8;

    // Read no_shares (8 bytes - u64)
    const noShares = dataWithoutDiscriminator.readBigUInt64LE(offset);
    offset += 8;

    // Read total_invested (8 bytes - u64)
    const totalInvested = dataWithoutDiscriminator.readBigUInt64LE(offset);
    offset += 8;

    // Read claimed (1 byte - bool)
    const claimed = dataWithoutDiscriminator[offset] !== 0;
    offset += 1;

    // Read bump (1 byte - u8)
    const bump = dataWithoutDiscriminator[offset];

    return {
      user: user.toBase58(),
      market: market.toBase58(),
      yesShares: yesShares.toString(),
      noShares: noShares.toString(),
      totalInvested: totalInvested.toString(),
      claimed,
      bump,
    };
  } catch (error) {
    logger.error('Failed to parse position account:', error);
    throw error;
  }
}

/**
 * Calculate derived fields from market data
 */
export function calculateDerivedFields(market: ParsedMarketAccount) {
  const poolBalance = BigInt(market.poolBalance);
  const targetPool = BigInt(market.targetPool);
  const totalYesShares = BigInt(market.totalYesShares);
  const totalNoShares = BigInt(market.totalNoShares);
  const yesPool = BigInt(market.yesPool);
  const noPool = BigInt(market.noPool);

  // Calculate pool progress percentage
  const poolProgressPercentage = targetPool > 0n
    ? Math.min(100, Number((poolBalance * 100n) / targetPool))
    : 0;

  // Calculate YES percentage based on shares (for winner determination)
  const totalShares = totalYesShares + totalNoShares;
  const sharesYesPercentage = totalShares > 0n
    ? Math.round(Number((totalYesShares * 100n) / totalShares))
    : 50;

  // Calculate YES percentage based on SOL staked (user-friendly display)
  // AMM mechanics: When buying YES, SOL goes to no_pool; when buying NO, SOL goes to yes_pool
  // Initial pools were both equal to target_pool
  const initialPool = targetPool;

  // YES buyers' SOL goes to no_pool (grows no_pool)
  // NO buyers' SOL goes to yes_pool (grows yes_pool)
  const yesStaked = noPool > initialPool ? noPool - initialPool : BigInt(0);
  const noStaked = yesPool > initialPool ? yesPool - initialPool : BigInt(0);

  const totalStaked = yesStaked + noStaked;

  // Calculate pool-based percentage (for active trading display)
  const poolBasedYesPercentage = totalStaked > BigInt(0)
    ? Math.round(Number((yesStaked * BigInt(100)) / totalStaked))
    : 50;

  // For resolved markets, use frozen share-based percentage (doesn't change with claims)
  // For active markets, use pool-based percentage (reflects current trading)
  const yesPercentage = market.resolution !== 0 ? sharesYesPercentage : poolBasedYesPercentage;

  // Determine available actions based on state
  const currentTime = Math.floor(Date.now() / 1000);
  const expiryTime = Number(market.expiryTime);
  const isExpired = currentTime >= expiryTime;
  const isResolved = market.resolution !== 0; // 0 = Unresolved

  const availableActions: string[] = [];

  if (!isResolved) {
    if (!isExpired && poolProgressPercentage < 100) {
      availableActions.push('vote');
    }

    if (isExpired || poolProgressPercentage >= 100) {
      availableActions.push('resolve');

      if (poolProgressPercentage >= 100 && sharesYesPercentage > 50) {
        availableActions.push('extend'); // Only if YES winning
      }
    }
  }

  if (isResolved) {
    availableActions.push('claim');
  }

  return {
    poolProgressPercentage,
    yesPercentage, // For display (based on SOL)
    sharesYesPercentage, // For winner logic (based on shares)
    totalYesStake: yesStaked.toString(),
    totalNoStake: noStaked.toString(),
    isExpired,
    isResolved,
    availableActions,
  };
}
