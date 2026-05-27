import isElectorn from "is-electron";
import _ from 'lodash';

function OpenBlob(name, blob) {
  if (isElectorn()) {
    const { ipcRenderer } = window.require("electron");

    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.addEventListener("load", () => {
      ipcRenderer.send(
        "renderer-open",
        name,
        reader.result.replace(/^.*base64,/, "")
      );
    });
  } else {
    const a = document.createElement("a");
    a.style = "display: none;";
    a.target = "_blank";
    a.href = window.URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    _.defer(() => {
      window.URL.revokeObjectURL(a.href);
    });
  }
}

export default OpenBlob;
