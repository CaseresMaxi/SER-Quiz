import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { MercadoPagoProvider } from "./contexts/MercadoPagoContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <MercadoPagoProvider>
      <App />
    </MercadoPagoProvider>
  </StrictMode>
);
