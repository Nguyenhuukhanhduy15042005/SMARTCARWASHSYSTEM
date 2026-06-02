import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { GoogleOAuthProvider } from "@react-oauth/google"; // Import cái này

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* Đừng quên thay client_id bên dưới bằng ID thật của bạn */}
    <GoogleOAuthProvider clientId="1028138494317-jh8hgdm3310geha7bsdoul1g86oac7ec.apps.googleusercontent.com">
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
