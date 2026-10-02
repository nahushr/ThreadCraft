# ThreadCraft React

Reusable threaded comments for GitHub issues, support conversations, and product reviews. This package adapts the nested discussion and review behavior used in SimpliShelf's support and product review screens into a React component that accepts plain JSON.

## Example app

The Vite example lives in [`examples/vite`](examples/vite), uses issue and review JSON fixtures from `src/test-data`, and runs on port **7002**:

```sh
npm install
npm run dev:example
```

The example's “See more comments” handler waits 650 ms and returns the next 50 roots, like a paged API request.

The composer includes categorized emoji search across more than 3,000 emoji (including skin-tone variants), recent picks, image attachment previews, and removable attachment chips. Emoji dataset attribution is included in [`NOTICE`](NOTICE).

## Install and import

```sh
npm install @threadcraft/react
```

```tsx
import { GitHubIssueThread } from "@threadcraft/react";
import "@threadcraft/react/styles.css";

<GitHubIssueThread
  data={issueJson}
  initialRootLimit={50}
  onLoadMore={async ({ offset, limit }) => {
    const response = await fetch(`/api/issues/42/comments?offset=${offset}&limit=${limit}`);
    return response.json(); // { comments: ThreadCraftComment[], hasMore: boolean }
  }}
  onSubmitComment={async (payload) => {
    // Persist payload.text, payload.parentId, payload.authorType, payload.attachments, and optional payload.rating.
  }}
/>
```

## JSON shape

The same component renders nested comment objects and can normalize flat GitHub-style data with `parentId`, `quotedCommentId`, or markdown quote lines.

```json
{
  "kind": "review",
  "title": "Linen Everyday Shirt",
  "showRating": true,
  "hasMore": true,
  "comments": [
    {
      "id": 1,
      "author": "Morgan Reed",
      "text": "Comfortable fabric and a good fit.",
      "rating": 5,
      "replies": [
        { "id": 2, "author": "ThreadCraft Store", "text": "Thanks for the review!" }
      ]
    }
  ]
}
```

`showRating: true` is the opt-in for review stars and the rating selector in the root review composer. Issue threads use the same renderer through `GitHubIssueThread`; `ReviewThread` fixes the variant to reviews. `ThreadedDiscussion` is available when the variant needs to be selected dynamically.

## Component options

- `data`: issue/review metadata and initial nested comment JSON.
- `showHeader`: hide the issue/review metadata card when the surrounding page already provides that context. Defaults to `true`.
- `initialRootLimit`: root comments visible at first render (default `50`). Replies under those roots remain visible.
- `loadMoreCount`: roots to request or reveal each time (default `50`).
- `onLoadMore({ offset, limit })`: async page loader. Return `{ comments, hasMore }`; results append to the currently loaded roots.
- `onSubmitComment(payload)`: optional async persistence hook. Without it, new comments are added locally.
- Reply composers include a `Replying as` selector: issue threads offer Support/Customer, and reviews offer Customer/Business. The selected role is sent as `payload.authorType` and used for locally added replies.
- `allowReplies`, `allowAttachments`, and `allowReactions`: feature switches, all enabled by default.
- `onReact(comment, emoji)`: notification hook for reaction changes.

Comment attachments can be URL strings or objects with `name`, `url`, `dataUrl`, `mimeType`, and `size`. The built-in picker reads up to 10 images, 5 MB each, as data URLs. Upload the returned attachment data through your own backend when persisting comments.

## Development

```sh
npm run build
npm test
npm run dev:example
```
