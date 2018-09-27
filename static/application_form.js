class ApplicationForm extends React.Component {
  constructor(props) {
    super(props);
    this.id = `application_form_${newId()}`;
    this.state = {
      name: "",
      command: "",
      port: 2000 + Math.floor(Math.random() * 1000),
      out: "",
      timeout: "",
      dir: "",
      env: {},
      envSearch: "",
      envNewKey: ""
    };

    if (props.application) _.assign(this.state, props.application);
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
    return createElement(
      Form,
      {
        onSubmit: ev => {
          ev.preventDefault();
          this.props.onSubmit({
            name: this.state.name,
            command: this.state.command,
            port: this.state.port,
            out: this.state.out,
            timeout: this.state.timeout,
            dir: this.state.dir,
            env: this.state.env
          });
        }
      },
      createElement(
        FormGroup,
        {
          controlId: `${this.id}_name`,
          validationState: this.isNameValid() ? "success" : "error"
        },
        createElement(ControlLabel, {}, "Name:"),
        createElement(FormControl, {
          type: "text",
          required: true,
          readOnly: !this.props.creating,
          value: this.state.name,
          onChange: ev =>
            this.setState({
              name: ev.target.value
            })
        })
      ),
      createElement(
        FormGroup,
        {
          controlId: `${this.id}_command`,
          validationState: this.isCommandValid() ? "success" : "error"
        },
        createElement(ControlLabel, {}, "Command:"),
        createElement(FormControl, {
          type: "text",
          value: this.state.command,
          onChange: ev =>
            this.setState({
              command: ev.target.value
            })
        })
      ),
      createElement(
        FormGroup,
        {
          controlId: `${this.id}_dir`,
          validationState: "success"
        },
        createElement(ControlLabel, {}, "Working directory:"),
        createElement(FormControl, {
          type: "text",
          value: this.state.dir,
          onChange: ev =>
            this.setState({
              dir: ev.target.value
            })
        })
      ),
      createElement(
        FormGroup,
        {
          controlId: `${this.id}_out`,
          validationState: "success"
        },
        createElement(ControlLabel, {}, "Output path (optional):"),
        createElement(FormControl, {
          type: "text",
          value: this.state.out,
          onChange: ev =>
            this.setState({
              out: ev.target.value
            })
        })
      ),
      createElement(
        FormGroup,
        {
          controlId: `${this.id}_timeout`,
          validationState: "success"
        },
        createElement(
          ControlLabel,
          {},
          "Timeout (idle seconds before shutting the application down, optional):"
        ),
        createElement(FormControl, {
          type: "number",
          min: 0,
          step: 60,
          value: this.state.timeout,
          onChange: ev =>
            this.setState({
              timeout: Number(ev.target.value) || ""
            })
        })
      ),
      createElement(
        FormGroup,
        {
          controlId: `${this.id}_port`,
          validationState: this.isPortValid() ? "success" : "error"
        },
        createElement(ControlLabel, {}, "Port:"),
        createElement(FormControl, {
          type: "number",
          min: 1000,
          value: this.state.port,
          onChange: ev =>
            this.setState({
              port: Number(ev.target.value)
            })
        })
      ),
      createElement(
        Panel,
        {
          header: "Environment:",
          collapsible: true
        },
        createElement(
          FormGroup,
          {},
          createElement(FormControl, {
            type: "text",
            value: this.state.envSearch,
            placeholder: "type to search...",
            onChange: ev =>
              this.setState({
                envSearch: ev.target.value
              })
          })
        ),
        Object.keys(this.state.env)
          .filter(
            k =>
              -1 != k.toLowerCase().indexOf(this.state.envSearch.toLowerCase())
          )
          .sort()
          .map(envKey =>
            createElement(
              FormGroup,
              {
                id: envKey,
                controlId: `${this.id}_env_${envKey}`,
                validationState: "success"
              },
              createElement(ControlLabel, {}, `${envKey}:`),
              createElement(
                InputGroup,
                {},
                createElement(FormControl, {
                  type: "text",
                  value: this.state.env[envKey],
                  onChange: ev => {
                    this.state.env[envKey] = ev.target.value;
                    this.forceUpdate();
                  }
                }),
                createElement(
                  InputGroup.Button,
                  {},
                  createElement(
                    Button,
                    {
                      onClick: () => {
                        delete this.state.env[envKey];
                        this.forceUpdate();
                      }
                    },
                    "Delete"
                  )
                )
              )
            )
          ),
        createElement(
          FormGroup,
          {
            validationState: "success"
          },
          createElement(
            InputGroup,
            {},
            createElement(FormControl, {
              type: "text",
              placeholder: "new environment variable",
              value: this.state.envNewKey,
              onChange: ev =>
                this.setState({
                  envNewKey: ev.target.value
                }),
              onKeyPress: ev => {
                if (ev.charCode != 13) return;
                ev.preventDefault();
                ReactDOM.findDOMNode(this.refs.newEnvButton).click();
              }
            }),
            createElement(
              InputGroup.Button,
              {},
              createElement(
                Button,
                {
                  ref: "newEnvButton",
                  onClick: () => {
                    this.state.env[this.state.envNewKey] = "";
                    this.state.envNewKey = "";
                    this.forceUpdate();
                  }
                },
                "Add environment variable"
              )
            )
          )
        )
      ),
      createElement(
        ButtonToolbar,
        {},
        createElement(
          Button,
          {
            type: "submit",
            disabled: !this.isValid()
          },
          this.props.creating ? "Create" : "Save changes"
        ),
        this.props.children
      )
    );
  }
}
