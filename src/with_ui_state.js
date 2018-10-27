import React from "react";
import { wrapDisplayName } from "recompose";
import { toast } from "react-toastify";

import ShimWebSocket from "./shim_web_socket.js";

let counter = 0;

const withUIState = WrappedComponent =>
  class extends React.Component {
    static displayName = wrapDisplayName(WrappedComponent, "withUIState");

    static defaultProps = {
      handleMessages: false
    };

    state = {
      loaded: false,
      terminalOutputEventName: `localhostdterminaloutput${(counter += 1)}`,
      uiState: {}
    };

    doAction(name, parameters) {
      if (!this.state.loaded) return;

      this.socket.send(
        JSON.stringify({
          name: name,
          parameters: parameters
        })
      );
    }

    componentDidMount() {
      const { handleMessages } = this.props;

      this.terminalHistory = {};
      const initSocket = () => {
        this.socket = new ShimWebSocket(
          window.location.origin.replace(/^http/, "ws")
        );

        this.socket.onmessage = messageEvent => {
          const { state, message, error, terminalOutput } = JSON.parse(
            messageEvent.data
          );

          if (state) {
            this.setState(({ uiState }) => ({
              uiState: {
                ...uiState,
                ...state
              },
              loaded: true
            }));
          }

          if (handleMessages) {
            if (message) {
              toast.success(message);
            }

            if (error) {
              toast.error(error.message);
            }
          }

          if (terminalOutput) {
            window.dispatchEvent(
              new CustomEvent(this.state.terminalOutputEventName, {
                detail: {
                  applicationName: terminalOutput.applicationName,
                  dataString: terminalOutput.dataString
                }
              })
            );
          }
        };

        this.socket.onerror = errorEvent => {
          toast.error("Connection error.");

          this.setState({
            loaded: false
          });
        };

        this.socket.onclose = () => {
          this.setState({
            loaded: false
          });

          setTimeout(initSocket, 1000);
        };
      };

      initSocket();
    }

    componentWillUnmount() {
      this.socket.close();
    }

    render() {
      return (
        <>
          {this.state.loaded && (
            <WrappedComponent
              uiState={this.state.uiState}
              doAction={this.doAction.bind(this)}
              terminalOutputEventName={this.state.terminalOutputEventName}
              {...this.props}
            />
          )}
        </>
      );
    }
  };

export default withUIState;
