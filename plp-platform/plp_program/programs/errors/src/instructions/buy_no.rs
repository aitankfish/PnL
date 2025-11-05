use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::constants::*;
use crate::errors::ErrorCode;
use crate::state::*;
use crate::utils::amm::*;

/// Buy NO shares with SOL
///
/// Flow:
/// 1. Validate market is active and not expired
/// 2. Validate minimum investment (0.01 SOL)
/// 3. Check one-position rule (user cannot have YES shares)
/// 4. Deduct 1.5% trade fee → treasury
/// 5. Transfer net SOL (98.5%) → market pool
/// 6. Calculate shares using Constant Product AMM (x * y = k)
/// 7. Update position.no_shares and AMM pools (yes_pool, no_pool)
#[derive(Accounts)]
pub struct BuyNo<'info> {
    #[account(
        mut,
        constraint = market.resolution == MarketResolution::Unresolved @ ErrorCode::AlreadyResolved
    )]
    pub market: Account<'info, Market>,

    #[account(
        init_if_needed,
        payer = user,
        space = Position::SPACE,
        seeds = [b"position", market.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub position: Account<'info, Position>,

    #[account(
        mut,
        seeds = [b"treasury"],
        bump = treasury.bump
    )]
    pub treasury: Account<'info, Treasury>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<BuyNo>, sol_amount: u64) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let position = &mut ctx.accounts.position;

    // -------------------------
    // 1) Validation checks
    // -------------------------

    // Check market hasn't expired
    let now = Clock::get()?.unix_timestamp;
    require!(now < market.expiry_time, ErrorCode::MarketExpired);

    // Check minimum investment
    require!(
        sol_amount >= MIN_INVESTMENT_LAMPORTS,
        ErrorCode::InvestmentTooSmall
    );

    // -------------------------
    // Calculate fees first to check capacity properly
    // -------------------------

    let trade_fee = (sol_amount * TRADE_FEE_BPS) / BPS_DIVISOR;
    let net_amount = sol_amount
        .checked_sub(trade_fee)
        .ok_or(ErrorCode::MathError)?;

    // Check pool cap only in Prediction phase
    // In Funding phase (after extension), trading can continue beyond target
    if market.phase == MarketPhase::Prediction {
        let new_pool_balance = market
            .pool_balance
            .checked_add(net_amount)
            .ok_or(ErrorCode::MathError)?;

        require!(
            new_pool_balance <= market.target_pool,
            ErrorCode::CapReached
        );
    }

    // One position rule: if user has YES shares, they cannot buy NO
    require!(
        position.yes_shares == 0,
        ErrorCode::AlreadyHasPosition
    );

    // -------------------------
    // 2) Transfer fee to treasury
    // -------------------------

    let fee_transfer = system_program::Transfer {
        from: ctx.accounts.user.to_account_info(),
        to: ctx.accounts.treasury.to_account_info(),
    };

    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            fee_transfer,
        ),
        trade_fee,
    )?;

    // Update treasury total fees
    ctx.accounts.treasury.total_fees = ctx
        .accounts
        .treasury
        .total_fees
        .checked_add(trade_fee)
        .ok_or(ErrorCode::MathError)?;

    // -------------------------
    // 3) Transfer net amount to market (stays in market account for tracking)
    // -------------------------

    let net_transfer = system_program::Transfer {
        from: ctx.accounts.user.to_account_info(),
        to: market.to_account_info(),
    };

    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            net_transfer,
        ),
        net_amount,
    )?;

    // Update market pool balance
    market.pool_balance = market
        .pool_balance
        .checked_add(net_amount)
        .ok_or(ErrorCode::MathError)?;

    // -------------------------
    // 4) Calculate shares using Constant Product AMM
    // -------------------------

    let shares = calculate_shares_from_sol(
        market.yes_pool,
        market.no_pool,
        net_amount,
        false, // buy_yes = false
    )?;

    require!(shares > 0, ErrorCode::MathError);

    // -------------------------
    // 5) Update market and position state
    // -------------------------

    // Update AMM pools
    // When buying NO: NO pool decreases (shares removed), YES pool increases (SOL added)
    market.no_pool = market
        .no_pool
        .checked_sub(shares)
        .ok_or(ErrorCode::MathError)?;

    market.yes_pool = market
        .yes_pool
        .checked_add(net_amount)
        .ok_or(ErrorCode::MathError)?;

    // Track total NO shares distributed (for determining winner at expiry)
    market.total_no_shares = market
        .total_no_shares
        .checked_add(shares)
        .ok_or(ErrorCode::MathError)?;

    // Initialize position if needed
    if position.user == Pubkey::default() {
        position.user = ctx.accounts.user.key();
        position.market = market.key();
        position.yes_shares = 0;
        position.no_shares = 0;
        position.total_invested = 0;
        position.claimed = false;
        position.bump = ctx.bumps.position;
    }

    // Update position
    position.no_shares = position
        .no_shares
        .checked_add(shares)
        .ok_or(ErrorCode::MathError)?;

    position.total_invested = position
        .total_invested
        .checked_add(sol_amount)
        .ok_or(ErrorCode::MathError)?;

    msg!("✅ BUY NO");
    msg!("   User: {}", ctx.accounts.user.key());
    msg!("   SOL spent: {} lamports", sol_amount);
    msg!("   Trade fee: {} lamports (1.5%)", trade_fee);
    msg!("   Net to pool: {} lamports", net_amount);
    msg!("   Shares received: {}", shares);
    msg!("   New position no_shares: {}", position.no_shares);
    msg!("   New AMM yes_pool: {}", market.yes_pool);
    msg!("   New AMM no_pool: {}", market.no_pool);
    msg!("   New pool balance: {}", market.pool_balance);

    Ok(())
}
