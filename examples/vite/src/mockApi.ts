import type { ThreadCraftComment, ThreadCraftLoadMoreRequest, ThreadCraftLoadMoreResult } from "@simplishelf/threadcraft";

const TOTAL_ISSUE_ROOTS = 113;
const TOTAL_REVIEW_ROOTS = 107;
const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

/** Delayed mock endpoint for paging in the GitHub issue example. */
export async function fetchMoreIssueComments(
  { offset, limit }: ThreadCraftLoadMoreRequest,
): Promise<ThreadCraftLoadMoreResult> {
  await wait(650);
  const end = Math.min(offset + limit, TOTAL_ISSUE_ROOTS);
  const comments: ThreadCraftComment[] = Array.from({ length: Math.max(0, end - offset) }, (_, index) => {
    const number = offset + index + 1;
    const comment: ThreadCraftComment = {
      id: `issue-${number}`,
      author: number % 3 === 0 ? "Maya Chen" : "Jordan Lee",
      authorType: number % 3 === 0 ? "support" : "customer",
      createdAt: new Date(Date.now() - number * 3600_000).toISOString(),
      text: `Loaded issue comment ${number}. This page was returned by the delayed mock API.`,
      reactions: number % 4 === 0 ? { "👍": number % 5 + 1, "🎉": 1 } : {},
      replies: [],
    };
    if (number % 9 === 0) {
      comment.replies = [{
        id: `issue-${number}-reply`,
        author: "Alex Morgan",
        authorType: "customer",
        createdAt: new Date(Date.now() - number * 1800_000).toISOString(),
        text: "Thanks, that answers my question! 😊",
      }];
    }
    return comment;
  });
  return { comments, hasMore: end < TOTAL_ISSUE_ROOTS };
}

/** Delayed mock endpoint for paging in the review example. */
export async function fetchMoreReviews(
  { offset, limit }: ThreadCraftLoadMoreRequest,
): Promise<ThreadCraftLoadMoreResult> {
  await wait(650);
  const end = Math.min(offset + limit, TOTAL_REVIEW_ROOTS);
  const comments: ThreadCraftComment[] = Array.from({ length: Math.max(0, end - offset) }, (_, index) => {
    const number = offset + index + 1;
    return {
      id: `review-${number}`,
      author: `Reviewer ${number}`,
      authorType: "customer",
      createdAt: new Date(Date.now() - number * 5_400_000).toISOString(),
      text: `Review ${number}: the product arrived quickly and has been easy to use.`,
      rating: number % 5 + 1,
      reactions: number % 6 === 0 ? { "❤️": 2 } : {},
      replies: number % 11 === 0 ? [{
        id: `review-${number}-reply`,
        author: "ThreadCraft Shop",
        authorType: "business",
        createdAt: new Date(Date.now() - number * 4_000_000).toISOString(),
        text: "We appreciate you sharing your experience!",
      }] : [],
    };
  });
  return { comments, hasMore: end < TOTAL_REVIEW_ROOTS };
}
