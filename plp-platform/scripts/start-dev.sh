#!/bin/bash

echo "🧹 Cleaning up old processes..."
killall node npm 2>/dev/null || true
sleep 2

echo "🗑️  Clearing Next.js cache..."
rm -rf .next

echo ""
echo "✅ Ready to start!"
echo ""
echo "📝 Please open TWO terminal windows and run:"
echo ""
echo "   Terminal 1: npm run dev"
echo "   Terminal 2: npx tsx scripts/start-sync-system.ts"
echo ""
echo "⚠️  Make sure to use 'npm run dev' (NOT 'npm run dev:unified')"
echo ""
