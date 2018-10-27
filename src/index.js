import React from "react";
import ReactDOM from "react-dom";
import LocalhostDConsole from "./localhostd_console.js";
import { ToastContainer } from "react-toastify";
import "bootswatch/paper/bootstrap.css";
import "font-awesome/css/font-awesome.css";
import "react-toastify/dist/ReactToastify.css";

ReactDOM.render(
  <>
    <ToastContainer />
    <LocalhostDConsole />
  </>,
  document.getElementById("root")
);
