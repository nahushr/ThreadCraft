import { useMemo, useState } from "react";
import { ChatThread, GitHubIssueThread, prependUniqueRootComments, ReviewThread } from "@simplishelf/threadcraft";
import type { ThreadCraftComment, ThreadCraftData, ThreadCraftLoadMoreRequest, ThreadCraftLoadMoreResult, ThreadCraftSubmitPayload } from "@simplishelf/threadcraft";
import issueFixture from "./test-data/github-issue.json";
import reviewFixture from "./test-data/reviews.json";
import aiChatFixture from "./test-data/ai-chat.json";
import { fetchMoreAiMessages, fetchMoreIssueComments, fetchMoreReviews } from "./mockApi";
import { generateProviderReply, loadProviderModels } from "./aiProviderApi";
import type { ExampleAiProvider } from "./aiProviderApi";

type ExampleMode = "issue" | "review" | "chat";
type PreviewMode = "desktop" | "phone";

const FIRST_PAGE_SIZE = 50;
const issueFixtureData = issueFixture as ThreadCraftData;
const reviewFixtureData = reviewFixture as ThreadCraftData;
const aiChatFixtureData = aiChatFixture as ThreadCraftData;
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
  const [chatProvider, setChatProvider] = useState<ExampleAiProvider>("gemini");
  const [chatModel, setChatModel] = useState("");
  const [chatApiKeys, setChatApiKeys] = useState<Record<ExampleAiProvider, string>>({ gemini: "", groq: "" });
  const chatProviders = [
    { id: "gemini", label: "Google Gemini", apiKey: chatApiKeys.gemini },
    { id: "groq", label: "Groq", apiKey: chatApiKeys.groq },
  ];
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
    const provider = (payload.chatProvider ?? chatProvider) as ExampleAiProvider;
    const model = payload.chatModel ?? chatModel;
    const apiKey = chatApiKeys[provider];
    setChatSubmitting(true);
    setChatMessages((current) => [...current, {
      id: `demo-user-${submittedAt}`,
      author: "Alex Morgan",
      authorType: "user",
      isMine: true,
      text: payload.text,
      createdAt: new Date(submittedAt).toISOString(),
    }]);
    try {
      const history = [
        ...chatMessages.map((message): { role: "user" | "assistant"; content: string } => ({
          role: message.isMine || message.authorType === "user" ? "user" : "assistant",
          content: message.text ?? message.body ?? "",
        })),
        { role: "user" as const, content: payload.text },
      ];
      const response = await generateProviderReply(provider, model, apiKey, history);
      setChatMessages((current) => [...current, {
        id: `demo-assistant-${submittedAt}`,
        author: "AI Assistant",
        authorType: "assistant",
        text: response,
        createdAt: new Date().toISOString(),
      }]);
    } catch (error) {
      setChatMessages((current) => [...current, {
        id: `demo-assistant-error-${submittedAt}`,
        author: "AI Assistant",
        authorType: "assistant",
        text: error instanceof Error ? error.message : "Could not get a response from the selected provider.",
        createdAt: new Date().toISOString(),
      }]);
    } finally {
      setChatSubmitting(false);
    }
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
      showChatProviderControls
      chatProviders={chatProviders}
      showChatApiKeyInput
      selectedChatProvider={chatProvider}
      selectedChatModel={chatModel}
      onChatProviderChange={(provider) => setChatProvider(provider as ExampleAiProvider)}
      onChatModelChange={setChatModel}
      onChatApiKeyChange={(provider, apiKey) => {
        if (provider === "gemini" || provider === "groq") {
          setChatApiKeys((current) => ({ ...current, [provider]: apiKey }));
        }
      }}
      onLoadChatModels={({ provider, apiKey }) => loadProviderModels(provider as ExampleAiProvider, apiKey ?? "")}
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

      <footer className="demo-footer">Issue and review fixtures are checked-in JSON with delayed mock pagination. AI chat uses your selected Gemini or Groq key in this browser session.</footer>
    </main>
  );
}
