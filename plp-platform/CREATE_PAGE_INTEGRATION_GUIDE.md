# Create Page Integration Guide

**Status:** APIs Ready, Form Needs Updates
**Goal:** Connect create page to deployed program for on-chain market creation

---

## ✅ What's Already Done

1. **✅ Anchor Program Client** (`src/lib/anchor-program.ts`)
   - Transaction builders for all instructions
   - PDA derivation helpers
   - Market/Position/Treasury data fetchers

2. **✅ Prepare Transaction API** (`src/app/api/markets/prepare-transaction/route.ts`)
   - Builds unsigned transaction server-side
   - Returns serialized transaction for client signing
   - Validates target pool and duration

3. **✅ Complete Market API** (`src/app/api/markets/complete/route.ts`)
   - Saves market data to MongoDB after confirmation
   - Links market to project

4. **✅ Program Deployed** (`2CjwEvY3gkErkEmM5wnLpRv9fq3msHjnPDVPQmaWhF3G`)
   - Live on devnet
   - 10 instructions including rent recovery
   - IDL updated

---

## 🔧 What Needs to Change

### 1. Add Target Pool Field to Form

**File:** `src/app/create/page.tsx`

**Line 31** - Add to interface:
```typescript
interface ProjectFormData {
  name: string;
  description: string;
  // ... existing fields ...
  tokenSymbol: string;
  targetPool: string;  // 🔥 ADD THIS
  marketDuration: string;
  // ... rest of fields ...
}
```

**Line 52** - Add to initial state:
```typescript
const initialFormData: ProjectFormData = {
  name: '',
  // ... existing fields ...
  tokenSymbol: '',
  targetPool: '',  // 🔥 ADD THIS
  marketDuration: '',
  // ... rest of fields ...
};
```

**Line 81** - Add to required fields:
```typescript
const requiredFields = [
  'name', 'description', 'category', 'projectType',
  'projectStage', 'teamSize', 'tokenSymbol',
  'targetPool',  // 🔥 ADD THIS
  'marketDuration'
];
```

**Line 106** - Add validation:
```typescript
if (!formData.targetPool) newErrors.targetPool = 'Target pool is required';
```

**Line 470** (After marketDuration field) - Add UI:
```tsx
{/* Target Pool Size */}
<div className="space-y-2">
  <Label htmlFor="targetPool">
    Target Pool Size *
    <span className="ml-2 text-xs text-white/60">(How much SOL the market aims to collect)</span>
  </Label>
  <Select value={formData.targetPool} onValueChange={(value) => handleInputChange('targetPool', value)}>
    <SelectTrigger className={`bg-white/10 border-white/20 text-white ${errors.targetPool ? 'border-red-500' : ''}`}>
      <SelectValue placeholder="Choose target pool size..." />
    </SelectTrigger>
    <SelectContent className="bg-slate-800 border-white/20">
      <SelectItem value="5000000000">5 SOL (Small Project)</SelectItem>
      <SelectItem value="10000000000">10 SOL (Medium Project)</SelectItem>
      <SelectItem value="15000000000">15 SOL (Large Project)</SelectItem>
    </SelectContent>
  </Select>
  {errors.targetPool && <p className="text-sm text-red-400">{errors.targetPool}</p>}
  <p className="text-xs text-white/60">
    Larger pools provide more liquidity for trading but require more YES votes to reach the target.
  </p>
</div>
```

---

### 2. Show Creation Fee

**Line 470** (Before marketDuration field) - Add fee display:
```tsx
{/* Creation Fee Info */}
<div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
  <div className="flex items-start space-x-3">
    <div className="flex-shrink-0">
      <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <div className="flex-1">
      <h4 className="text-sm font-medium text-blue-400 mb-1">Market Creation Fee</h4>
      <p className="text-sm text-white/70">
        Creating a prediction market costs <span className="font-semibold text-white">0.015 SOL</span>.
        This one-time fee covers on-chain storage and helps prevent spam.
      </p>
      <p className="text-xs text-white/50 mt-2">
        You'll also need ~0.002 SOL for transaction rent (refundable when market closes).
      </p>
    </div>
  </div>
</div>
```

