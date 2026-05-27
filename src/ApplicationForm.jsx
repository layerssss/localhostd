import React from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Form,
  InputGroup,
  Button,
  ButtonToolbar,
  Accordion
} from "react-bootstrap";

class ApplicationForm extends React.Component {
  newEnvButtonRef = React.createRef();

  state = {
    id: `application_form_${uuidv4()}`,
    name: "",
    hostname: "",
    command: "",
    ssl: false,
    port: 2000 + Math.floor(Math.random() * 1000),
    out: "",
    timeout: "",
    dir: "",
    env: {},
    envSearch: "",
    envNewKey: "",
    prevProps: {}
  };

  static getDerivedStateFromProps(props, state) {
    const { prevProps } = state;
    const { application } = props;
    const newState = { ...state, prevProps: props };

    if (!!prevProps.application !== !!application)
      Object.assign(newState, {
        ...application,
        hostname: String(application.hostname || ""),
        ssl: Boolean(application.ssl)
      });

    return newState;
  }

  isNameValid() {
    return this.state.name.match(/^[a-z\d][a-z\d-]*[a-z\d]$/);
  }

  isCommandValid() {
    return this.state.command;
  }

  isPortValid() {
    return !isNaN(this.state.port);
  }

  isValid() {
    return this.isNameValid() && this.isCommandValid() && this.isPortValid();
  }

  render() {
    const { children } = this.props;

    return (
      <Form
        onSubmit={ev => {
          ev.preventDefault();
          this.props.onSubmit({
            name: this.state.name,
            hostname: this.state.hostname,
            ssl: this.state.ssl,
            command: this.state.command,
            port: this.state.port,
            out: this.state.out,
            timeout: this.state.timeout,
            dir: this.state.dir,
            env: this.state.env
          });
        }}
      >
        <Form.Group controlId={`${this.state.id}_name`} className="mb-3">
          <Form.Label>Name:</Form.Label>
          <Form.Control
            type="text"
            required
            readOnly={!this.props.creating}
            value={this.state.name}
            isValid={!!this.isNameValid()}
            isInvalid={!this.isNameValid()}
            onChange={ev => this.setState({ name: ev.target.value })}
          />
        </Form.Group>
        <Form.Group controlId={`${this.state.id}_hostname`} className="mb-3">
          <Form.Label>Hostname:</Form.Label>
          <Form.Control
            type="text"
            value={this.state.hostname}
            onChange={ev => this.setState({ hostname: ev.target.value })}
            placeholder={`${this.state.name}.test`}
          />
        </Form.Group>
        <Form.Check
          className="mb-3"
          type="checkbox"
          id={`${this.state.id}_ssl`}
          label="SSL"
          checked={this.state.ssl}
          onChange={ev => this.setState({ ssl: ev.target.checked })}
        />
        <Form.Group controlId={`${this.state.id}_command`} className="mb-3">
          <Form.Label>Command:</Form.Label>
          <Form.Control
            type="text"
            value={this.state.command}
            isValid={!!this.isCommandValid()}
            isInvalid={!this.isCommandValid()}
            onChange={ev => this.setState({ command: ev.target.value })}
          />
        </Form.Group>
        <Form.Group controlId={`${this.state.id}_dir`} className="mb-3">
          <Form.Label>Working directory:</Form.Label>
          <Form.Control
            type="text"
            value={this.state.dir}
            onChange={ev => this.setState({ dir: ev.target.value })}
          />
        </Form.Group>
        <Form.Group controlId={`${this.state.id}_out`} className="mb-3">
          <Form.Label>Output path (optional):</Form.Label>
          <Form.Control
            type="text"
            value={this.state.out}
            onChange={ev => this.setState({ out: ev.target.value })}
          />
        </Form.Group>
        <Form.Group controlId={`${this.state.id}_timeout`} className="mb-3">
          <Form.Label>
            Timeout (idle seconds before shutting the application down,
            optional):
          </Form.Label>
          <Form.Control
            type="number"
            min={0}
            step={1}
            value={this.state.timeout}
            onChange={ev =>
              this.setState({ timeout: Number(ev.target.value) || "" })
            }
          />
        </Form.Group>
        <Form.Group controlId={`${this.state.id}_port`} className="mb-3">
          <Form.Label>Port:</Form.Label>
          <Form.Control
            type="number"
            min={1000}
            value={this.state.port}
            isValid={this.isPortValid()}
            isInvalid={!this.isPortValid()}
            onChange={ev => this.setState({ port: Number(ev.target.value) })}
          />
        </Form.Group>
        <Accordion className="mb-3">
          <Accordion.Item eventKey="0">
            <Accordion.Header>Environment</Accordion.Header>
            <Accordion.Body>
              <Form.Group className="mb-3">
                <Form.Control
                  type="text"
                  value={this.state.envSearch}
                  placeholder="type to search..."
                  onChange={ev => this.setState({ envSearch: ev.target.value })}
                />
              </Form.Group>
              {Object.keys(this.state.env)
                .filter(
                  k =>
                    k
                      .toLowerCase()
                      .indexOf(this.state.envSearch.toLowerCase()) !== -1
                )
                .sort()
                .map(envKey => (
                  <Form.Group
                    key={envKey}
                    controlId={`${this.state.id}_env_${envKey}`}
                    className="mb-2"
                  >
                    <Form.Label>{envKey}:</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type="text"
                        value={this.state.env[envKey]}
                        onChange={ev =>
                          this.setState({
                            env: { ...this.state.env, [envKey]: ev.target.value }
                          })
                        }
                      />
                      <Button
                        variant="outline-secondary"
                        onClick={() => {
                          const env = { ...this.state.env };
                          delete env[envKey];
                          this.setState({ env });
                        }}
                      >
                        Delete
                      </Button>
                    </InputGroup>
                  </Form.Group>
                ))}
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
        <InputGroup className="mb-3">
          <Form.Control
            type="text"
            placeholder="new environment variable"
            value={this.state.envNewKey}
            onChange={ev => this.setState({ envNewKey: ev.target.value })}
            onKeyPress={ev => {
              if (ev.charCode !== 13) return;
              ev.preventDefault();
              this.newEnvButtonRef.current.click();
            }}
          />
          <Button
            ref={this.newEnvButtonRef}
            onClick={() =>
              this.setState({
                env: { ...this.state.env, [this.state.envNewKey]: "" },
                envNewKey: ""
              })
            }
          >
            Add environment variable
          </Button>
        </InputGroup>
        <ButtonToolbar className="gap-2">
          <Button variant="primary" type="submit" disabled={!this.isValid()}>
            {this.props.creating ? "Create" : "Save changes"}
          </Button>
          {children}
        </ButtonToolbar>
      </Form>
    );
  }
}

export default ApplicationForm;
