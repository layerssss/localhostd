import React from "react";
import { compose, withProps } from "recompose";
import {
  Nav,
  NavItem,
  Panel,
  Button,
  ButtonGroup,
  ButtonToolbar
} from "react-bootstrap";

import ApplicationForm from "./application_form.js";
import ApplicationTerminal from "./application_terminal.js";
import OpenUrl from "./open_url.js";
import OpenBlob from "./open_blob.js";
import withUIState from "./with_ui_state.js";

export default compose(
  withProps({ handleMessages: true }),
  withUIState
)(
  class LocalhostDConsole extends React.Component {
    state = {
      activeApplicationIndex: -1,
      creatingApplication: false,
      tab: "terminal"
    };

    render() {
      const { uiState, doAction } = this.props;

      const uiApplication = uiState.applications.find(
        a =>
          a.domain === window.location.hostname ||
          window.location.hostname.endsWith(`.${a.domain}`)
      );

      if (uiApplication && !uiApplication.locked && uiApplication.running)
        window.location.reload();

      const activeApplication =
        uiApplication ||
        uiState.applications[this.state.activeApplicationIndex];

      return (
        <>
          {!uiApplication && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                bottom: 0,
                width: 300,
                padding: 10,
                overflowY: "auto"
              }}
            >
              <Nav bsStyle="pills" stacked>
                {uiState.applications.map((application, applicationIndex) => (
                  <NavItem
                    key={application.name}
                    active={activeApplication === application}
                    onClick={() =>
                      this.setState({
                        activeApplicationIndex: applicationIndex,
                        creatingApplication: false
                      })
                    }
                  >
                    <span
                      className={`fa fa-fw ${
                        application.locked
                          ? "fa-spin fa-spinner"
                          : application.running
                          ? "fa-cube"
                          : ""
                      }`}
                    />
                    {application.name}
                  </NavItem>
                ))}
                <NavItem
                  active={this.state.creatingApplication}
                  onClick={() =>
                    this.setState({
                      creatingApplication: true,
                      activeApplicationIndex: -1
                    })
                  }
                >
                  <span className="fa fa-fw fa-plus" />
                  New application
                </NavItem>
                <NavItem
                  active={!this.state.creatingApplication && !activeApplication}
                  onClick={() =>
                    this.setState({
                      creatingApplication: false,
                      activeApplicationIndex: -1
                    })
                  }
                >
                  <span className="fa fa-fw fa-info-circle" />
                  Tips
                </NavItem>
              </Nav>
            </div>
          )}
          <div
            style={{
              position: "fixed",
              left: uiApplication ? 0 : 300,
              top: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              flexFlow: "column nowrap",
              overflow: "hidden"
            }}
          >
            {this.state.creatingApplication && (
              <div
                style={{
                  flex: "1 1 auto",
                  overflowY: "auto",
                  padding: 10
                }}
              >
                <Panel>
                  <Panel.Heading>New application</Panel.Heading>
                  <Panel.Body>
                    <ApplicationForm
                      application={{
                        dir: uiState.homedir,
                        env: {},
                        timeout: 600
                      }}
                      creating
                      onSubmit={applicationData => {
                        doAction("CreateApplication", {
                          applicationData
                        });

                        this.setState({
                          creatingApplication: false
                        });
                      }}
                    >
                      <Button
                        onClick={ev =>
                          this.setState({
                            creatingApplication: false
                          })
                        }
                      >
                        Cancel
                      </Button>
                    </ApplicationForm>
                  </Panel.Body>
                </Panel>
              </div>
            )}
            {!this.state.creatingApplication && !!activeApplication && (
              <React.Fragment key={activeApplication.name}>
                <Panel
                  style={{
                    flex: "0 0 auto",
                    margin: 0,
                    borderRadius: 0
                  }}
                >
                  <Panel.Body>
                    <ButtonToolbar>
                      {!uiApplication && (
                        <Button
                          onClick={() => OpenUrl(activeApplication.origin)}
                        >
                          <span className="fa fa-fw fa-globe" />
                          {activeApplication.origin}
                        </Button>
                      )}
                      {uiApplication && (
                        <Button
                          onClick={() => OpenUrl(`http://${uiState.uiHost}`)}
                        >
                          <span className="fa fa-fw fa-home" />
                          View all applications
                        </Button>
                      )}
                      <Button
                        disabled={activeApplication.locked}
                        onClick={() =>
                          doAction(
                            activeApplication.running
                              ? "StopApplication"
                              : "StartApplication",
                            {
                              applicationName: activeApplication.name
                            }
                          )
                        }
                      >
                        <span
                          className={`fa fa-fw fa-${
                            activeApplication.locked
                              ? "spinner fa-spin"
                              : activeApplication.running
                              ? "stop"
                              : "play"
                          }`}
                        />
                      </Button>
                      {!uiApplication && (
                        <Button
                          disabled={
                            activeApplication.locked ||
                            !activeApplication.running
                          }
                          onClick={() =>
                            doAction("RestartApplication", {
                              applicationName: activeApplication.name
                            })
                          }
                        >
                          <span className="fa fa-fw fa-repeat" />
                        </Button>
                      )}
                      <ButtonGroup>
                        <Button
                          active={this.state.tab === "terminal"}
                          onClick={() =>
                            this.setState({
                              tab: "terminal"
                            })
                          }
                        >
                          <span className="fa fa-fw fa-terminal" />
                          Terminal
                        </Button>
                        <Button
                          active={this.state.tab === "details"}
                          onClick={() =>
                            this.setState({
                              tab: "details"
                            })
                          }
                        >
                          <span className="fa fa-fw fa-info" />
                          Details
                        </Button>
                      </ButtonGroup>
                    </ButtonToolbar>
                  </Panel.Body>
                </Panel>
                {this.state.tab === "details" && (
                  <div
                    style={{
                      flex: "1 1 auto",
                      overflowY: "auto",
                      padding: 10
                    }}
                  >
                    <Panel>
                      <Panel.Heading>Details</Panel.Heading>
                      <Panel.Body>
                        <ApplicationForm
                          application={activeApplication}
                          onSubmit={applicationData => {
                            doAction("CreateApplication", {
                              applicationData
                            });
                          }}
                        >
                          <Button
                            bsStyle="danger"
                            onClick={() =>
                              doAction("DeleteApplication", {
                                applicationName: activeApplication.name
                              })
                            }
                          >
                            Delete
                          </Button>
                        </ApplicationForm>
                      </Panel.Body>
                    </Panel>
                  </div>
                )}
                {this.state.tab === "terminal" && (
                  <div
                    style={{
                      flex: "1 0 auto",
                      position: "relative"
                    }}
                  >
                    <ApplicationTerminal
                      applicationName={activeApplication.name}
                    />
                  </div>
                )}
              </React.Fragment>
            )}
            {!this.state.creatingApplication && !activeApplication && (
              <div
                style={{
                  flex: "1 1 auto",
                  overflowY: "auto",
                  padding: 10
                }}
              >
                <Panel>
                  <Panel.Heading>Tips:</Panel.Heading>
                  <Panel.Body>
                    <p>{uiState.usageMessage}</p>
                    <p>
                      You can also download the self-signed CA for signing SSL
                      connections.
                      <a
                        href="localhostd.ca.crt"
                        disabled={!uiState.caCertificate}
                        onClick={event => {
                          event.preventDefault();
                          OpenBlob(
                            "localhostd.ca.crt",
                            new Blob([uiState.caCertificate])
                          );
                        }}
                      >
                        <span className="fa fa-fw fa-download" />
                        SSL CA certificate
                      </a>
                    </p>
                  </Panel.Body>
                </Panel>
              </div>
            )}
          </div>
        </>
      );
    }
  }
);
