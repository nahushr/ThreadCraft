/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHubIssueThread, ReviewThread } from "./ThreadedDiscussion";
import type { ThreadCraftData } from "./types";

afterEach(cleanup);

describe("ThreadedDiscussion examples", () => {
  it("loads the next root page asynchronously and appends it", async () => {
    const data: ThreadCraftData = {
      id: 42,
      title: "Issue with export",
      comments: [{ id: "root-1", author: "Ari", text: "First root" }],
      hasMore: true,
    };
    const onLoadMore = vi.fn(async () => ({
      comments: [{ id: "root-2", author: "Dee", text: "Loaded from API" }],
      hasMore: false,
    }));

    render(<GitHubIssueThread data={data} initialRootLimit={1} loadMoreCount={1} onLoadMore={onLoadMore} />);
    fireEvent.click(screen.getByRole("button", { name: "See more comments" }));

    expect(await screen.findByText("Loaded from API")).toBeTruthy();
    expect(onLoadMore).toHaveBeenCalledWith({ offset: 1, limit: 1 });
    expect(screen.queryByRole("button", { name: "See more comments" })).toBeNull();
  });

  it("reveals already-loaded roots even when the JSON says there are no more API pages", async () => {
    const data: ThreadCraftData = {
      title: "Loaded issue",
      hasMore: false,
      comments: [
        { id: "root-1", author: "Ari", text: "First root" },
        { id: "root-2", author: "Dee", text: "Second root" },
      ],
    };
    render(<GitHubIssueThread data={data} initialRootLimit={1} />);

    fireEvent.click(screen.getByRole("button", { name: "See more comments" }));

    expect(await screen.findByText("Second root")).toBeTruthy();
  });

  it("shows and collects the rating control only when review data opts in", () => {
    const data: ThreadCraftData = {
      kind: "review",
      title: "Cotton Tee",
      showRating: true,
      comments: [{ id: "review-1", author: "Ari", text: "Soft fabric", rating: 4 }],
    };
    const { rerender } = render(<ReviewThread data={data} />);
    expect(screen.getByLabelText("Rated 4 out of 5")).toBeTruthy();
    expect(screen.getByText("Your rating")).toBeTruthy();

    rerender(<ReviewThread data={{ ...data, showRating: false }} />);
    expect(screen.queryByLabelText("Rated 4 out of 5")).toBeNull();
    expect(screen.queryByText("Your rating")).toBeNull();
  });

  it("inserts selected emoji into the comment draft", async () => {
    const data: ThreadCraftData = { title: "Issue", comments: [] };
    render(<GitHubIssueThread data={data} />);

    fireEvent.click(screen.getByLabelText("Add emoji"));
    fireEvent.click(await screen.findByRole("button", { name: "Insert red heart" }));

    expect((screen.getByLabelText("Add a comment") as HTMLTextAreaElement).value).toBe("❤️");
    expect(screen.queryByRole("dialog", { name: "Emoji picker" })).toBeNull();
  });

  it("searches the full emoji catalog by name and inserts a match", async () => {
    const data: ThreadCraftData = { title: "Issue", comments: [] };
    render(<GitHubIssueThread data={data} />);

    fireEvent.click(screen.getByLabelText("Add emoji"));
    fireEvent.change(screen.getByPlaceholderText("Search emoji"), { target: { value: "rocket" } });
    fireEvent.click(await screen.findByRole("button", { name: "Insert rocket" }));

    expect((screen.getByLabelText("Add a comment") as HTMLTextAreaElement).value).toBe("🚀");
  });

  it("lets issue replies choose support or customer and sends the selected identity", async () => {
    const data: ThreadCraftData = {
      title: "Issue",
      comments: [{ id: "issue-root", author: "Ari", text: "Could you help?" }],
    };
    const onSubmitComment = vi.fn(async () => undefined);
    render(<GitHubIssueThread data={data} onSubmitComment={onSubmitComment} />);

    fireEvent.click(screen.getByRole("button", { name: "Reply", exact: true }));

    const rolePicker = screen.getByRole("combobox", { name: "Replying as" }) as HTMLSelectElement;
    expect([...rolePicker.options].map((option) => option.value)).toEqual(["support", "customer"]);
    expect(rolePicker.value).toBe("support");
    fireEvent.change(rolePicker, { target: { value: "customer" } });
    fireEvent.change(screen.getByLabelText("Write a reply"), { target: { value: "I can help." } });
    fireEvent.submit(screen.getByLabelText("Write a reply").closest("form")!);

    await waitFor(() => expect(onSubmitComment).toHaveBeenCalledWith(expect.objectContaining({
      parentId: "issue-root",
      authorType: "customer",
    })));
    expect(await screen.findByText("customer")).toBeTruthy();
  });

  it("offers customer and business identities for review replies", () => {
    const data: ThreadCraftData = {
      kind: "review",
      title: "Cotton Tee",
      showRating: true,
      comments: [{ id: "review-root", author: "Ari", text: "Soft fabric" }],
    };
    render(<ReviewThread data={data} />);

    fireEvent.click(screen.getByRole("button", { name: "Reply", exact: true }));

    const rolePicker = screen.getByRole("combobox", { name: "Replying as" }) as HTMLSelectElement;
    expect([...rolePicker.options].map((option) => option.value)).toEqual(["customer", "business"]);
    expect(rolePicker.value).toBe("business");
  });

  it("renders every emoji in the selected category without pagination", async () => {
    const data: ThreadCraftData = { title: "Issue", comments: [] };
    render(<GitHubIssueThread data={data} />);

    fireEvent.click(screen.getByLabelText("Add emoji"));
    fireEvent.click(await screen.findByRole("button", { name: "People & Body" }));

    expect(screen.getAllByRole("button", { name: /^Insert / })).toHaveLength(1606);
    expect(screen.queryByRole("button", { name: "Show more emoji" })).toBeNull();
  });

  it("shows and increments GitHub reaction aliases", () => {
    const data: ThreadCraftData = {
      title: "GitHub issue",
      comments: [{ id: "root", author: "Ari", text: "Looks good", reactions: { "+1": 3 } }],
    };
    render(<GitHubIssueThread data={data} />);

    fireEvent.click(screen.getByRole("button", { name: "React with 👍, 3 reactions" }));

    expect(screen.getByRole("button", { name: "React with 👍, 4 reactions" })).toBeTruthy();
  });
});
