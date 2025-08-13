import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";          // 你也可以移除這行，用瀏覽器預設樣式

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
