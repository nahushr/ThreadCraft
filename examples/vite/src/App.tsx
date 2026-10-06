import { useMemo, useState } from "react";
import { ChatThread, GitHubIssueThread, prependUniqueRootComments, ReviewThread } from "@simplishelf/threadcraft";
import type { ThreadCraftComment, ThreadCraftData, ThreadCraftLoadMoreRequest, ThreadCraftLoadMoreResult, ThreadCraftSubmitPayload } from "@simplishelf/threadcraft";
import issueFixture from "./test-data/github-issue.json";
import reviewFixture from "./test-data/reviews.json";
import aiChatFixture from "./test-data/ai-chat.json";
import aiChatReplyFixture from "./test-data/ai-chat-reply.json";
import { fetchMoreAiMessages, fetchMoreIssueComments, fetchMoreReviews } from "./mockApi";

type ExampleMode = "issue" | "review" | "chat";
type PreviewMode = "desktop" | "phone";

const FIRST_PAGE_SIZE = 50;
const issueFixtureData = issueFixture as ThreadCraftData;
const reviewFixtureData = reviewFixture as ThreadCraftData;
const aiChatFixtureData = aiChatFixture as ThreadCraftData;
const aiChatReply = aiChatReplyFixture as ThreadCraftComment;
const issueData: ThreadCraftData = {
  ...issueFixtureData,
  comments: issueFixtureData.comments.slice(0, FIRST_PAGE_SIZE),
  hasMore: issueFixtureData.comments.length > FIRST_PAGE_SIZE,
  totalRootComments: issueFixtureData.comments.length,
};
const reviewData: ThreadCraftData = {
  ...reviewFixtureData,
  comments: reviewFixtureData.comments.slice(0, FIRST_PAGE_SIZE),
  hasMore: reviewFixtureData.comments.length > FIRST_PAGE_SIZE,
  totalRootComments: reviewFixtureData.comments.length,
};

