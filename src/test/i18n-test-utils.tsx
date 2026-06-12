import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n";

function renderWithI18n(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
  }
  return render(ui, { wrapper: Wrapper, ...options });
}

export { renderWithI18n };
export default i18n;
