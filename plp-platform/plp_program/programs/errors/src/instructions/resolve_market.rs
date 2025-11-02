use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::ErrorCode;
use crate::state::*;
use crate::utils::pump_fun_create_and_buy_token;

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

    /// Anyone can trigger resolution after expiry (permissionless)
    #[account(mut)]
    pub caller: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ResolveMarket>) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let treasury = &mut ctx.accounts.treasury;

    // -------------------------
    // 1) Validate expiry
    // -------------------------

    let now = Clock::get()?.unix_timestamp;
    require!(now >= market.expiry_time, ErrorCode::MarketNotExpired);

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
            // Launch token on Pump.fun and buy with remaining SOL
            // -------------------------

            // Extract token name/symbol from IPFS CID or use defaults
            // TODO: Parse from metadata_uri if needed
            let token_name = format!("PLP-{}", &market.ipfs_cid[..8]);
            let token_symbol = format!("PLP{}", &market.ipfs_cid[..4].to_uppercase());

            // Call Pump.fun to create token and buy with all SOL
            let (token_mint, total_tokens) = pump_fun_create_and_buy_token(
                &token_name,
                &token_symbol,
                &market.metadata_uri,
                market.pool_balance,
            )?;

            // Set token mint in market
            market.token_mint = Some(token_mint);

            msg!("   Token mint: {}", token_mint);
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
