use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::ErrorCode;
use crate::state::*;

/// Initialize team vesting schedule after YES wins
///
/// Must be called after resolve_market when market.resolution == YesWins
/// Sets up 12-month linear vesting for team's 20% token allocation
#[derive(Accounts)]
pub struct InitTeamVesting<'info> {
    #[account(
        mut,
        constraint = market.resolution == MarketResolution::YesWins @ ErrorCode::InvalidResolutionState,
        constraint = market.token_mint.is_some() @ ErrorCode::InvalidResolutionState
    )]
    pub market: Account<'info, Market>,

    #[account(
        init,
        payer = caller,
        space = TeamVesting::SPACE,
        seeds = [b"team_vesting", market.key().as_ref()],
        bump
    )]
    pub team_vesting: Account<'info, TeamVesting>,

    /// Team wallet that will receive vested tokens (typically the founder)
    /// CHECK: Can be any valid pubkey, will be stored for later claims
    pub team_wallet: UncheckedAccount<'info>,

    /// Caller pays for account creation (can be anyone)
    #[account(mut)]
    pub caller: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitTeamVesting>, total_token_supply: u64) -> Result<()> {
    let team_vesting = &mut ctx.accounts.team_vesting;
    let market = &ctx.accounts.market;

    use crate::constants::{BPS_DIVISOR, TEAM_TOKEN_SHARE_BPS, TEAM_IMMEDIATE_SHARE_BPS, TEAM_VESTED_SHARE_BPS};

    // -------------------------
    // Calculate team allocation (20% total = 5% immediate + 15% vested)
    // -------------------------

    let team_tokens = (total_token_supply * TEAM_TOKEN_SHARE_BPS) / BPS_DIVISOR;
    let immediate_tokens = (total_token_supply * TEAM_IMMEDIATE_SHARE_BPS) / BPS_DIVISOR;
    let vesting_tokens = (total_token_supply * TEAM_VESTED_SHARE_BPS) / BPS_DIVISOR;

    require!(team_tokens > 0, ErrorCode::InsufficientBalance);
    require!(immediate_tokens > 0, ErrorCode::InsufficientBalance);
    require!(vesting_tokens > 0, ErrorCode::InsufficientBalance);

    // -------------------------
    // Initialize vesting schedule
    // -------------------------

    let current_time = Clock::get()?.unix_timestamp;

    team_vesting.market = market.key();
    team_vesting.team_wallet = ctx.accounts.team_wallet.key();
    team_vesting.token_mint = market.token_mint.unwrap();
    team_vesting.total_tokens = team_tokens;
    team_vesting.immediate_tokens = immediate_tokens;
    team_vesting.vesting_tokens = vesting_tokens;
    team_vesting.claimed_tokens = 0;
    team_vesting.immediate_claimed = false;
    team_vesting.vesting_start = current_time;
    team_vesting.vesting_duration = TeamVesting::VESTING_DURATION_SECONDS;
    team_vesting.bump = ctx.bumps.team_vesting;

    msg!("✅ TEAM VESTING INITIALIZED");
    msg!("   Market: {}", market.key());
    msg!("   Team wallet: {}", team_vesting.team_wallet);
    msg!("   Token mint: {}", team_vesting.token_mint);
    msg!("   Total team tokens: {} (20%)", team_tokens);
    msg!("   └─ Immediate (5%): {} tokens (claimable now)", immediate_tokens);
    msg!("   └─ Vested (15%): {} tokens (12 month linear)", vesting_tokens);
    msg!("   Vesting start: {}", current_time);
    msg!("   Vesting duration: {} seconds (12 months)", team_vesting.vesting_duration);
    msg!("   First vested unlock: {} (1 month from now)", current_time + (team_vesting.vesting_duration / 12));
    msg!("");
    msg!("   Team can claim 5% immediately + vested tokens monthly using claim_team_tokens");

    Ok(())
}
