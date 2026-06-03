import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { GoogleOAuthProvider } from "@react-oauth/google";

ReactDOM.createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider clientId="1028138494317-46leqma1fm64vkoghpd343j4fre1o76d.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>,
);
