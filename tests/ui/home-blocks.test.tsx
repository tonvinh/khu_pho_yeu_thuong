// @vitest-environment jsdom
// Các khối trang chủ: dải 3 con số (Figma Frame 163 — node thứ 4 "+300 Người đóng góp"
// là node ẩn nên design thật CHỈ CÓ 3 ô), tab lọc, và khối ưu đãi.
// Quyết định 2/9: DESIGN THẮNG SPEC → khối ưu đãi bỏ dòng "Bạn sẽ xác thực số điện
// thoại một lần…" (docs/06 §65).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Counters from "@/components/home/Counters";
import LeadSection from "@/components/home/LeadSection";
import LeadPromptModal from "@/components/home/LeadPromptModal";
import { FilterTabs } from "@/components/home/ui";
import { COPY } from "@/lib/copy";
import { runNow, siteContent } from "./helpers";

const apiGet = vi.fn();
const apiSend = vi.fn();
vi.mock("@/components/client-api", () => ({
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiSend: (...a: unknown[]) => apiSend(...a),
  BASE: "",
}));

beforeEach(() => {
  apiGet.mockReset();
  apiSend.mockReset();
  apiGet.mockResolvedValue({ provinces: [{ code: "79", name: "Thành phố Hồ Chí Minh" }] });
  apiSend.mockResolvedValue({});
});
afterEach(cleanup);

describe("Counters — dải 3 con số", () => {
  it("render đúng 3 ô theo nhãn chuẩn và đệm 0 cho số < 10", () => {
    render(
      <Counters
        counters={{ signs_installed: 8, issues_open: 25, neighborhoods_joined: 0, suggestions_total: 300 }}
      />
    );
    expect(COPY.counterLabels).toHaveLength(3);
    for (const label of COPY.counterLabels) expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByText("08")).toBeTruthy();
    expect(screen.getByText("25")).toBeTruthy();
    expect(screen.getByText("00")).toBeTruthy();
    // "+300 Người đóng góp" là node ẨN trong .fig → không được render
    expect(screen.queryByText(/Người đóng góp/)).toBeNull();
  });

  it("mobile giữ 1 hàng 3 cột (số trên — nhãn dưới)", () => {
    const { container } = render(
      <Counters
        counters={{ signs_installed: 65, issues_open: 25, neighborhoods_joined: 8, suggestions_total: 0 }}
      />
    );
    expect(container.firstElementChild!.className).toContain("grid-cols-3");
  });
});

describe("FilterTabs", () => {
  it("đổi tab gọi đúng key và hiện số đếm", () => {
    const onChange = vi.fn();
    render(
      <FilterTabs
        tabs={[
          { key: "latest", label: "Mới nhất", count: 5 },
          { key: "to_vote", label: "Chờ bạn bình chọn", short: "Chờ bình chọn", count: 4 },
        ]}
        active="latest"
        onChange={onChange}
      />
    );
    expect(screen.getByText("5")).toBeTruthy();
    fireEvent.click(screen.getByText("Chờ bạn bình chọn").closest("button")!);
    expect(onChange).toHaveBeenCalledWith("to_vote");
  });

  it("mobile chừa lề trái 16px — tab đầu không chạm mép màn hình", () => {
    const { container } = render(
      <FilterTabs tabs={[{ key: "latest", label: "Mới nhất", count: 1 }]} active="latest" onChange={() => {}} />
    );
    const row = container.firstElementChild as HTMLElement;
    expect(row.className).toContain("px-4");
    expect(row.className).not.toContain("-mx-4");
  });
});

describe("LeadSection — khối ưu đãi", () => {
  const renderLead = () =>
    render(
      <LeadSection me={null} content={siteContent()} requireIdentity={runNow} showToast={vi.fn()} />
    );

  it("hiện form theo design", () => {
    renderLead();
    expect(screen.getByText("Họ và tên")).toBeTruthy();
    expect(screen.getByText("Số điện thoại")).toBeTruthy();
    expect(screen.getByText("Tỉnh thành")).toBeTruthy();
    expect(screen.getByText("Địa chỉ")).toBeTruthy();
  });

  it("KHÔNG còn dòng nhắc xác thực SĐT dưới nút (design 18/8 bỏ)", () => {
    renderLead();
    expect(screen.queryByText(/Bạn sẽ xác thực số điện thoại một lần/)).toBeNull();
  });

  it("chưa tick đồng ý thì không gửi lead", () => {
    renderLead();
    fireEvent.click(screen.getByRole("button", { name: COPY.leadButton }));
    expect(screen.getByText("Cần tick đồng ý nhận ưu đãi thì tụi mình mới lưu số nhé")).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });
});

describe("LeadPromptModal — popup không có trong design", () => {
  it("dựng trong khung popup chuẩn và chặn gửi khi chưa tick đồng ý", () => {
    const { container } = render(
      <LeadPromptModal me={null} content={siteContent()} onClose={vi.fn()} showToast={vi.fn()} />
    );
    // dùng chung khung Modal 700px + sọc đáy như 4 popup có design
    expect(screen.getByRole("dialog").className).toContain("sm:max-w-[700px]");
    expect(container.querySelector(".kp-stripe-b")).toBeTruthy();
    expect(container.querySelector(".kp-input-lg")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: COPY.leadButton }));
    expect(screen.getByText("Cần tick đồng ý nhận ưu đãi thì tụi mình mới lưu số nhé")).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });
});
