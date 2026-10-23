# Integration discovery — 23 October 2026

This is an initial capability assessment, not a declaration of implemented adapters. Recheck scopes and account-specific quotas in each developer console before implementation. Meta's Threads documentation returned HTTP 429 during research; its details remain unverified. Never substitute scraping for unavailable access.

| Channel | Eligibility/auth | Publishing/scheduling | Community/analytics | Review, limits, transport | Release status |
|---|---|---|---|---|---|
| Instagram | Professional account; OAuth; login variant determines permissions and Page-link requirements | Image, carousel, Reels; Stories eligibility varies; local durable scheduler needed | Professional-account comments, messaging and insights require separate scopes and eligibility | Meta app review; endpoint/business-use quotas; webhooks + reconciliation | Not implemented; reverify exact scopes and messaging windows |
| Pinterest | Developer app + authorized account; OAuth scopes for Pins/boards/read analytics | Pins to authorized boards; schedule via worker | Pin/account analytics; no assumed DM/comment automation | Trial vs Standard access; category-specific rate limits; polling | Not implemented |
| YouTube | Google project, channel and OAuth; upload/read/moderation scopes selected per feature | Video/Short uploads; private-to-public scheduled publish where eligible | Comment APIs; separate Analytics API authorization; no general DM API | Upload visibility restrictions for unverified projects; compliance audit; quotas in console; poll comments | Not implemented |
| TikTok | Registered app, creator authorization and video.publish approval | Direct Post or upload handoff; required creator-info checks and explicit UX consent | Do not assume inbox or analytics access from Content Posting permission | Unaudited clients restricted to private visibility; audit, creator limits and verified media domains | Not implemented |
| Threads | Official Meta app required | Publishing capability must be reverified before adapter work | Replies/insights scopes must be checked; no DM promise | Official docs rate-limited during this assessment | Unverified; manual handoff only |
| X | Developer project, credits and user authorization; endpoint-specific read/write/DM scopes | Posts/media/thread orchestration; worker scheduling | Replies, metrics, DM access depend on endpoint and granted scopes | Pay per resource/action, endpoint rate limits; Activity API events priced separately | Not implemented |
| Email | Verified sender domain and scoped provider key; subscriber consent separately stored | Provider send API; campaigns require consent and suppression enforcement | Inbound support separately; signed events for bounces, complaints, unsubscribes | Sender authentication, daily/plan limits, webhook deduplication, unsubscribe enforcement | Not implemented; Resend candidate |

## Official sources checked

- [Meta-owned Instagram API documentation](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api): professional-account support, publishing eligibility and login differences.
- [Pinterest access tiers](https://dev.pinterest.com/docs/key-concepts/access-tiers/) and [rate limits](https://developers.pinterest.com/docs/reference/rate-limits/): Trial/Standard behavior and category quotas.
- [YouTube upload API](https://developers.google.com/youtube/v3/docs/videos/insert) and [quota/compliance audits](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits): OAuth, upload restrictions and project quotas. Current docs describe 100 video inserts/day by default; don't rely on old blanket upload-unit estimates.
- [TikTok Direct Post](https://developers.tiktok.com/docs/en/content-posting-api-get-started) and [sharing guidelines](https://developers.tiktok.com/docs/en/content-sharing-guidelines): app audit and private visibility restrictions.
- [Threads documentation](https://developers.facebook.com/docs/threads/): fetch failed with HTTP 429, details pending.
- [X pricing](https://docs.x.com/x-api/getting-started/pricing): credit billing; checked rates include $0.015 plain post creation, $0.20 URL-containing creation and $0.005/post read. Console rates govern.
- [Resend pricing](https://resend.com/pricing) and [webhooks](https://www.resend.com/features/webhooks): free plan daily send cap of 100, sender authentication and signed webhook support. Marketing contact pricing must be verified separately.

## Practical integration choice

Start with Instagram only after selecting the account's supported login path and obtaining approval. Use direct APIs for one validated vertical slice; evaluate a publishing provider only against its exact channel, format, review and recurring-cost coverage. No third-party publishing vendor is selected or paid for by this release. Use manual JSON exports until live capability is tested. Keep marketing email separate from inbound support.

## Recurring-cost assumptions

Current local foundation: $0 in API spend and no paid dependencies; device/hosting costs excluded. Planning allowance for a future small deployment: $10–30/month persistent host, $0–10 storage/backups, $10–40 AI usage, plus email/provider usage. These are engineering budget allowances, **not verified vendor quotes**. AI vendor/model and hosting provider have not been selected.

Example X workload under checked rates: 30 plain posts + 10 URL posts + 1,000 post reads ≈ $7.45/month, excluding other resources, tax, webhooks and changes. Email can begin within Resend's free daily cap if all other plan limits fit; use the live pricing page before subscribing. Maintain a founder-approved hard monthly budget and execution-time reservations before any chargeable job. No financial commitments have been made.
