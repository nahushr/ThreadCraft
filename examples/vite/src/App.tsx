import { useState } from "react";
import { GitHubIssueThread, ReviewThread } from "@simplishelf/threadcraft";
import type { ThreadCraftData, ThreadCraftSubmitPayload } from "@simplishelf/threadcraft";
import issueFixture from "./test-data/github-issue.json";
import reviewFixture from "./test-data/reviews.json";
import { fetchMoreIssueComments, fetchMoreReviews } from "./mockApi";

type ExampleMode = "issue" | "review";
type PreviewMode = "desktop" | "phone";

const issueData = issueFixture as ThreadCraftData;
const reviewData = reviewFixture as ThreadCraftData;

export default function App() {
  const [mode, setMode] = useState<ExampleMode>("issue");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const onSubmit = async (payload: ThreadCraftSubmitPayload): Promise<void> => {
    await new Promise((resolve) => window.setTimeout(resolve, 250));
    console.info("Example comment payload:", payload);
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
  ) : (
    <ReviewThread
      data={reviewData}
      currentUser="Alex Morgan"
      showHeader={false}
      initialRootLimit={50}
      loadMoreCount={50}
      onLoadMore={fetchMoreReviews}
      onSubmitComment={onSubmit}
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
        <p className="demo-kicker">NESTED CONVERSATIONS FOR REACT</p>
        <h1>One thread component, two use cases.</h1>
        <p>Pass a nested JSON object, then plug in your own submit and pagination functions.</p>
      </section>

      <nav className="demo-tabs" aria-label="Choose a demo">
        <button className={mode === "issue" ? "selected" : ""} onClick={() => setMode("issue")} type="button">GitHub issue</button>
        <button className={mode === "review" ? "selected" : ""} onClick={() => setMode("review")} type="button">Product reviews</button>
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
          aria-label={previewMode === "phone" ? "Phone-sized discussion preview" : undefined}
          className={`demo-panel ${previewMode === "phone" ? "demo-panel--phone" : ""}`}
        >
          {discussion}
        </section>
        {previewMode === "phone" && <div className="demo-phone-home" aria-hidden="true" />}
      </div>

      <footer className="demo-footer">Data is stored in <code>src/test-data</code>. “See more” waits 650 ms to mimic an API request.</footer>
    </main>
  );
}
