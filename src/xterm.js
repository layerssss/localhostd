import React from "react";
import _ from "lodash";
import { Terminal } from "xterm";
import "xterm/lib/xterm.css";

import * as fit from "xterm/lib/addons/fit/fit";

Terminal.applyAddon(fit);

class XTerm extends React.Component {
  fit = () => {
    this._xterm.fit();
  };

  write(dataString) {
    this._xterm.write(dataString);
  }

  componentDidMount() {
    this._xterm = new Terminal({
      cursorBlink: true
    });

    this._xterm.open(this.refs.container);
    this._xterm.on("data", data => {
      if (this.props.onData) this.props.onData(data);
    });

    this._xterm.on("resize", size => {
      if (this.props.onResize)
        _.defer(() => {
          this.props.onResize(size.cols, size.rows);
        });
    });

    window.addEventListener("resize", this.fit);

    this.fit();
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.fit);
  }

  render() {
    return (
      <div
        ref="container"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
      />
    );
  }
}

export default XTerm;
