use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::constants::*;
use crate::errors::ErrorCode;
use crate::state::*;

/// Create a new prediction market (project).
///
/// PDA layout:
/// - Market PDA = seeds: ["market", founder, hash(ipfs_cid)]
///   (IPFS CIDs can be 59 bytes, but PDA seeds are limited to 32 bytes each)
///
/// Charges 0.015 SOL creation fee to treasury
/// Initializes Constant Product AMM with equal pools (yes_pool = no_pool = target_pool)
/// This starts the market at 50/50 price (0.5 probability for each side)
#[derive(Accounts)]
#[instruction(ipfs_cid: String)]
pub struct CreateMarket<'info> {
    /// Market account (PDA, program-owned)
    #[account(
        init,
        payer = founder,
        space = Market::SPACE,
        seeds = [b"market", founder.key().as_ref(), anchor_lang::solana_program::hash::hash(ipfs_cid.as_bytes()).as_ref()],
        bump
    )]
    pub market: Account<'info, Market>,

    /// Global Treasury PDA (receives creation fee)
    #[account(
        mut,
        seeds = [b"treasury"],
        bump = treasury.bump
    )]
    pub treasury: Account<'info, Treasury>,

    /// Project founder / creator
    #[account(mut)]
    pub founder: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateMarket>,
    ipfs_cid: String,
    target_pool: u64,
    expiry_time: i64,
    metadata_uri: String,
) -> Result<()> {
    let market = &mut ctx.accounts.market;

    // -------------------------
    // 1) Validate inputs
    // -------------------------

    // Enforce minimum target pool (0.5 SOL minimum)
    // Frontend can restrict to specific values (5/10/15 SOL for production)
    const MIN_POOL_LAMPORTS: u64 = 500_000_000; // 0.5 SOL
    require!(
        target_pool >= MIN_POOL_LAMPORTS,
        ErrorCode::InvalidTargetPool
    );

    // Validate IPFS CID length
    require!(
        ipfs_cid.len() <= MAX_IPFS_CID_LEN,
        ErrorCode::InvalidMetadata
    );

    // Validate metadata URI length
    require!(
        metadata_uri.len() <= MAX_METADATA_URI_LEN,
        ErrorCode::InvalidMetadata
    );

    // Expiry must be in the future
    let now = Clock::get()?.unix_timestamp;
    require!(expiry_time > now, ErrorCode::MarketNotExpired);

    // -------------------------
    // 2) Transfer creation fee to treasury
    // -------------------------

    let creation_fee_transfer = system_program::Transfer {
        from: ctx.accounts.founder.to_account_info(),
        to: ctx.accounts.treasury.to_account_info(),
    };

    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            creation_fee_transfer,
        ),
        CREATION_FEE_LAMPORTS,
    )?;

    // Update treasury total fees
    ctx.accounts.treasury.total_fees = ctx
        .accounts
        .treasury
        .total_fees
        .checked_add(CREATION_FEE_LAMPORTS)
        .ok_or(ErrorCode::MathError)?;

    // -------------------------
    // 3) Initialize market data
    // -------------------------

    market.founder = ctx.accounts.founder.key();
    market.ipfs_cid = ipfs_cid.clone();
    market.target_pool = target_pool;
    market.pool_balance = 0;
    market.distribution_pool = 0; // Set during resolution

    // Initialize Constant Product AMM pools
    // Both pools start equal to target_pool for 50/50 initial price
    // k = yes_pool * no_pool defines the liquidity
    // Starting price: YES = 0.5, NO = 0.5
    market.yes_pool = target_pool;
    market.no_pool = target_pool;

    // Initialize share counters (for determining winner at expiry)
    market.total_yes_shares = 0;
    market.total_no_shares = 0;

    market.expiry_time = expiry_time;
    market.phase = MarketPhase::Prediction;
    market.resolution = MarketResolution::Unresolved;
    market.metadata_uri = metadata_uri;
    market.token_mint = None;
    market.platform_tokens_allocated = 0;
    market.platform_tokens_claimed = false;
    market.yes_voter_tokens_allocated = 0;
    market.treasury = ctx.accounts.treasury.key();
    market.bump = ctx.bumps.market;

    msg!("✅ Market created");
    msg!("   Founder: {}", market.founder);
    msg!("   IPFS CID: {}", market.ipfs_cid);
    msg!("   Target pool: {} lamports ({} SOL)", target_pool, target_pool / 1_000_000_000);
    msg!("   Initial AMM yes_pool: {} lamports", market.yes_pool);
    msg!("   Initial AMM no_pool: {} lamports", market.no_pool);
    msg!("   Initial k (liquidity): {}", (market.yes_pool as u128) * (market.no_pool as u128));
    msg!("   Starting price: YES = 0.5, NO = 0.5");
    msg!("   Expiry: {}", market.expiry_time);
    msg!("   Creation fee charged: {} lamports", CREATION_FEE_LAMPORTS);

    Ok(())
}
