import type {
  ThreadCraftData,
  ThreadCraftLoadMoreRequest,
  ThreadCraftLoadMoreResult,
  ThreadCraftComment,
} from "@simplishelf/threadcraft";
import issueFixture from "./test-data/github-issue.json";
import reviewFixture from "./test-data/reviews.json";
import aiChatOlderFixture from "./test-data/ai-chat-older.json";

const issueComments = (issueFixture as ThreadCraftData).comments;
const reviewComments = (reviewFixture as ThreadCraftData).comments;
const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const pageFromFixture = (
  allComments: ThreadCraftData["comments"],
  { offset, limit }: ThreadCraftLoadMoreRequest,
): ThreadCraftLoadMoreResult => {
  const comments = allComments.slice(offset, offset + limit);
  return { comments, hasMore: offset + comments.length < allComments.length };
};

/** Delayed mock endpoint that pages through the checked-in GitHub issue JSON. */
export async function fetchMoreIssueComments(
  request: ThreadCraftLoadMoreRequest,
): Promise<ThreadCraftLoadMoreResult> {
  await wait(650);
  return pageFromFixture(issueComments, request);
}

/** Delayed mock endpoint that pages through the checked-in product review JSON. */
export async function fetchMoreReviews(
  request: ThreadCraftLoadMoreRequest,
): Promise<ThreadCraftLoadMoreResult> {
  await wait(650);
  return pageFromFixture(reviewComments, request);
}

/** Delayed mock endpoint that prepends the checked-in older AI conversation. */
export async function fetchMoreAiMessages(
  request: ThreadCraftLoadMoreRequest,
): Promise<ThreadCraftLoadMoreResult> {
  await wait(650);
  const comments = aiChatOlderFixture as ThreadCraftComment[];
  return {
    comments: comments.slice(0, request.limit),
    hasMore: false,
  };
}