---

### 3. Update Transaction Flow

**Current Flow** (Lines 640-893):
The form already has most of the transaction signing logic, but it's calling old API endpoints.

**Changes Needed:**

#### Step A: Update API Endpoints

**Line 671** - Change from:
```typescript
const transactionResponse = await fetch('/api/projects/prepare-transaction', {
```

To:
```typescript
const transactionResponse = await fetch('/api/markets/prepare-transaction', {
```

**Line 673-684** - Change request body from:
```typescript
body: JSON.stringify({
  metadataUri: projectResult.data.metadataUri,
  projectName: formData.name,
  tokenSymbol: formData.tokenSymbol,
  marketDuration: parseInt(formData.marketDuration),
  creatorWalletAddress: primaryWallet.address
}),
```

To:
```typescript
body: JSON.stringify({
  founderWallet: primaryWallet.address,
  metadataUri: projectResult.data.metadataUri,
  targetPool: formData.targetPool,  // 🔥 NEW
  marketDuration: parseInt(formData.marketDuration),
}),
```

**Line 840** - Change from:
```typescript
const completeMarketResponse = await fetch('/api/projects/complete-market', {
```

To:
```typescript
const completeMarketResponse = await fetch('/api/markets/complete', {
```

**Line 842-856** - Change request body from:
```typescript
body: JSON.stringify({
  projectId: projectResult.data.projectId,
  marketAddress: transactionResult.data.marketAddress,
  signature,
  metadataUri: projectResult.data.metadataUri,
  targetPool: formData.targetPool,
  marketDuration: parseInt(formData.marketDuration)
}),
```

To:
```typescript
body: JSON.stringify({
  projectId: projectResult.data.projectId,
  marketAddress: transactionResult.data.marketPda,  // 🔥 CHANGED
  signature,
  ipfsCid: transactionResult.data.ipfsCid,  // 🔥 NEW
  targetPool: formData.targetPool,
  expiryTime: transactionResult.data.expiryTime,  // 🔥 NEW
}),
```

---

## 📊 Complete Flow After Changes

```
1. User Fills Form
   └─ Includes: name, description, category, team, symbol, targetPool*, duration*
   └─ Validates all fields
   └─ Shows creation fee: 0.015 SOL

2. Upload to IPFS (Client-Side)
   └─ Upload image (if provided)
   └─ Create metadata object
   └─ Upload metadata → Get metadataUri

3. Create Project in DB
   └─ POST /api/projects/create
   └─ Saves project to MongoDB
   └─ Returns projectId and metadataUri

4. Prepare Transaction (Server builds, client signs)
   └─ POST /api/markets/prepare-transaction
   └─ Server builds createMarket transaction
   └─ Returns serialized unsigned transaction
   └─ Returns marketPda, treasuryPda, expiryTime

5. Sign Transaction (Client)
   └─ Dynamic Labs wallet signs transaction
   └─ User approves in wallet popup

6. Send Transaction (Client)
   └─ Send signed transaction to Solana
   └─ Wait for confirmation
   └─ Get transaction signature

7. Complete Market (Save to DB)
   └─ POST /api/markets/complete
   └─ Saves market data to MongoDB
   └─ Links market to project
   └─ Updates project with marketAddress

8. Success!
   └─ Market created on-chain
   └─ Data saved in MongoDB
   └─ User sees success message
```

---

## 🎨 UI Preview (After Changes)

