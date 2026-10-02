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

## Integrations

| Use case | Component | Data |
|---|---|---|
| GitHub issue | `GitHubIssueThread` | `kind: "issue"`; optional issue status, URL, author, and body |
| Product review | `ReviewThread` | `kind: "review"`; set `showRating: true` to enable review stars and rating input |
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
| `allowAttachments` | `boolean` | `true` | Show the image attachment picker |
| `allowReactions` | `boolean` | `true` | Show reaction actions |
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
| `showRating` | `boolean` | | Set `true` for review stars and root review rating input |
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
  "totalRootComments": 113,
  "comments": [
    {
      "id": "issue-1",
      "author": "Priya Shah",
      "authorType": "customer",
      "authorAvatarUrl": "https://example.com/priya.png",
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
  "totalRootComments": 107,
  "comments": [
    {
      "id": "review-1",
      "author": "Morgan Reed",
      "authorType": "customer",
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
| `onSubmitComment` payload | `{ text, parentId?, attachments, rating?, authorType? }` | `parentId` is omitted for a root; rating is sent for a rated root review |
| Reply roles | `customer \| business \| support` | Issue: Support/Customer; review: Customer/Business |
| `onReact` | `(comment, emoji) => void` | Runs after the component toggles the reaction locally |

| Submit payload field | Type | Included when |
|---|---|---|
| `text` | `string` | Every submission |
| `parentId` | `string \| number` | Reply |
| `attachments` | `ThreadCraftAttachment[]` | Every submission; empty when none selected |
| `rating` | `number` | Root review with `showRating: true` |
| `authorType` | `"customer" \| "business" \| "support"` | Reply |

| Built-in image picker | Limit |
|---|---:|
| Files per comment | 10 |
| File size | 5 MB each |
| Accepted files | Images |
| Picker output | `dataUrl`, `mimeType`, `size`, `name` |

## Exports

| Export | Kind |
|---|---|
| `GitHubIssueThread`, `ReviewThread`, `ThreadedDiscussion` | Components |
| `ThreadCraftId`, `ThreadCraftAttachment`, `ThreadCraftAttachmentInput`, `ThreadCraftComment`, `ThreadCraftData`, `ThreadCraftDiscussionProps`, `ThreadCraftLoadMoreRequest`, `ThreadCraftLoadMoreResult`, `ThreadCraftReplyAuthorType`, `ThreadCraftSubmitPayload` | Types |
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
