import isElectorn from "is-electron";

function OpenUrl(url) {
  if (isElectorn()) {
    window.electronAPI.openExternal(url);
  } else {
    window.location.href = url;
  }
}

export default OpenUrl;
