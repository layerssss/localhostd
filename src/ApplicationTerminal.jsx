import { useEffect, useRef } from "react";
import useUIState from "./useUIState.js";
import XTerm from "./XTerm.jsx";

export default function ApplicationTerminal({ applicationName }) {
  const { doAction, terminalOutputEventName } = useUIState();
  const xTermRef = useRef(null);

  useEffect(() => {
    const handler = event => {
      if (applicationName !== event.detail.applicationName) return;
      xTermRef.current?.write(event.detail.dataString);
    };
    window.addEventListener(terminalOutputEventName, handler);
    return () => window.removeEventListener(terminalOutputEventName, handler);
  }, [terminalOutputEventName, applicationName]);

  return (
    <XTerm
      ref={xTermRef}
      onResize={(cols, rows) =>
        doAction("ResizeTerminal", { applicationName, cols, rows })
      }
      onData={dataString =>
        doAction("InputTerminal", { applicationName, dataString })
      }
    />
  );
}
