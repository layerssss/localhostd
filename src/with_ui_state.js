import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "react-toastify";
import ShimWebSocket from "./shim_web_socket.js";

let counter = 0;

export default function useUIState(handleMessages = false) {
  const [loaded, setLoaded] = useState(false);
  const [uiState, setUiState] = useState({});
  const [terminalOutputEventName] = useState(
    () => `localhostdterminaloutput${(counter += 1)}`
  );
  const socketRef = useRef(null);
  const loadedRef = useRef(false);
  loadedRef.current = loaded;

  const doAction = useCallback((name, parameters) => {
    if (!loadedRef.current) return;
    socketRef.current?.send(JSON.stringify({ name, parameters }));
  }, []);

  useEffect(() => {
    const initSocket = () => {
      const socket = new ShimWebSocket(
        `${window.location.origin.replace(/^http/, "ws")}/_bnb_ui_state`
      );
      socketRef.current = socket;

      socket.onmessage = messageEvent => {
        const { state, message, error, terminalOutput } = JSON.parse(
          messageEvent.data
        );

        if (state) {
          setUiState(prev => ({ ...prev, ...state }));
          setLoaded(true);
        }

        if (handleMessages) {
          if (message) toast.success(message);
          if (error) toast.error(error.message);
        }

        if (terminalOutput) {
          window.dispatchEvent(
            new CustomEvent(terminalOutputEventName, {
              detail: {
                applicationName: terminalOutput.applicationName,
                dataString: terminalOutput.dataString
              }
            })
          );
        }
      };

      socket.onerror = () => {
        toast.error("Connection error.");
        setLoaded(false);
      };

      socket.onclose = () => {
        setLoaded(false);
        setTimeout(initSocket, 1000);
      };
    };

    initSocket();

    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  return { loaded, uiState, doAction, terminalOutputEventName };
}
