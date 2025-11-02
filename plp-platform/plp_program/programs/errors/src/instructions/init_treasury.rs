use anchor_lang::prelude::*;
use crate::errors::ErrorCode;
use crate::state::Treasury;
use std::str::FromStr; // ✅ Needed for Pubkey::from_str()

#[derive(Accounts)]
pub struct InitTreasury<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + Treasury::INIT_SPACE,
        seeds = [b"treasury"],
        bump
    )]
    pub treasury: Account<'info, Treasury>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitTreasury>) -> Result<()> {
    let t = &mut ctx.accounts.treasury;

    // ✅ Allow only the program deployer to initialize.
    // Devnet deployer wallet
    let deployer_key = Pubkey::from_str("Djw83UQZaEmrmd3YCW9kCHv6ZJUY9V2LGNrcSuUXwB7c") // Devnet deployer
        .map_err(|_| error!(ErrorCode::Unauthorized))?;

    require_keys_eq!(
        ctx.accounts.payer.key(),
        deployer_key,
        ErrorCode::Unauthorized
    );

    // ✅ Standard treasury setup
    t.admin = ctx.accounts.payer.key();
    t.total_fees = 0;

    let (_pda, bump) = Pubkey::find_program_address(&[b"treasury"], ctx.program_id);
    t.bump = bump;

    msg!("✅ Treasury initialized by deployer: {}", t.admin);
    Ok(())
}
