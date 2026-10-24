import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/app/App";
import "@/styles/index.css";

const ROOT_ID = "the-words-we-carry-root";

const rootElement = document.getElementById(ROOT_ID);

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} else {
  console.warn(
    `The Words We Carry: target element #${ROOT_ID} was not found.`,
  );
}