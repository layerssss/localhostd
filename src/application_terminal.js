import { compose } from "recompose";
import React from "react";
import EventListener from "react-event-listener";

import withUIState from "./with_ui_state.js";
import XTerm from "./xterm.js";

export default compose(withUIState)(
  class ApplicationTerminal extends React.Component {
    render() {
      const { doAction, applicationName, terminalOutputEventName } = this.props;

      return (
        <>
          <EventListener
            target="window"
            {...{
              [`on${terminalOutputEventName}`]: event => {
                if (applicationName !== event.detail.applicationName) return;
                this.refs.xTerm.write(event.detail.dataString);
              }
            }}
          />
          <XTerm
            ref={`xTerm`}
            onResize={(cols, rows) =>
              doAction("ResizeTerminal", {
                applicationName,
                cols,
                rows
              })
            }
            onData={dataString =>
              doAction("InputTerminal", {
                applicationName,
                dataString
              })
            }
          />
        </>
      );
    }
  }
);
