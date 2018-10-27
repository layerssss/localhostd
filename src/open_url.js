import isElectorn from "is-electron";

function OpenUrl(url) {
  if (isElectorn()) {
    const { shell } = window.require("electron");
    shell.openExternal(url);
  } else {
    window.location.href = url;
  }
}

export default OpenUrl;
