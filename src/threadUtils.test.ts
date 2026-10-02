import { describe, expect, it } from "vitest";
import { appendReplyToTree, appendUniqueRootComments, buildCommentTree, countRootComments } from "./threadUtils";
import type { ThreadCraftComment } from "./types";

describe("buildCommentTree", () => {
  it("keeps nested JSON and its reply hierarchy", () => {
    const input: ThreadCraftComment[] = [{
      id: 1,
      author: "Ada",
      text: "Root",
      replies: [{ id: 2, author: "Lin", text: "Reply" }],
    }];

    expect(buildCommentTree(input)).toMatchObject([
      { id: 1, text: "Root", replies: [{ id: 2, text: "Reply", replies: [] }] },
    ]);
    expect(input[0].replies?.[0].replies).toBeUndefined();
  });

  it("attaches flat comments by parent ID and removes quoted markdown", () => {
    const comments: ThreadCraftComment[] = [
      { id: "root", author: "Ada", body: "This needs a fix." },
      { id: "reply", author: "Lin", quotedCommentId: "root", body: "> This needs a fix.\nI am working on it." },
    ];
    const tree = buildCommentTree(comments);

    expect(tree).toHaveLength(1);
    expect(tree[0].replies?.[0]).toMatchObject({ id: "reply", text: "I am working on it." });
    expect(tree[0].replies?.[0].quotedText).toBe("This needs a fix.");
  });

  it("extracts markdown image URLs into attachment data", () => {
    const tree = buildCommentTree([{
      id: 1,
      author: "Ada",
      body: "Screenshot attached\n![screenshot](https://example.test/screenshot.png)",
    }]);

    expect(tree[0].text).toBe("Screenshot attached");
    expect(tree[0].attachments).toEqual([
      { name: "screenshot", url: "https://example.test/screenshot.png", mimeType: "image/*" },
    ]);
  });

  it("keeps SimpliShelf review rating fields and customer markers", () => {
    const [review] = buildCommentTree([{
      id: 18,
      author: "customer-support-bot",
      authorType: "Bot",
      body: "### 👤 **Customer Message**\nThe product is great.",
      ratings: 4,
    }]);

    expect(review).toMatchObject({ text: "The product is great.", isCustomer: true, rating: 4 });
  });
});

describe("thread operations", () => {
  it("adds a reply without mutating the input tree", () => {
    const root: ThreadCraftComment = { id: 1, author: "Ada", text: "Root", replies: [] };
    const reply: ThreadCraftComment = { id: 2, author: "Lin", text: "Reply" };
    const result = appendReplyToTree([root], 1, reply);

    expect(result[0].replies).toEqual([reply]);
    expect(root.replies).toEqual([]);
  });

  it("appends unique roots and counts only root comments for pagination", () => {
    const first: ThreadCraftComment = { id: 1, author: "Ada", text: "Root", replies: [{ id: 2, author: "Lin", text: "Nested" }] };
    const second: ThreadCraftComment = { id: 3, author: "Jo", text: "Next" };
    expect(appendUniqueRootComments([first], [first, second, second])).toEqual([first, second]);
    expect(countRootComments([first, second])).toBe(2);
  });
});
