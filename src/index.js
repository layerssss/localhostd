import React from "react";
import { createRoot } from "react-dom/client";
import { ToastContainer } from "react-toastify";

import LocalhostDConsole from "./localhostd_console.js";

import "bootswatch/paper/bootstrap.css";
import "font-awesome/css/font-awesome.css";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";

const root = createRoot(document.getElementById("root"));
root.render(
  <>
    <ToastContainer />
    <LocalhostDConsole />
  </>
);