```
┌─────────────────────────────────────────────────────┐
│ Create Prediction Market                            │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Project Name: *                                      │
│ ┌────────────────────────────────────────────────┐  │
│ │ My Awesome DeFi Protocol                       │  │
│ └────────────────────────────────────────────────┘  │
│                                                      │
│ ... (other fields) ...                               │
│                                                      │
│ ┌────────────────────────────────────────────────┐  │
│ │ ⓘ Market Creation Fee                          │  │
│ │                                                 │  │
│ │ Creating a prediction market costs 0.015 SOL.  │  │
│ │ This one-time fee covers on-chain storage and  │  │
│ │ helps prevent spam.                             │  │
│ │                                                 │  │
│ │ You'll also need ~0.002 SOL for transaction    │  │
│ │ rent (refundable when market closes).          │  │
│ └────────────────────────────────────────────────┘  │
│                                                      │
│ Target Pool Size: *                                  │
│ ┌────────────────────────────────────────────────┐  │
│ │ Choose target pool size...             ▼      │  │
│ └────────────────────────────────────────────────┘  │
│   │                                                  │
│   ├─ 5 SOL (Small Project)                          │
│   ├─ 10 SOL (Medium Project)                        │
│   └─ 15 SOL (Large Project)                         │
│                                                      │
│ Market Duration: *                                   │
│ ┌────────────────────────────────────────────────┐  │
│ │ Choose market duration...              ▼      │  │
│ └────────────────────────────────────────────────┘  │
│   │                                                  │
│   ├─ 1 Day                                           │
│   ├─ 3 Days                                          │
│   ├─ 1 Week                                          │
│   ├─ 2 Weeks                                         │
│   └─ 1 Month                                         │
│                                                      │
│ ... (social links) ...                               │
│                                                      │
│        ┌─────────────────────────────────┐           │
│        │  🚀 Launch Prediction Market    │           │
│        └─────────────────────────────────┘           │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 🧪 Testing Checklist

After making these changes:

- [ ] Form loads without errors
- [ ] Target pool selector shows 3 options (5/10/15 SOL)
- [ ] Creation fee message displays
- [ ] All validation works
- [ ] Submitting triggers wallet popup
- [ ] Transaction gets signed
- [ ] Market created on-chain (check explorer)
- [ ] Market saved to MongoDB
- [ ] Success message shows market address
- [ ] Form resets after success

---

## 📝 Import Statements to Add

**Top of `src/app/create/page.tsx`** (around line 16):
```typescript
import { TARGET_POOL_OPTIONS, FEES } from '@/config/solana';
```

---

## 🔍 Exact Line Numbers for Changes

Due to the file being 930 lines, here's a summary:

| Change | Approximate Line | Description |
|--------|------------------|-------------|
| Add `targetPool` to interface | 31 | Add field to `ProjectFormData` |
| Add `targetPool` to initial state | 52 | Set default value `''` |
| Add to required fields | 81 | Add `'targetPool'` to array |
| Add validation | 106 | Check if `!formData.targetPool` |
| Add fee display UI | ~465 | Before marketDuration field |
| Add target pool selector UI | ~485 | After tokenSymbol field |
| Update prepare-transaction endpoint | 671 | Change to `/api/markets/prepare-transaction` |
| Update request body | 673-684 | Add `targetPool`, remove old fields |
| Update complete endpoint | 840 | Change to `/api/markets/complete` |
| Update complete request body | 842-856 | Add `ipfsCid`, `expiryTime` |

---

## ⚠️ Important Notes

1. **The form already has transaction signing logic** - we're just updating the API endpoints it calls
2. **Dynamic Labs integration is already working** - don't need to change that
3. **IPFS upload is already working** - keep that as is
4. **MongoDB save is already working** - just updating the endpoints

---

## 🚀 Quick Start (For You)

### Option 1: I Make the Changes
I can update the create page with all these changes. Just say "update the create page" and I'll do it.

### Option 2: You Review First
Review this guide, and if you want to make changes yourself, use this as a reference. Then tell me when you're ready to test.

### Option 3: Hybrid
I can make some changes (like adding targetPool field) and you can test, then we iterate.

---

**Which option do you prefer?**

I'm ready to update the create page as soon as you give the word! 🚀
