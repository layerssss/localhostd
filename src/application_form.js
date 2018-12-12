import React from "react";
import ReactDOM from "react-dom";
import uuid from "uuid";
import {
  Form,
  FormGroup,
  FormControl,
  Checkbox,
  ControlLabel,
  InputGroup,
  Button,
  ButtonToolbar,
  Panel
} from "react-bootstrap";

class ApplicationForm extends React.Component {
  state = {
    id: `application_form_${uuid.v4()}`,
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
        <FormGroup
          controlId={`${this.state.id}_name`}
          validationState={this.isNameValid() ? "success" : "error"}
        >
          <ControlLabel>Name:</ControlLabel>
          <FormControl
            type="text"
            required
            readOnly={!this.props.creating}
            value={this.state.name}
            onChange={ev =>
              this.setState({
                name: ev.target.value
              })
            }
          />
        </FormGroup>
        <FormGroup controlId={`${this.state.id}_hostname`}>
          <ControlLabel>Hostname:</ControlLabel>
          <FormControl
            type="text"
            value={this.state.hostname}
            onChange={ev =>
              this.setState({
                hostname: ev.target.value
              })
            }
            placeholder={`${this.state.name}.test`}
          />
        </FormGroup>
        <Checkbox
          checked={this.state.ssl}
          onChange={ev => this.setState({ ssl: ev.target.checked })}
        >
          SSL
        </Checkbox>
        <FormGroup
          controlId={`${this.state.id}_command`}
          validationState={this.isCommandValid() ? "success" : "error"}
        >
          <ControlLabel>Command:</ControlLabel>
          <FormControl
            type="text"
            value={this.state.command}
            onChange={ev =>
              this.setState({
                command: ev.target.value
              })
            }
          />
        </FormGroup>
        <FormGroup controlId={`${this.state.id}_dir`} validationState="success">
          <ControlLabel>Working directory:</ControlLabel>
          <FormControl
            type="text"
            value={this.state.dir}
            onChange={ev =>
              this.setState({
                dir: ev.target.value
              })
            }
          />
        </FormGroup>
        <FormGroup controlId={`${this.state.id}_out`} validationState="success">
          <ControlLabel>Output path (optional):</ControlLabel>
          <FormControl
            type="text"
            value={this.state.out}
            onChange={ev =>
              this.setState({
                out: ev.target.value
              })
            }
          />
        </FormGroup>
        <FormGroup
          controlId={`${this.state.id}_timeout`}
          validationState="success"
        >
          <ControlLabel>
            Timeout (idle seconds before shutting the application down,
            optional):
          </ControlLabel>
          <FormControl
            type="number"
            min={0}
            step={60}
            value={this.state.timeout}
            onChange={ev =>
              this.setState({
                timeout: Number(ev.target.value) || ""
              })
            }
          />
        </FormGroup>
        <FormGroup
          controlId={`${this.state.id}_port`}
          validationState={this.isPortValid() ? "success" : "error"}
        >
          <ControlLabel>Port:</ControlLabel>
          <FormControl
            type="number"
            min={1000}
            value={this.state.port}
            onChange={ev =>
              this.setState({
                port: Number(ev.target.value)
              })
            }
          />
        </FormGroup>
        <Panel id={`${this.state.id}_env`}>
          <Panel.Heading>
            <Panel.Title toggle>Environment:</Panel.Title>
          </Panel.Heading>
          <Panel.Collapse>
            <Panel.Body>
              <FormGroup>
                <FormControl
                  type="text"
                  value={this.state.envSearch}
                  placeholder={"type to search..."}
                  onChange={ev =>
                    this.setState({
                      envSearch: ev.target.value
                    })
                  }
                />
              </FormGroup>
              {Object.keys(this.state.env)
                .filter(
                  k =>
                    -1 !==
                    k.toLowerCase().indexOf(this.state.envSearch.toLowerCase())
                )
                .sort()
                .map(envKey => (
                  <FormGroup
                    id={envKey}
                    controlId={`${this.state.id}_env_${envKey}`}
                    validationState="success"
                  >
                    <ControlLabel>{envKey}:</ControlLabel>
                    <InputGroup>
                      <FormControl
                        type="text"
                        value={this.state.env[envKey]}
                        onChange={ev =>
                          this.setState({
                            env: {
                              ...this.state.env,
                              [envKey]: ev.target.value
                            }
                          })
                        }
                      />
                      <InputGroup.Button>
                        <Button
                          onClick={() => {
                            delete this.state.env[envKey];
                            this.forceUpdate();
                          }}
                        >
                          Delete
                        </Button>
                      </InputGroup.Button>
                    </InputGroup>
                  </FormGroup>
                ))}
            </Panel.Body>
          </Panel.Collapse>
        </Panel>
        <FormGroup validationState="success">
          <InputGroup>
            <FormControl
              type="text"
              placeholder="new environment variable"
              value={this.state.envNewKey}
              onChange={ev =>
                this.setState({
                  envNewKey: ev.target.value
                })
              }
              onKeyPress={ev => {
                if (ev.charCode !== 13) return;
                ev.preventDefault();
                ReactDOM.findDOMNode(this.refs.newEnvButton).click();
              }}
            />
            <InputGroup.Button>
              <Button
                ref="newEnvButton"
                onClick={() =>
                  this.setState({
                    env: {
                      ...this.state.env,
                      [this.state.envNewKey]: ""
                    },
                    envNewKey: ""
                  })
                }
              >
                Add environment variable
              </Button>
            </InputGroup.Button>
          </InputGroup>
        </FormGroup>
        <ButtonToolbar>
          <Button bsStyle="primary" type="submit" disabled={!this.isValid()}>
            {this.props.creating ? "Create" : "Save changes"}
          </Button>
          {children}
        </ButtonToolbar>
      </Form>
    );
  }
}

export default ApplicationForm;
