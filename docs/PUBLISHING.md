# Images, videos, music, and scheduled Instagram publishing

## What works without service credentials

Open a content item, select or drop images/videos, fill in the preferred song, and select **Save device draft**. The draft (including the binary files) persists in this browser's IndexedDB across reloads. It is not uploaded to a server, shared between devices, or eligible for automatic publishing. Clearing browser/site data removes it. Storage/quota errors are reported; a failed save is never confirmed. Supported files: JPEG, PNG, WebP, MP4, WebM, MOV; up to 10 attachments, each up to 100 MB. Playback depends on the browser's codec support. Each file can be previewed, described, removed, or downloaded. JSON exports include the music instructions and media metadata; download the media separately.

## Cloud prerequisites

1. Configure Redis and `WORKSPACE_PASSWORD` as described in VERCEL.md.
2. Create a **private** Vercel Blob store in the project Storage tab, connect the relevant environment, and set `BLOB_READ_WRITE_TOKEN`. Never use a public store for this implementation.
3. Redeploy, sign in, open a device draft, and save it to cloud storage. The browser sends file bytes directly to Blob using constrained upload tokens. Images/videos do not pass through the JSON metadata endpoint or get stored in Redis. The content record stores the private pathname, name, MIME type, size, and description. Saving associates the uploaded files with the content item. Unsaved uploads or removed attachments remain in the private store; removal detaches the reference rather than permanently deleting a Blob. Manage orphan cleanup in the Blob dashboard until a retention job is added.

## Instagram activation

This adapter uses the **Instagram API with Facebook Login**, not Instagram Basic Display or personal-account automation. Obtain app approval/permissions for the professional Instagram account, linked Page, and publishing use case. Configure these only as server environment variables in Vercel:

- `INSTAGRAM_ACCOUNT_ID`: authorized professional account ID.
- `INSTAGRAM_ACCESS_TOKEN`: supported token with `instagram_content_publish` and required read/Page permissions for the chosen login path.
- `INSTAGRAM_API_VERSION`: a currently supported Graph API version, e.g. `vNN.N` selected from your app's supported versions. No version is guessed by the app.
- `APP_URL`: HTTPS production origin, here `https://cobridey-assistant.vercel.app`.
- `CRON_SECRET`: strong random secret, also used to sign limited-lived media-fetch URLs for Instagram.
- `PUBLISHING_ENABLED=true`: set only after account access, the store, and scheduler are configured and tested.

The app does not yet provide a self-service Meta OAuth connection/refresh flow. The founder/developer must supply and renew the approved account token. Expired tokens produce a failure needing review, never a fake publishing success. Keep tokens out of chat, source files and screenshots.

## Background trigger

Invoke `GET https://cobridey-assistant.vercel.app/api/publish` **every minute** with header `Authorization: Bearer <CRON_SECRET>`. Use a suitable external scheduler or Vercel Pro Cron. Vercel Hobby's daily cron cannot meet content publishing times; a per-minute cron is deliberately not enabled in the default configuration because it would fail on Hobby deployments. No scheduler subscription has been created or paid for.

For Vercel Pro, merge `"crons": [{"path":"/api/publish","schedule":"* * * * *"}]` into vercel.json, configure `CRON_SECRET` in Vercel, then redeploy. The API requires the bearer secret even for manual tests. Do not put it into URLs. The UI shows the most recent successful worker heartbeat, retained for five minutes. An enabled flag is not evidence that a trigger is running.

Each invocation advances one due item (or prepares an item within 15 minutes of its target time). Use enough capacity for the planned cadence. API processing/queue delays mean delivery is best effort around the scheduled minute, not an exact-second guarantee. Check the heartbeat and receipts. Increase worker throughput and monitoring before high-volume use.

## Publishing workflow

1. Attach cloud media. Write and review the final caption and song preference.
2. Approve the final creative. Editing copy/media/music invalidates previous approval.
3. Pick the publishing time. The browser converts the chosen local time into an ISO UTC timestamp. Schedule only after activation.
4. The worker prepares containers, waits for Instagram processing, checks the global pause immediately before sending, and publishes when due. JPEG photos, JPEG image carousels, and single MP4/MOV Reels are implemented. Unsupported media combinations enter **Manual handoff** with a reason.
5. The item becomes **Published** only after Instagram returns a platform post ID. The receipt stores the ID, publication time, and permalink when retrieval succeeds. A permalink-fetch failure does not erase the confirmed ID.

Redis compare-and-set saves and a three-minute worker lease prevent concurrent trigger collisions. A publish attempt is recorded before transmission. If the platform response is ambiguous, the item enters **Needs reconciliation** and is never automatically re-sent. Inspect Instagram to reconcile it. This conservative behavior avoids duplicate public posts. Failed media/permissions require review before another schedule. Workers that die during a send also go to reconciliation on the next invocation. The implementation does not automatically refresh expired access tokens or guarantee recovery after every service outage.

## Music

Store song title, artist, link, and start-time/creative notes. **Add this song in Instagram** requires a manual handoff because this adapter cannot select licensed library tracks through the publishing API. It does not download copyrighted music or edit audio. **Audio already in my video; I have usage rights** permits automatic publishing of the supplied video. This is a founder assertion, not rights verification. No requested soundtrack is silently dropped.

## Security and limits

Uploads require a signed founder session, same-origin request, approved MIME type, a 100 MB token limit, a constrained UUID pathname and no overwrite. Private media is streamed through the authenticated server; Instagram receives an expiring signed URL for platform processing. Uploaded MIME types are not a malware scanner or a guarantee of Instagram format eligibility. Native private-video playback may need to buffer the file; range/seek optimization is a follow-up. Roles, quotas per founder, token refresh, alerts, data-retention jobs and a production support policy remain required before a wider rollout.

## Validation

Automated tests cover media metadata/path validation, approval invalidation, manual music handoff, preparation/publication receipts, duplicate prevention after an ambiguous response, pause and time checks, plus earlier persistence/security checks. Platform and Redis responses are mocked; no live Instagram publication or real cloud upload is claimed without credentials. Browser QA covers device image/video attachments, song persistence and previews.

Official references: [Meta-owned Instagram collection](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api), [Vercel client uploads](https://vercel.com/docs/vercel-blob/client-upload), [private storage](https://vercel.com/docs/vercel-blob/private-storage), [cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).
