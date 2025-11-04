use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};
use anchor_spl::associated_token::AssociatedToken;
use crate::constants::*;
use crate::errors::ErrorCode;
use crate::state::*;

/// Resolve a market after expiry
///
/// Logic:
/// 1. Check expiry time has passed
/// 2. Check market is currently Unresolved
/// 3. Determine outcome:
///    - If total_yes_shares > total_no_shares → YesWins (trigger pump.fun stub, deduct 5% fee)
///    - If total_no_shares > total_yes_shares → NoWins (deduct 5% fee, prepare for distribution)
///    - If total_yes_shares == total_no_shares OR pool < target → Refund (no fees, full refund)
/// 4. Deduct completion fee (5%) from pool if YES/NO wins
/// 5. Update market.resolution status
///
/// Anyone can call this after market expiry (permissionless resolution)
#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(
        mut,
        constraint = market.resolution == MarketResolution::Unresolved @ ErrorCode::AlreadyResolved
    )]
    pub market: Account<'info, Market>,

    #[account(
        mut,
        seeds = [b"treasury"],
        bump = treasury.bump
    )]
    pub treasury: Account<'info, Treasury>,

    /// Token mint (created by pump.fun in previous instruction of same transaction)
    /// Only used/validated when resolution = YesWins
    /// CHECK: Validated during YesWins flow
    #[account(mut)]
    pub token_mint: UncheckedAccount<'info>,

    /// Market's token account to receive bought tokens
    /// Must be ATA of market PDA for the token_mint
    /// CHECK: Validated as ATA during YesWins flow
    #[account(mut)]
    pub market_token_account: UncheckedAccount<'info>,

    // -------------------------
    // Pump.fun accounts (for buy CPI when YES wins)
    // -------------------------

    /// Pump.fun global config PDA
    /// CHECK: Pump.fun program validates this
    #[account(mut)]
    pub pump_global: UncheckedAccount<'info>,

    /// Pump.fun bonding curve PDA for this token
    /// Derived from ["bonding-curve", token_mint]
    /// CHECK: Pump.fun program validates this
    #[account(mut)]
    pub bonding_curve: UncheckedAccount<'info>,

    /// Bonding curve's associated token account
    /// Holds the tokens in the bonding curve
    /// CHECK: Pump.fun program validates this
    #[account(mut)]
    pub bonding_curve_token_account: UncheckedAccount<'info>,

    /// Pump.fun fee recipient
    /// CHECK: Pump.fun program validates this
    #[account(mut)]
    pub pump_fee_recipient: UncheckedAccount<'info>,

    /// Pump.fun event authority PDA
    /// CHECK: Pump.fun program validates this
    pub pump_event_authority: UncheckedAccount<'info>,

    /// Pump.fun program
    /// CHECK: Hardcoded to pump.fun program ID
    pub pump_program: UncheckedAccount<'info>,

    /// Anyone can trigger resolution after expiry (permissionless)
    #[account(mut)]
    pub caller: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<ResolveMarket>) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let treasury = &mut ctx.accounts.treasury;

    // -------------------------
    // 1) Validate resolution permission
    // -------------------------

    let now = Clock::get()?.unix_timestamp;
    let is_expired = now >= market.expiry_time;
    let is_founder = ctx.accounts.caller.key() == market.founder;
    let in_funding_phase = market.phase == MarketPhase::Funding;
    let pool_is_full = market.pool_balance >= market.target_pool;
    let no_is_winning = market.total_no_shares > market.total_yes_shares;

    // Allow resolution if:
    // - Market has expired (anyone can resolve), OR
    // - Founder is resolving in Funding phase (early resolution for successful markets), OR
    // - Pool is full AND NO is winning (permissionless resolution for failed markets)
    require!(
        is_expired ||
        (is_founder && in_funding_phase) ||
        (pool_is_full && no_is_winning),
        ErrorCode::CannotResolveYet
    );

    msg!("🔍 Resolution authorization:");
    msg!("   Is expired: {}", is_expired);
    msg!("   Is founder: {}", is_founder);
    msg!("   In funding phase: {}", in_funding_phase);
    msg!("   Pool is full: {}", pool_is_full);
    msg!("   NO is winning: {}", no_is_winning);

    // -------------------------
    // 2) Determine resolution outcome
    // -------------------------

    let resolution = if market.pool_balance < market.target_pool {
        // Market failed to reach target pool → Refund
        MarketResolution::Refund
    } else if market.total_yes_shares > market.total_no_shares {
        // YES wins → Token launch
        MarketResolution::YesWins
    } else if market.total_no_shares > market.total_yes_shares {
        // NO wins → SOL distribution
        MarketResolution::NoWins
    } else {
        // Tie or no participation → Refund
        MarketResolution::Refund
    };

    msg!("🔍 Market resolution determined: {:?}", resolution);
    msg!("   total_yes_shares: {}", market.total_yes_shares);
    msg!("   total_no_shares: {}", market.total_no_shares);
    msg!("   pool_balance: {} lamports", market.pool_balance);
    msg!("   target_pool: {} lamports", market.target_pool);

    // -------------------------
    // 3) Process resolution
    // -------------------------

    match resolution {
        MarketResolution::YesWins => {
            // Deduct 5% completion fee from pool
            let completion_fee = (market.pool_balance * COMPLETION_FEE_BPS) / BPS_DIVISOR;

            // Transfer fee from market to treasury
            **market.to_account_info().try_borrow_mut_lamports()? -= completion_fee;
            **treasury.to_account_info().try_borrow_mut_lamports()? += completion_fee;

            // Update treasury total fees
            treasury.total_fees = treasury
                .total_fees
                .checked_add(completion_fee)
                .ok_or(ErrorCode::MathError)?;

            // Update market pool balance (95% remains for token creation)
            market.pool_balance = market
                .pool_balance
                .checked_sub(completion_fee)
                .ok_or(ErrorCode::MathError)?;

            msg!("✅ YES WINS - Initiating token launch");
            msg!("   Completion fee: {} lamports (5%)", completion_fee);
            msg!("   SOL for token launch: {} lamports", market.pool_balance);

            // -------------------------
            // Buy tokens on Pump.fun with remaining SOL
            // -------------------------
            // NOTE: Token was already created in previous instruction of same transaction
            // by founder using pump.fun create instruction

            // Verify pump.fun program ID
            let expected_pump_program = solana_program::pubkey!("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
            require!(
                ctx.accounts.pump_program.key() == expected_pump_program,
                ErrorCode::Unauthorized
            );

            msg!("   Token mint: {}", ctx.accounts.token_mint.key());
            msg!("   Buying tokens with {} lamports", market.pool_balance);

            // Call pump.fun buy via CPI
            // Market PDA buys tokens with its pool SOL
            let founder_key = market.founder;
            let ipfs_hash = anchor_lang::solana_program::hash::hash(market.ipfs_cid.as_bytes());
            let market_seeds = &[
                b"market",
                founder_key.as_ref(),
                ipfs_hash.as_ref(),
                &[market.bump],
            ];
            let signer_seeds = &[&market_seeds[..]];

            pump::cpi::buy(
                CpiContext::new_with_signer(
                    ctx.accounts.pump_program.to_account_info(),
                    pump::cpi::accounts::Buy {
                        global: ctx.accounts.pump_global.to_account_info(),
                        fee_recipient: ctx.accounts.pump_fee_recipient.to_account_info(),
                        mint: ctx.accounts.token_mint.to_account_info(),
                        bonding_curve: ctx.accounts.bonding_curve.to_account_info(),
                        associated_bonding_curve: ctx.accounts.bonding_curve_token_account.to_account_info(),
                        associated_user: ctx.accounts.market_token_account.to_account_info(),
                        user: market.to_account_info(),
                        system_program: ctx.accounts.system_program.to_account_info(),
                        token_program: ctx.accounts.token_program.to_account_info(),
                        rent: ctx.accounts.rent.to_account_info(),
                        event_authority: ctx.accounts.pump_event_authority.to_account_info(),
                        program: ctx.accounts.pump_program.to_account_info(),
                    },
                    signer_seeds,
                ),
                market.pool_balance, // amount of tokens to buy (in lamports of SOL)
                market.pool_balance, // max SOL cost (use all pool SOL)
            )?;

            // Get total tokens bought by checking market's token account balance
            let market_token_acct = TokenAccount::try_deserialize(
                &mut &ctx.accounts.market_token_account.try_borrow_data()?[..]
            )?;
            let total_tokens = market_token_acct.amount;

            // Set token mint in market state
            market.token_mint = Some(ctx.accounts.token_mint.key());

            // Update pool balance to 0 (all SOL was used to buy tokens)
            market.pool_balance = 0;

            msg!("   Total tokens acquired: {}", total_tokens);

            // -------------------------
            // Calculate token distribution (79% / 20% / 1%)
            // -------------------------

            let platform_tokens = (total_tokens * PLATFORM_TOKEN_SHARE_BPS) / BPS_DIVISOR;
            let team_tokens = (total_tokens * TEAM_TOKEN_SHARE_BPS) / BPS_DIVISOR;
            let yes_voter_tokens = total_tokens
                .checked_sub(platform_tokens)
                .and_then(|v| v.checked_sub(team_tokens))
                .ok_or(ErrorCode::MathError)?;

            // Store token allocations
            market.platform_tokens_allocated = platform_tokens;
            market.yes_voter_tokens_allocated = yes_voter_tokens;

            msg!("");
            msg!("   📊 TOKEN DISTRIBUTION:");
            msg!("   Platform (1%): {} tokens", platform_tokens);
            msg!("   Team (20%): {} tokens", team_tokens);
            msg!("   └─ Immediate (5%): {} tokens", team_tokens / 4); // 5/20 = 1/4
            msg!("   └─ Vested (15%, 12mo linear): {} tokens", (team_tokens * 3) / 4); // 15/20 = 3/4
            msg!("   YES voters (79%): {} tokens", yes_voter_tokens);
            msg!("");
            msg!("   ⏭️  NEXT STEPS:");
            msg!("   1. Initialize team vesting account (call init_team_vesting)");
            msg!("   2. YES voters claim tokens (call claim_rewards)");
            msg!("   3. Platform claims 1% (call claim_platform_tokens)");
            msg!("   4. Team claims vested tokens monthly (call claim_team_tokens)");
        }

        MarketResolution::NoWins => {
            // Deduct 5% completion fee from pool
            let completion_fee = (market.pool_balance * COMPLETION_FEE_BPS) / BPS_DIVISOR;

            // Transfer fee from market to treasury
            **market.to_account_info().try_borrow_mut_lamports()? -= completion_fee;
            **treasury.to_account_info().try_borrow_mut_lamports()? += completion_fee;

            // Update treasury total fees
            treasury.total_fees = treasury
                .total_fees
                .checked_add(completion_fee)
                .ok_or(ErrorCode::MathError)?;

            // Update market pool balance (95% remains for NO voter distribution)
            market.pool_balance = market
                .pool_balance
                .checked_sub(completion_fee)
                .ok_or(ErrorCode::MathError)?;

            msg!("✅ NO WINS");
            msg!("   Completion fee: {} lamports (5%)", completion_fee);
            msg!("   Remaining for distribution: {} lamports", market.pool_balance);
            msg!("   NO voters can now claim proportional SOL rewards");
        }

        MarketResolution::Refund => {
            // No fees deducted for refunds
            msg!("↩️  REFUND");
            msg!("   Market did not reach target or ended in tie");
            msg!("   All participants can claim full refunds");
            msg!("   No fees deducted");
        }

        MarketResolution::Unresolved => {
            // This shouldn't happen due to our logic above
            return Err(ErrorCode::InvalidResolutionState.into());
        }
    }

    // -------------------------
    // 4) Update market resolution state
    // -------------------------

    market.resolution = resolution;

    msg!("🏁 Market resolved successfully");
    msg!("   Final resolution: {:?}", market.resolution);

    Ok(())
}
