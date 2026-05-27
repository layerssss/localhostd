import React, { useState } from "react";
import _ from "lodash";
import {
  Nav,
  Card,
  Button,
  ButtonGroup,
  ButtonToolbar
} from "react-bootstrap";
import QueryString from "query-string";

import ApplicationForm from "./application_form.js";
import ApplicationTerminal from "./application_terminal.js";
import OpenUrl from "./open_url.js";
import OpenBlob from "./open_blob.js";
import useUIState from "./with_ui_state.js";

export default function LocalhostDConsole() {
  const { loaded, uiState, doAction } = useUIState(true);
  const [activeApplicationIndex, setActiveApplicationIndex] = useState(-1);
  const [creatingApplication, setCreatingApplication] = useState(false);
  const [tab, setTab] = useState("terminal");

  if (!loaded) return null;

  const uiApplication = (uiState.applications || []).find(
    a =>
      a.domain === window.location.hostname ||
      window.location.hostname.endsWith(`.${a.domain}`)
  );

  if (uiApplication && !uiApplication.locked && uiApplication.running) {
    const query = QueryString.parse(window.location.search);
    window.location.href = query.redirect || "/";
  }

  const activeApplication =
    uiApplication || (uiState.applications || [])[activeApplicationIndex];

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
          <Nav variant="pills" className="flex-column">
            {_.sortBy(
              (uiState.applications || []).map((a, index) => ({
                ...a,
                index
              })),
              a => a.name
            ).map(application => (
              <Nav.Item key={application.name}>
                <Nav.Link
                  active={activeApplicationIndex === application.index}
                  onClick={() => {
                    setActiveApplicationIndex(application.index);
                    setCreatingApplication(false);
                  }}
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
                </Nav.Link>
              </Nav.Item>
            ))}
            <Nav.Item>
              <Nav.Link
                active={creatingApplication}
                onClick={() => {
                  setCreatingApplication(true);
                  setActiveApplicationIndex(-1);
                }}
              >
                <span className="fa fa-fw fa-plus" />
                New application
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                active={!creatingApplication && !activeApplication}
                onClick={() => {
                  setCreatingApplication(false);
                  setActiveApplicationIndex(-1);
                }}
              >
                <span className="fa fa-fw fa-info-circle" />
                Tips
              </Nav.Link>
            </Nav.Item>
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
        {creatingApplication && (
          <div style={{ flex: "1 1 auto", overflowY: "auto", padding: 10 }}>
            <Card>
              <Card.Header>New application</Card.Header>
              <Card.Body>
                <ApplicationForm
                  application={{
                    dir: uiState.homedir,
                    env: {},
                    timeout: 3600
                  }}
                  creating
                  onSubmit={applicationData => {
                    doAction("CreateApplication", { applicationData });
                    setCreatingApplication(false);
                  }}
                >
                  <Button onClick={() => setCreatingApplication(false)}>
                    Cancel
                  </Button>
                </ApplicationForm>
              </Card.Body>
            </Card>
          </div>
        )}
        {!creatingApplication && !!activeApplication && (
          <React.Fragment key={activeApplication.name}>
            <Card style={{ flex: "0 0 auto", margin: 0, borderRadius: 0 }}>
              <Card.Body>
                <ButtonToolbar className="gap-2">
                  {!uiApplication && (
                    <Button onClick={() => OpenUrl(activeApplication.origin)}>
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
                        { applicationName: activeApplication.name }
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
                        activeApplication.locked || !activeApplication.running
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
                      variant={tab === "terminal" ? "primary" : "outline-primary"}
                      onClick={() => setTab("terminal")}
                    >
                      <span className="fa fa-fw fa-terminal" />
                      Terminal
                    </Button>
                    <Button
                      variant={tab === "details" ? "primary" : "outline-primary"}
                      onClick={() => setTab("details")}
                    >
                      <span className="fa fa-fw fa-info" />
                      Details
                    </Button>
                  </ButtonGroup>
                </ButtonToolbar>
              </Card.Body>
            </Card>
            {tab === "details" && (
              <div
                style={{ flex: "1 1 auto", overflowY: "auto", padding: 10 }}
              >
                <Card>
                  <Card.Header>Details</Card.Header>
                  <Card.Body>
                    <ApplicationForm
                      application={activeApplication}
                      onSubmit={applicationData => {
                        doAction("CreateApplication", { applicationData });
                      }}
                    >
                      <Button
                        variant="danger"
                        onClick={() =>
                          doAction("DeleteApplication", {
                            applicationName: activeApplication.name
                          })
                        }
                      >
                        Delete
                      </Button>
                    </ApplicationForm>
                  </Card.Body>
                </Card>
              </div>
            )}
            {tab === "terminal" && (
              <div style={{ flex: "1 0 auto", position: "relative" }}>
                <ApplicationTerminal
                  applicationName={activeApplication.name}
                />
              </div>
            )}
          </React.Fragment>
        )}
        {!creatingApplication && !activeApplication && (
          <div style={{ flex: "1 1 auto", overflowY: "auto", padding: 10 }}>
            <Card>
              <Card.Header>Tips</Card.Header>
              <Card.Body>
                <p>{uiState.usageMessage}</p>
                <p>
                  You can also download the self-signed CA for signing SSL
                  connections.{" "}
                  <a
                    href="localhostd.ca.crt"
                    onClick={event => {
                      event.preventDefault();
                      if (!uiState.caCertificate) return;
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
              </Card.Body>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
