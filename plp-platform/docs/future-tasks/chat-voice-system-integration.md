# Chat & Voice System Integration - Future Task

## Overview
Add real-time chat and voice communication to each market page, turning every project into a live community hub.

## Goal
- Text chat for community discussion
- Voice chat for live conversations (radio-style)
- Auto-configure per market (using `marketAddress` as channel/room ID)
- Wallet-based authentication
- Show YES/NO position badges for users

---

## Research Summary

### Two Main Options Evaluated

1. **Rocket.Chat** - Production-ready, feature-complete
2. **free4chat** - Lightweight, privacy-first, Elixir-based

---

## Rocket.Chat (Recommended for Quick Launch)

### Pros
- ✅ Production-ready from day 1
- ✅ Text + voice + video + screen sharing all included
- ✅ REST API for auto-creating channels per market
- ✅ Embeddable iframe/SDK
- ✅ 40k+ GitHub stars, battle-tested
- ✅ Mobile apps available
- ✅ Message moderation, reactions, threads, search built-in
- ✅ Can launch in 1 week

### Cons
- ❌ Resource heavy (Node.js single-threaded)
- ❌ Requires separate MongoDB server
- ❌ Higher costs (~$11-28/mo depending on scale)
- ❌ Overkill features (many we don't need)
- ❌ Not web3-native (need custom wallet auth)
- ❌ Performance issues at very high scale (100k+ messages)

### Cost Breakdown (Monthly)
- **Small (200 users, 50 concurrent)**: $11-17/mo
  - Hetzner: 2 vCPU, 2GB RAM - €4.99/mo
  - MongoDB: 2GB RAM - €4.99/mo
- **Medium (500 users, 100 concurrent)**: $17-28/mo
- **Large (1000+ concurrent)**: $39-56/mo

### Server Requirements
- Up to 500 users: 2 vCPU, 2GB RAM, 40GB SSD
- Up to 1000 users: 4 vCPU, 4-8GB RAM
- 5000+ users: 16 vCPU, 12GB RAM + MongoDB cluster

### Repository
https://github.com/RocketChat/Rocket.Chat

---

## free4chat (Recommended for Custom Solution)

### Pros
- ✅ Lightweight and fast (Elixir/Erlang)
- ✅ Privacy-first, local-first design (web3-aligned)
- ✅ WebRTC P2P voice (low latency, scales well)
- ✅ Much lower costs (~$6-17/mo)
- ✅ Easy to customize (smaller codebase)
- ✅ MIT license - fully open source
- ✅ React/TypeScript frontend (matches our stack)
- ✅ Distributed by design (Erlang OTP)
- ✅ No separate database needed for small scale

### Cons
- ❌ Less mature (1.1k stars vs 40k)
- ❌ Smaller community, less documentation
- ❌ Basic text chat (no file sharing, limited history)
- ❌ No mobile apps
- ❌ No built-in moderation tools
- ❌ Requires TURN server setup (coturn)
- ❌ Need to add features yourself
- ❌ Deployment complexity (Elixir less common)
- ❌ 2-3 weeks development time

### Cost Breakdown (Monthly)
- **Small (100-200 concurrent)**: $6-11/mo
  - Hetzner: 2 vCPU, 2GB RAM - €4.99/mo
  - TURN server: same server or €4.99/mo separate
- **Medium (500 concurrent)**: $11-17/mo
- **Large (1000+ concurrent)**: $17-28/mo

### Tech Stack
- Backend: Elixir/Phoenix, Membrane Framework
- Frontend: React, TypeScript, Tailwind CSS
- Communication: WebSocket, WebRTC
- Database: Optional (uses localStorage for messages)

### Repository
https://github.com/i365dev/free4chat

---

## Other Options Considered

### Stream Chat + Huddle01
- **Stream Chat** for text: $99/mo after 25 MAU free tier
- **Huddle01** for voice: Web3-native, free tier available
- **Total**: $0-200/mo depending on scale
- **Pros**: Purpose-built for each use case, modern SDKs
- **Cons**: Two separate integrations, higher cost

### Build Custom with Socket.IO + WebRTC
- We already have Socket.IO running (port 3001)
- Reference: https://github.com/varunon9/webRTC
- **Time**: 2-3 weeks development
- **Cost**: Just server costs (~$6/mo)
- **Pros**: Full control, no ongoing licensing
- **Cons**: Maintenance burden, need to build everything

---

## Recommended Implementation Strategy

### Phase 1: Quick Launch (Week 1-4)
**Use Rocket.Chat**
1. Deploy Rocket.Chat on Hetzner (€4.99/mo)
2. Deploy MongoDB (€4.99/mo)
3. Integrate REST API for auto-channel creation per `marketAddress`
4. Add Solana wallet authentication
5. Embed chat widget in market page
6. Test with users

**Total Cost**: ~$11-17/mo

### Phase 2: Monitor & Validate (Month 1-3)
- Track usage metrics (active chatters, messages/day, engagement rate)
- Monitor server costs and performance
- Gather user feedback
- Decide if chat is valuable enough to continue

### Phase 3: Optimize (Month 4+) - IF NEEDED
**If costs climb OR want more control:**
1. Fork free4chat
2. Customize for our use case
3. Add wallet authentication
4. Add moderation features
5. Migrate users from Rocket.Chat
6. Reduce costs by ~50%

**This approach:**
- ✅ Ships quickly (1 week vs 3 weeks)
- ✅ Validates demand before over-engineering
- ✅ Provides escape hatch if needed
- ✅ Learns what users actually want

---

## Integration Points

### Market Page Integration
Location: `src/app/market/[id]/page.tsx`

Replace or extend the LiveActivityFeed section (lines 1974-1988) with tabbed interface:

```tsx
<CommunityHub marketId={params.id} marketAddress={market.marketAddress}>
  <Tab id="activity">Activity Feed</Tab>
  <Tab id="chat">Chat</Tab>
  <Tab id="voice">Voice Room</Tab>
</CommunityHub>
```

### Auto-Configuration
- Channel/Room ID: Use `market.marketAddress` (Solana public key)
- User ID: Use `primaryWallet.address`
- User Display: Show position badge (YES/NO)
- Permissions: Project creator gets moderator role

### Authentication
- Sign message with Solana wallet to prove ownership
- Username: Shortened wallet address (e.g., "Ab3d...7xYz")
- Avatar: Generated from wallet address or ENS/SNS

---

## Success Metrics

### Track These KPIs
1. **Adoption Rate**: % of market page visitors who use chat
2. **Daily Active Chatters**: Unique users per day
3. **Messages per Market**: Average messages per project
4. **Engagement Time**: Time spent in chat vs just viewing market
5. **Voice Participation**: % who join voice rooms

### Decision Thresholds
- **Keep Chat If**: >10% of visitors engage with chat
- **Add Voice If**: >5% request voice or use it when available
- **Migrate to Custom If**: Costs exceed $30/mo OR need more features

---

## Technical Resources

### Rocket.Chat
- Docs: https://docs.rocket.chat
- API: https://developer.rocket.chat/reference/api
- Docker: `docker run -p 3000:3000 rocket.chat`
- React SDK: https://github.com/RocketChat/Rocket.Chat.ReactNative

### free4chat
- Repo: https://github.com/i365dev/free4chat
- Elixir: https://elixir-lang.org
- Membrane Framework: https://membrane.stream
- Phoenix: https://phoenixframework.org

### WebRTC References
- Simple Example: https://github.com/varunon9/webRTC
- Group Chat: https://github.com/anoek/webrtc-group-chat-example

---

## Next Steps (When Ready)

### To Start Implementation:
1. ✅ Create Hetzner account
2. ✅ Deploy Rocket.Chat via Docker
3. ✅ Deploy MongoDB
4. ✅ Set up SSL certificate
5. ✅ Test API integration
6. ✅ Build React component wrapper
7. ✅ Add wallet authentication
8. ✅ Style to match brand
9. ✅ Test with small group
10. ✅ Launch to production

### Estimated Timeline
- **Rocket.Chat**: 1 week
- **free4chat**: 2-3 weeks
- **Custom build**: 3-4 weeks

---

## Cost Summary

| Solution | Small Scale | Medium Scale | Large Scale | Dev Time |
|----------|-------------|--------------|-------------|----------|
| **Rocket.Chat** | $11-17/mo | $17-28/mo | $39-56/mo | 1 week |
| **free4chat** | $6-11/mo | $11-17/mo | $17-28/mo | 2-3 weeks |
| **Stream + Huddle01** | $0-100/mo | $100-200/mo | $200+/mo | 1-2 weeks |
| **Custom Build** | $6/mo | $12/mo | $24/mo | 3-4 weeks |

**Recommendation**: Start with Rocket.Chat for quick launch, migrate to free4chat if needed later.

---

## Notes
- This task is for future implementation - not immediate priority
- Research completed: November 30, 2025
- Decision: Launch when ready to add community features
- Alternative: Could also integrate Discord/Telegram bots as interim solution
