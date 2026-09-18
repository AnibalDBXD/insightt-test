import "@/i18n";
import { render, screen } from "@testing-library/react";
import LoginPage from "@/pages/login";

jest.mock("next/router", () => ({
  useRouter: () => ({ query: {}, push: jest.fn(), replace: jest.fn() }),
}));

describe("LoginPage", () => {
  it("renders the sign in form", () => {
    render(<LoginPage />);
    expect(screen.getByRole("heading", { name: /Welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign in/i })).toBeInTheDocument();
  });
});
