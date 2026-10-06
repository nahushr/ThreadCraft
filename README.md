<p align="center">
  <img src="assets/threadcraft-logo.png" alt="ThreadCraft" width="560" />
</p>

<p align="center">
  <a href="https://github.com/nahushr/ThreadCraft/actions/workflows/deploy.yml"><img alt="CI" src="https://github.com/nahushr/ThreadCraft/actions/workflows/deploy.yml/badge.svg?branch=main" /></a>
  <img alt="React 18+" src="https://img.shields.io/badge/React-18%2B-61DAFB?logo=react&logoColor=111827" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-types%20included-3178C6?logo=typescript&logoColor=white" />
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-16a085.svg" /></a>
</p>

<p align="center">
  <a href="https://stackblitz.com/github/nahushr/ThreadCraft?file=examples/vite/src/App.tsx"><img alt="Open the Vite example in StackBlitz" src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" /></a>
</p>

## Demo

| Online | Local |
|---|---|
| [Open the Vite example in StackBlitz](https://stackblitz.com/github/nahushr/ThreadCraft?file=examples/vite/src/App.tsx) | `npm ci` → `npm run dev:example` → [localhost:7002](http://localhost:7002) |

| Example | Fixture | Features |
|---|---|---|
| GitHub issue | [github-issue.json](examples/vite/src/test-data/github-issue.json) | Nested replies, reactions, attachments, async “See more” |
| Product review | [reviews.json](examples/vite/src/test-data/reviews.json) | Ratings, business replies, async “See more” |

## Install and import

```sh
npm install @simplishelf/threadcraft
```

```tsx
import {
  GitHubIssueThread,
  ReviewThread,
  ThreadedDiscussion,
} from "@simplishelf/threadcraft";
import type { ThreadCraftData } from "@simplishelf/threadcraft";
import "@simplishelf/threadcraft/styles.css";

const issueData: ThreadCraftData = {
  kind: "issue",
  title: "Export button stays disabled",
  comments: [],
};

const reviewData: ThreadCraftData = {
  kind: "review",
  title: "Linen Everyday Shirt",
  showRating: true,
  comments: [],
};

export function DiscussionExample() {
  return (
    <>
      <GitHubIssueThread data={issueData} />
      <ReviewThread data={reviewData} />
      <ThreadedDiscussion data={issueData} variant="issue" />
    </>
  );
}
```

### React Native / Expo

```tsx
import { ReviewThread } from "@simplishelf/threadcraft/native";
import type { ThreadCraftData } from "@simplishelf/threadcraft/native";

const reviewData: ThreadCraftData = {
  kind: "review",
  title: "Product reviews",
  showRating: true,
  comments: [],
};

<ReviewThread data={reviewData} showHeader={false} />
```

The native entry uses React Native components and does not require the CSS import. When attachments are enabled, pass `onPickAttachments` and connect it to the app's native file picker.

## Integrations

| Use case | Component | Data |
|---|---|---|
| GitHub issue | `GitHubIssueThread` | `kind: "issue"`; optional issue status, URL, author, and body |
| Product review | `ReviewThread` | `kind: "review"`; set `showRating: true` to display review stars; use `allowRatingInput` to control rating entry |
| Dynamic variant | `ThreadedDiscussion` | Optional `variant`; defaults to `data.kind`, then `"issue"` |

## Component options

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` | `ThreadCraftData` | Required | Metadata and initial comments |
| `variant` | `"issue" \| "review"` | `data.kind ?? "issue"` | Used by `ThreadedDiscussion`; wrapper components select their own variant |
| `currentUser` | `string` | `"You"` | Author for locally created comments |
| `showHeader` | `boolean` | `true` | Show the issue/review metadata card |
| `initialRootLimit` | `number` | `50` | Root comments shown first; their nested replies remain visible |
| `loadMoreCount` | `number` | `initialRootLimit` or `50` | Root comments revealed or requested per “See more” |
| `allowReplies` | `boolean` | `true` | Show reply actions |
| `allowNewComments` | `boolean` | `true` | Show the root-level composer |
| `allowAttachments` | `boolean` | `true` | Show attachments; native apps provide `onPickAttachments` |
| `allowReactions` | `boolean` | `true` | Show reaction actions |
| `showRating` | `boolean` | `data.showRating` | Display comment ratings in review threads |
| `allowRatingInput` | `boolean` | `showRating` | Show the root composer rating control |
| `replyAuthorTypes` | `ThreadCraftReplyAuthorType[]` | Issue/review defaults | Allowed reply identities; a one-item list fixes the identity |
| `newCommentAuthorType` | `ThreadCraftReplyAuthorType` | `customer` for reviews, `support` for issues | Identity on root submissions |
| `newCommentPosition` | `"start" \| "end"` | `"end"` | Place successful root submissions at the beginning or end |
| `identityFields` | `ThreadCraftIdentityFields` | — | Configure author name/email fields in the composer |
| `onPickAttachments` | `() => Promise<ThreadCraftAttachment[]>` | — | Native attachment picker adapter |
| `onLoadMore` | `(request: ThreadCraftLoadMoreRequest) => Promise<ThreadCraftLoadMoreResult>` | — | Fetch another root-comment page |
| `onSubmitComment` | `(payload: ThreadCraftSubmitPayload) => Promise<ThreadCraftComment \| void>` | Local update | Persist a comment; return the saved comment or `void` |
| `onReact` | `(comment: ThreadCraftComment, emoji: string) => void` | — | Observe a locally applied reaction toggle |

## JSON shape

### Discussion: `ThreadCraftData`

| Field | Type | Required | Meaning |
|---|---|:---:|---|
| `id` | `string \| number` | | Discussion identifier |
| `kind` | `"issue" \| "review"` | | Default component variant |
| `title` | `string` | ✓ | Issue or product title |
| `author` | `string` | | Issue opener or store name |
| `authorAvatarUrl` | `string` | | Header avatar URL |
| `createdAt` | `string` | | Header timestamp |
| `body` | `string` | | Issue/review description |
| `status` | `string` | | Issue status, such as `"Open"` |
| `url` | `string` | | Link to the source issue or product |
| `comments` | `ThreadCraftComment[]` | ✓ | Initial comment page; nested or flat |
| `authorTypeStyles` | `Record<string, ThreadCraftAuthorTypeStyle>` | | Custom chip, card, and avatar colors by `authorType` |
| `showRating` | `boolean` | | Display rating stars on review comments |
| `hasMore` | `boolean` | | Whether more root comments are available |
| `totalRootComments` | `number` | | Total root count shown in the discussion heading |

### Comment: `ThreadCraftComment`

| Field | Type | Meaning |
|---|---|---|
| `id` | `string \| number` | Required comment identifier |
| `author` | `string` | Required author name |
| `text` | `string` | Preferred comment content |
| `body` | `string` | Content alias; `text` takes precedence |
| `authorAvatarUrl` | `string` | Author avatar URL |
| `avatarBackgroundColor` | `string` | Per-user initials avatar background override |
| `avatarTextColor` | `string` | Per-user initials avatar text override |
| `avatarBorderColor` | `string` | Per-user avatar border override |
| `cardColor` | `string` | Per-comment card background override |
| `cardBorderColor` | `string` | Per-comment card border override |
| `cardTextColor` | `string` | Per-comment card text override |
| `createdAt` | `string` | Comment timestamp |
| `parentId` | `string \| number \| null` | Flat reply parent; `null` marks a root |
| `quotedCommentId` | `string \| number \| null` | Alternative flat reply parent |
| `quotedText` | `string` | Quoted parent text |
| `quotedAuthor` | `string` | Quoted parent author |
| `replies` | `ThreadCraftComment[]` | Nested replies; recursive |
| `reactions` | `Record<string, number>` | Emoji-to-count map, e.g. `{"👍": 2}` |
| `attachments` | `ThreadCraftAttachmentInput[]` | Image URLs or attachment objects |
| `rating` | `number` | Review rating |
| `ratings` | `number` | Legacy rating alias; `rating` takes precedence |
| `isCustomer` | `boolean` | Legacy customer-author flag |
| `isMine` | `boolean` | Legacy flag treated as customer-authored |
| `authorType` | `string` | `customer`, `business`, `support`, `bot`, or custom role |

### Composer identity: `ThreadCraftIdentityFields`

| Field | Shape | Meaning |
|---|---|---|
| `authorName` | `{ label, placeholder?, value?, required? }` | Name input configuration and initial value |
| `authorEmail` | `{ label, placeholder?, value?, required?, keyboardType? }` | Email input configuration and initial value; `keyboardType` is `"default"` or `"email-address"` |

### Author type style: `ThreadCraftAuthorTypeStyle`

Add styles to `ThreadCraftData.authorTypeStyles`, keyed by the comment's `authorType`. Styles apply to that role on every nesting level. Per-comment avatar and card colors override role defaults.

Color values accept CSS color formats such as hex, `rgb()`, `hsl()`, and named colors. `authorAvatarUrl` accepts an image URL or data URL and replaces the initials avatar.

| Field | Type | Meaning |
|---|---|---|
| `label` | `string` | Chip text, e.g. `"Verified buyer"` |
| `color` | `string` | Chip label and icon color; any CSS color |
| `backgroundColor` | `string` | Chip background color |
| `borderColor` | `string` | Chip border color |
| `icon` | `string` | Emoji or text shown before the chip label |
| `cardColor` | `string` | Default comment card background for this role |
| `cardBorderColor` | `string` | Default comment card border for this role |
| `cardTextColor` | `string` | Default comment text color for this role |
| `avatarBackgroundColor` | `string` | Default initials avatar background for this role |
| `avatarTextColor` | `string` | Default initials color for this role |
| `avatarBorderColor` | `string` | Default avatar border for this role |

### Attachment: `ThreadCraftAttachmentInput`

| Shape | Fields |
|---|---|
| URL string | `"https://example.com/photo.png"` |
| Object | `name: string` required; `url?: string`; `dataUrl?: string`; `mimeType?: string`; `size?: number` |

### Comment relationships and content

| Input | Normalization |
|---|---|
| Nested `replies` | Preserved as a reply tree |
| Flat `parentId` | Attached to the matching comment ID |
| Flat `quotedCommentId` | Attached to the matching comment ID |
| `quotedText` or Markdown `>` quote | Used as quote context; matching earlier comment text can infer a parent |
| Markdown image `![alt](https://...)` or HTML `<img src="https://...">` in `text`/`body` | Extracted as an image attachment |

### GitHub issue JSON

```json
{
  "id": 842,
  "kind": "issue",
  "title": "Export button stays disabled after choosing a date range",
  "author": "Priya Shah",
  "authorAvatarUrl": "https://example.com/priya.png",
  "createdAt": "2026-09-28T14:32:00.000Z",
  "body": "The export button stays disabled after I choose a valid date range.",
  "status": "Open",
  "url": "https://github.com/example/app/issues/842",
  "hasMore": true,
  "totalRootComments": 60,
  "authorTypeStyles": {
    "customer": {
      "label": "Customer",
      "color": "#2546A8",
      "backgroundColor": "#EEF2FF",
      "borderColor": "#C7D2FE",
      "icon": "👤",
      "cardColor": "#F3F5FF",
      "cardBorderColor": "#D7DFFF",
      "cardTextColor": "#24304A",
      "avatarBackgroundColor": "#E5ECFF",
      "avatarTextColor": "#315EFB",
      "avatarBorderColor": "#FFFFFF"
    },
    "business": {
      "label": "Business",
      "color": "#087E70",
      "backgroundColor": "#E8FAF5",
      "borderColor": "#A7F3D0",
      "icon": "🏪",
      "cardColor": "#EFFBF7",
      "cardBorderColor": "#BDEBDD",
      "cardTextColor": "#1D3B35",
      "avatarBackgroundColor": "#D8F5EA",
      "avatarTextColor": "#087E70",
      "avatarBorderColor": "#FFFFFF"
    },
    "support": {
      "label": "Support",
      "color": "#673AB7",
      "backgroundColor": "#F3EDFF",
      "borderColor": "#D9C7FF",
      "icon": "🛠️",
      "cardColor": "#FBF8FF",
      "cardBorderColor": "#E6D9FF",
      "cardTextColor": "#352A4D",
      "avatarBackgroundColor": "#EFE6FF",
      "avatarTextColor": "#6941C6",
      "avatarBorderColor": "#FFFFFF"
    }
  },
  "comments": [
    {
      "id": "issue-1",
      "author": "Priya Shah",
      "authorType": "customer",
      "authorAvatarUrl": "https://example.com/priya.png",
      "avatarBackgroundColor": "#DBEAFE",
      "avatarTextColor": "#1D4ED8",
      "avatarBorderColor": "#FFFFFF",
      "cardColor": "#FFF7ED",
      "cardBorderColor": "#FED7AA",
      "cardTextColor": "#7C2D12",
      "createdAt": "2026-09-28T15:04:00.000Z",
      "text": "I can reproduce this in Chrome.",
      "reactions": { "👍": 2, "❤️": 1 },
      "attachments": [
        "https://example.com/screenshot.png",
        {
          "name": "steps.png",
          "url": "https://example.com/steps.png",
          "dataUrl": "data:image/png;base64,...",
          "mimeType": "image/png",
          "size": 24000
        }
      ],
      "replies": [
        {
          "id": "issue-1-reply",
          "author": "Maya Chen",
          "authorType": "support",
          "authorAvatarUrl": "https://example.com/maya.png",
          "createdAt": "2026-09-28T15:31:00.000Z",
          "parentId": "issue-1",
          "quotedCommentId": "issue-1",
          "quotedText": "I can reproduce this in Chrome.",
          "quotedAuthor": "Priya Shah",
          "text": "We found a stale state update and are preparing a fix.",
          "reactions": { "🎉": 1 },
          "attachments": [],
          "replies": [
            {
              "id": "issue-1-reply-2",
              "author": "Priya Shah",
              "authorType": "customer",
              "isCustomer": true,
              "isMine": true,
              "body": "Thank you for the update.",
              "replies": []
            }
          ]
        }
      ]
    }
  ]
}
```

### Product review JSON

```json
{
  "id": "linen-shirt",
  "kind": "review",
  "title": "Linen Everyday Shirt",
  "author": "ThreadCraft Store",
  "authorAvatarUrl": "https://example.com/store.png",
  "createdAt": "2026-09-26T10:00:00.000Z",
  "body": "Customer reviews and business replies.",
  "url": "https://example.com/products/linen-shirt",
  "showRating": true,
  "hasMore": true,
  "totalRootComments": 60,
  "authorTypeStyles": {
    "customer": {
      "label": "Verified buyer",
      "color": "#2546A8",
      "backgroundColor": "#EEF2FF",
      "borderColor": "#C7D2FE",
      "icon": "🛍️",
      "cardColor": "#F3F5FF",
      "cardBorderColor": "#D7DFFF",
      "cardTextColor": "#24304A",
      "avatarBackgroundColor": "#E5ECFF",
      "avatarTextColor": "#315EFB",
      "avatarBorderColor": "#FFFFFF"
    },
    "business": {
      "label": "ThreadCraft Store",
      "color": "#087E70",
      "backgroundColor": "#E8FAF5",
      "borderColor": "#A7F3D0",
      "icon": "🏪",
      "cardColor": "#EFFBF7",
      "cardBorderColor": "#BDEBDD",
      "cardTextColor": "#1D3B35",
      "avatarBackgroundColor": "#D8F5EA",
      "avatarTextColor": "#087E70",
      "avatarBorderColor": "#FFFFFF"
    },
    "support": {
      "label": "Support",
      "color": "#673AB7",
      "backgroundColor": "#F3EDFF",
      "borderColor": "#D9C7FF",
      "icon": "💬",
      "cardColor": "#FBF8FF",
      "cardBorderColor": "#E6D9FF",
      "cardTextColor": "#352A4D",
      "avatarBackgroundColor": "#EFE6FF",
      "avatarTextColor": "#6941C6",
      "avatarBorderColor": "#FFFFFF"
    }
  },
  "comments": [
    {
      "id": "review-1",
      "author": "Morgan Reed",
      "authorType": "customer",
      "authorAvatarUrl": "https://example.com/morgan.png",
      "avatarBackgroundColor": "#FCE7F3",
      "avatarTextColor": "#9D174D",
      "createdAt": "2026-09-26T13:20:00.000Z",
      "text": "Comfortable fabric and a good fit.",
      "rating": 5,
      "ratings": 5,
      "reactions": { "❤️": 3, "👍": 2 },
      "replies": [
        {
          "id": "review-1-reply",
          "author": "ThreadCraft Store",
          "authorType": "business",
          "authorAvatarUrl": "https://example.com/store.png",
          "text": "Thanks for sharing your experience!",
          "replies": []
        }
      ]
    }
  ]
}
```

## Pagination, replies, and callbacks

| API | Shape | Behavior |
|---|---|---|
| `onLoadMore` request | `{ offset: number, limit: number }` | Root-comment offset and page size |
| `onLoadMore` result | `{ comments: ThreadCraftComment[], hasMore?: boolean }` | Appends unique roots; short page implies no more when `hasMore` is omitted |
| `onSubmitComment` payload | `{ text, parentId?, attachments, rating?, authorType?, authorName?, authorEmail? }` | `parentId` is omitted for a root; configured identity values are included |
| Reply roles | `customer \| business \| support` | Issue: Support/Customer; review: Customer/Business |
| `onReact` | `(comment, emoji) => void` | Runs after the component toggles the reaction locally |

| Submit payload field | Type | Included when |
|---|---|---|
| `text` | `string` | Every submission |
| `parentId` | `string \| number` | Reply |
| `attachments` | `ThreadCraftAttachment[]` | Every submission; empty when none selected |
| `rating` | `number` | Root review when rating input is enabled |
| `authorType` | `"customer" \| "business" \| "support"` | Reply or configured root identity |
| `authorName` | `string` | When the composer includes a name field |
| `authorEmail` | `string` | When the composer includes an email field |

| Built-in image picker | Limit |
|---|---:|
| Files per comment | 10 |
| File size | 5 MB each |
| Accepted files | Images |
| Web picker output | `dataUrl`, `mimeType`, `size`, `name` |
| Native picker | `onPickAttachments` returns `ThreadCraftAttachment[]` |

## Exports

| Export | Kind |
|---|---|
| `GitHubIssueThread`, `ReviewThread`, `ThreadedDiscussion` | Components |
| `GitHubIssueThread`, `ReviewThread`, `ThreadedDiscussion` from `@simplishelf/threadcraft/native` | React Native components |
| `ThreadCraftId`, `ThreadCraftAttachment`, `ThreadCraftAttachmentInput`, `ThreadCraftAuthorTypeStyle`, `ThreadCraftComment`, `ThreadCraftData`, `ThreadCraftDiscussionProps`, `ThreadCraftIdentityField`, `ThreadCraftIdentityFields`, `ThreadCraftLoadMoreRequest`, `ThreadCraftLoadMoreResult`, `ThreadCraftReplyAuthorType`, `ThreadCraftSubmitPayload` | Types |
| `buildCommentTree`, `appendReplyToTree`, `appendUniqueRootComments`, `countRootComments` | Helpers |

## Development

```sh
npm ci
npm test
npm run lint
npm run build
npm run dev:example
```

| Resource | Path |
|---|---|
| Vite example | [examples/vite](examples/vite) |
| Example fixtures | [examples/vite/src/test-data](examples/vite/src/test-data) |
| License | [MIT](LICENSE) |
