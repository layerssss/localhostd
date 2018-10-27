import React from "react";
import ReactDOM from "react-dom";
import { ToastContainer } from "react-toastify";

import LocalhostDConsole from "./localhostd_console.js";

import "bootswatch/paper/bootstrap.css";
import "font-awesome/css/font-awesome.css";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";

ReactDOM.render(
  <>
    <ToastContainer />
    <LocalhostDConsole />
  </>,
  document.getElementById("root")
);
