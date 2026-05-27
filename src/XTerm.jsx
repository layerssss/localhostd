import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle
} from "react";
import _ from "lodash";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

const XTerm = forwardRef(({ onData, onResize }, ref) => {
  const containerRef = useRef(null);
  const xtermRef = useRef(null);
  const onDataRef = useRef(onData);
  const onResizeRef = useRef(onResize);
  onDataRef.current = onData;
  onResizeRef.current = onResize;

  useImperativeHandle(ref, () => ({
    write: dataString => xtermRef.current?.write(dataString)
  }));

  useEffect(() => {
    const xterm = new Terminal({ cursorBlink: true });
    const fitAddon = new FitAddon();
    xtermRef.current = xterm;

    xterm.loadAddon(fitAddon);
    xterm.open(containerRef.current);

    xterm.onData(data => onDataRef.current?.(data));
    xterm.onResize(size => {
      _.defer(() => onResizeRef.current?.(size.cols, size.rows));
    });

    const handleResize = () => fitAddon.fit();
    window.addEventListener("resize", handleResize);
    fitAddon.fit();

    return () => {
      window.removeEventListener("resize", handleResize);
      xterm.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
    />
  );
});

XTerm.displayName = "XTerm";

export default XTerm;
