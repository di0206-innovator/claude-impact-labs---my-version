import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { EvidenceExportPanel } from "@/components/assistant/EvidenceExportPanel";
import { AssistantAnswer } from "@/components/assistant/AssistantAnswer";
import { AssistantChat } from "@/components/assistant/AssistantChat";
import type { AssistantStructuredResponse } from "@/lib/assistant/types";

vi.mock("@/app/assistant/actions", () => ({
  askAssistantAction: vi.fn().mockResolvedValue({
    response: {
      answer: "Road RD0065 in Ward F/S was repaired by CT05.",
      responseLanguage: "en",
      complaintStatus: "Completed",
      linkedIssueReference: "ISSUE-1",
      workOrderReferences: ["WO-1"],
      relevantTimelineEvents: [],
      evidenceSources: ["tool:get_work_orders"],
      nextAction: "File review if defect recurs.",
      limitations: [],
      isOfficialLink: true,
      contractorName: "Sahyadri Infra (CT05)",
      costInr: 120000,
    } as AssistantStructuredResponse,
  }),
}));

describe("assistant UI with evidence pack export", () => {
  describe("EvidenceExportPanel component", () => {
    it("renders export options and quick selects", () => {
      render(<EvidenceExportPanel />);
      expect(screen.getByText("Export Audit Evidence Pack")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Road Passport" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "A4 Official PDF" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText("Senapati Bapat Marg")).toBeInTheDocument();
    });

    it("switches type to Contractor Dossier and updates quick picks", () => {
      render(<EvidenceExportPanel />);
      fireEvent.click(screen.getByRole("button", { name: "Contractor Dossier" }));

      expect(screen.getByRole("button", { name: "Contractor Dossier" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText("Eagle Infra (CT01)")).toBeInTheDocument();
      const downloadLink = screen.getByRole("link", { name: /Download PDF Evidence Pack/i });
      expect(downloadLink).toHaveAttribute("href", expect.stringContaining("/api/export/contractor/CT01"));
    });

    it("switches format to CSV and updates download link", () => {
      render(<EvidenceExportPanel initialType="ward" initialId="F/S" />);
      fireEvent.click(screen.getByRole("button", { name: "Audit CSV" }));

      const downloadLink = screen.getByRole("link", { name: /Download CSV Evidence Pack/i });
      expect(downloadLink).toHaveAttribute("href", expect.stringContaining("format=csv"));
    });

    it("invokes onClose when close button clicked", () => {
      const handleClose = vi.fn();
      render(<EvidenceExportPanel onClose={handleClose} />);
      fireEvent.click(screen.getByRole("button", { name: "Close export panel" }));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("AssistantAnswer context-sensitive export chips", () => {
    it("renders export chips when text mentions road RD0065, contractor CT05, and ward F/S", () => {
      render(
        <AssistantAnswer
          text="Road RD0065 in Ward F/S was repaired by CT05."
          data={{
            answer: "Road RD0065 in Ward F/S was repaired by CT05.",
            responseLanguage: "en",
            complaintStatus: "Completed",
            linkedIssueReference: "ISSUE-1",
            workOrderReferences: ["WO25-00004"],
            relevantTimelineEvents: [],
            evidenceSources: [],
            nextAction: "Inspect repair",
            limitations: [],
            isOfficialLink: true,
            contractorName: "Sahyadri Infra (CT05)",
            costInr: 50000,
          }}
        />,
      );

      expect(screen.getByText("Export Evidence Dossier:")).toBeInTheDocument();
      expect(screen.getByText("RD0065")).toBeInTheDocument();
      expect(screen.getByText("CT05")).toBeInTheDocument();
      expect(screen.getByText("Ward F/S")).toBeInTheDocument();

      const links = screen.getAllByRole("link");
      const hrefs = links.map((l) => l.getAttribute("href"));
      expect(hrefs.some((h) => h?.includes("/api/export/road/RD0065"))).toBe(true);
      expect(hrefs.some((h) => h?.includes("/api/export/contractor/CT05"))).toBe(true);
      expect(hrefs.some((h) => h?.includes("/api/export/ward/F-S"))).toBe(true);
    });
  });

  describe("AssistantChat export drawer toggle", () => {
    it("toggles evidence export panel open and closed", () => {
      render(<AssistantChat />);
      const exportBtn = screen.getByRole("button", { name: /Export Evidence Pack/i });
      expect(exportBtn).toBeInTheDocument();

      // Open drawer
      fireEvent.click(exportBtn);
      expect(screen.getByText("Export Audit Evidence Pack")).toBeInTheDocument();

      // Close drawer via close button
      fireEvent.click(screen.getByRole("button", { name: "Close export panel" }));
      expect(screen.queryByText("Export Audit Evidence Pack")).not.toBeInTheDocument();
    });
  });
});
