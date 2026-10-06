import type { JSX } from "react";
import NativeDiscussion from "./NativeDiscussion";
import type { ThreadCraftDiscussionProps } from "../types";

export type ThreadedDiscussionProps = ThreadCraftDiscussionProps;

export const ThreadedDiscussion = (props: ThreadedDiscussionProps): JSX.Element => (
  <NativeDiscussion {...props} />
);

export const GitHubIssueThread = (props: ThreadedDiscussionProps): JSX.Element => (
  <NativeDiscussion {...props} variant="issue" />
);

export const ReviewThread = (props: ThreadedDiscussionProps): JSX.Element => (
  <NativeDiscussion {...props} variant="review" />
);

export const ChatThread = (props: ThreadedDiscussionProps): JSX.Element => (
  <NativeDiscussion {...props} variant="chat" />
);

export { appendReplyToTree, appendUniqueRootComments, buildCommentTree, countRootComments, prependUniqueRootComments } from "../threadUtils";
export type {
  ThreadCraftAuthorTypeStyle,
  ThreadCraftAttachment,
  ThreadCraftAttachmentInput,
  ThreadCraftChatModel,
  ThreadCraftChatProviderOption,
  ThreadCraftComment,
  ThreadCraftData,
  ThreadCraftDiscussionProps,
  ThreadCraftId,
  ThreadCraftIdentityField,
  ThreadCraftIdentityFields,
  ThreadCraftLoadChatModelsRequest,
  ThreadCraftLoadMoreRequest,
  ThreadCraftLoadMoreResult,
  ThreadCraftReplyAuthorType,
  ThreadCraftSubmitPayload,
  ThreadCraftVariant,
} from "../types";