export default function App() {
  const [mode, setMode] = useState<ExampleMode>("issue");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [chatMessages, setChatMessages] = useState<ThreadCraftComment[]>(aiChatFixtureData.comments);
  const [chatHasMore, setChatHasMore] = useState(aiChatFixtureData.hasMore ?? false);
  const [chatSubmitting, setChatSubmitting] = useState(false);
  const chatData = useMemo<ThreadCraftData>(() => ({
    ...aiChatFixtureData,
    comments: chatMessages,
    hasMore: chatHasMore,
  }), [chatHasMore, chatMessages]);
  const onSubmit = async (payload: ThreadCraftSubmitPayload): Promise<void> => {
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    console.info("Example comment payload:", payload);
  };
  const onSubmitChat = async (payload: ThreadCraftSubmitPayload): Promise<void> => {
    const submittedAt = Date.now();
    setChatSubmitting(true);
    setChatMessages((current) => [...current, {
      id: `demo-user-${submittedAt}`,
      author: "Alex Morgan",
      authorType: "user",
      isMine: true,
      text: payload.text,
      createdAt: new Date(submittedAt).toISOString(),
    }]);
    await new Promise((resolve) => window.setTimeout(resolve, 550));
    setChatMessages((current) => [...current, {
      ...aiChatReply,
      id: `demo-assistant-${submittedAt}`,
      createdAt: new Date().toISOString(),
    }]);
    setChatSubmitting(false);
  };
  const onLoadOlderChatMessages = async (
    request: ThreadCraftLoadMoreRequest,
  ): Promise<ThreadCraftLoadMoreResult> => {
    const page = await fetchMoreAiMessages(request);
    setChatMessages((current) => prependUniqueRootComments(current, page.comments));
    setChatHasMore(page.hasMore ?? false);
    return page;
  };

  const discussion = mode === "issue" ? (
    <GitHubIssueThread
      data={issueData}
      currentUser="Alex Morgan"
      showHeader={false}
      initialRootLimit={50}
      loadMoreCount={50}
      onLoadMore={fetchMoreIssueComments}
      onSubmitComment={onSubmit}
    />
  ) : mode === "review" ? (
    <ReviewThread
      data={reviewData}
      currentUser="Alex Morgan"
      showHeader={false}
      initialRootLimit={50}
      loadMoreCount={50}
      onLoadMore={fetchMoreReviews}
      onSubmitComment={onSubmit}
    />
  ) : (
    <ChatThread
      data={chatData}
      currentUser="Alex Morgan"
      showHeader={false}
      showStreamHeading={false}
      initialRootLimit={50}
      loadMoreCount={50}
      loadMoreLabel="Load older messages"
      allowReplies={false}
      allowReactions={false}
      allowEmoji={false}
      allowAttachments={false}
      controlledComments
      typingIndicator={chatSubmitting}
      onLoadMore={onLoadOlderChatMessages}
      onSubmitComment={onSubmitChat}
    />
  );

  return (
    <main className="demo-shell">
      <header className="demo-topbar">
        <div>
          <div className="demo-mark">TC</div>
          <span>ThreadCraft</span>
          <span className="demo-topbar__tag">React example</span>
        </div>
        <span className="demo-live"><i /> Local demo · :7002</span>
      </header>

      <section className="demo-intro">
        <p className="demo-kicker">CONVERSATIONS FOR REACT</p>
        <h1>One package, three conversation use cases.</h1>
        <p>Pass JSON data, then connect your own submit and history functions.</p>
      </section>

      <nav className="demo-tabs" aria-label="Choose a demo">
        <button className={mode === "issue" ? "selected" : ""} onClick={() => setMode("issue")} type="button">GitHub issue</button>
        <button className={mode === "review" ? "selected" : ""} onClick={() => setMode("review")} type="button">Product reviews</button>
        <button className={mode === "chat" ? "selected" : ""} onClick={() => setMode("chat")} type="button">AI chat</button>
      </nav>

      <div className="demo-preview-toolbar">
        <div className="demo-preview-toolbar__copy">
          <strong>Live component preview</strong>
          <span>{previewMode === "phone" ? "Phone-sized responsive view" : "Full-width desktop view"}</span>
        </div>
        <div className="demo-preview-toggle" aria-label="Preview size" role="group">
          <button
            aria-pressed={previewMode === "desktop"}
            className={previewMode === "desktop" ? "selected" : ""}
            type="button"
            onClick={() => setPreviewMode("desktop")}
          >
            <span aria-hidden="true" className="demo-device-icon demo-device-icon--desktop" />
            Desktop
          </button>
          <button
            aria-pressed={previewMode === "phone"}
            className={previewMode === "phone" ? "selected" : ""}
            type="button"
            onClick={() => setPreviewMode("phone")}
          >
            <span aria-hidden="true" className="demo-device-icon demo-device-icon--phone" />
            Phone
          </button>
        </div>
      </div>

      <div className={`demo-preview ${previewMode === "phone" ? "demo-preview--phone" : ""}`}>
        {previewMode === "phone" && (
          <div className="demo-phone-status" aria-hidden="true">
            <span>9:41</span>
            <span className="demo-phone-notch" />
            <span className="demo-phone-status__icons">••• ▰</span>
          </div>
        )}
        <section
          aria-label={previewMode === "phone" ? "Phone-sized conversation preview" : undefined}
          className={`demo-panel ${mode === "chat" ? "demo-panel--chat" : ""} ${previewMode === "phone" ? "demo-panel--phone" : ""}`.trim()}
        >
          {discussion}
        </section>
        {previewMode === "phone" && <div className="demo-phone-home" aria-hidden="true" />}
      </div>

      <footer className="demo-footer">Conversation fixtures are checked-in JSON; comment and history pages use delayed mock requests.</footer>
    </main>
  );
}
