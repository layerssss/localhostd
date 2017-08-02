class Bnb extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loaded: false,
      applications: [],
      activeApplicationIndex: -1,
      tab: 'terminal'
    };
  }

  doAction(name, parameters) {
    if (!this.state.loaded) return;

    this.socket.send(JSON.stringify({
      name: name,
      parameters: parameters
    }));
  }

  componentDidMount() {
    this.terminalHistory = {};
    var initSocket = () => {
      this.socket = new WebSocket(location.origin.replace(/^http/, 'ws'));

      this.socket.onmessage = (messageEvent) => {
        var {
          state,
          message,
          terminalOutput
        } = JSON.parse(messageEvent.data);

        if (state) {
          this.setState(state);
          this.setState({
            loaded: true,
            tries: 0
          });
        }

        if (message) {
          this.handleMessage(message);
        }

        if (terminalOutput) {
          var xTerm = this.refs[`xTerm_${terminalOutput.applicationName}`];
          if (xTerm) {
            xTerm.write(terminalOutput.dataString);
          }
          if (!this.terminalHistory[terminalOutput.applicationName]) {
            this.terminalHistory[terminalOutput.applicationName] = [];
          }
          this.terminalHistory[terminalOutput.applicationName].push(terminalOutput.dataString);
        }
      };

      this.socket.onerror = (errorEvent) => {
        this.handleMessage({
          type: 'danger',
          message: 'Connection error.'
        });

        this.setState({
          loaded: false
        });
      };

      this.socket.onclose = () => {
        this.setState({
          loaded: false,
        });

        setTimeout(initSocket, 1000);
      };
    };

    initSocket();
  }

  handleMessage(message) {
    $.notify({
      message: message.message
    }, {
      type: message.type
    });
  }

  componentWillUnmount() {
    this.socket.close();
  }

  render() {
    var activeApplication = this.state.applications[this.state.activeApplicationIndex];

    if (this.state.loaded) {
      document.title = 'Bnb';
    }

    return createElement(
      'div', {
        className: 'bnb'
      },
      (this.state.loaded &&
        createElement(
          'div', {},
          createElement(
            'div', {
              style: {
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: 0,
                width: 300,
                padding: 10,
                overflowY: 'auto'
              }
            },
            createElement(
              Nav, {
                bsStyle: 'pills',
                stacked: true
              },
              this.state.applications.map((application, applicationIndex) =>
                createElement(
                  NavItem, {
                    key: application.name,
                    active: activeApplication == application,
                    onClick: () => this.setState({
                      activeApplicationIndex: applicationIndex,
                      creatingApplication: false

                    })
                  },
                  createElement(
                    'span', {
                      className: `fa fa-fw ${application.locked ? 'fa-spin fa-spinner' : (application.running ? 'fa-cube' : '')}`
                    }
                  ),
                  application.name
                )
              ),
              createElement(
                NavItem, {
                  active: this.state.creatingApplication,
                  onClick: () => this.setState({
                    creatingApplication: true,
                    activeApplicationIndex: -1
                  })
                },
                createElement(
                  'span', {
                    className: 'fa fa-fw fa-plus'
                  }
                ),
                'New application'
              ),
              createElement(
                NavItem, {
                  active: !this.state.creatingApplication && !activeApplication,
                  onClick: () => this.setState({
                    creatingApplication: false,
                    activeApplicationIndex: -1
                  })
                },
                createElement(
                  'span', {
                    className: 'fa fa-fw fa-info-circle'
                  }
                ),
                'Tips'
              )
            )
          ),
          createElement(
            'div', {
              style: {
                position: 'absolute',
                left: 300,
                top: 0,
                right: 0,
                bottom: 0,
                padding: 10,
                overflowY: 'auto'
              }
            },
            (this.state.creatingApplication ?
              createElement(
                Panel, {
                  header: 'New application'
                },
                createElement(
                  ApplicationForm, {
                    application: {
                      dir: this.state.env['HOME'] || this.state.env['HOMEPATH'],
                      env: _.assign({}, this.state.env),
                      timeout: 600
                    },
                    creating: true,
                    onSubmit: application => {
                      this.doAction('CreateApplication', {
                        application
                      });

                      this.setState({
                        creatingApplication: false
                      });
                    }
                  },
                  createElement(
                    Button, {
                      onClick: ev => this.setState({
                        creatingApplication: false
                      })
                    }, 'Cancel'
                  )
                )
              ) :
              (activeApplication ?
                createElement(
                  'div', {
                    key: activeApplication.name,
                  },
                  createElement(
                    Panel, {
                      style: {
                        position: 'absolute',
                        right: -5,
                        bottom: -25,
                        zIndex: 10
                      }
                    },
                    createElement(
                      ButtonToolbar, {},
                      createElement(
                        Button, {
                          onClick: ()=> OpenUrl(`http://${activeApplication.name}.dev`)
                        },
                        createElement(
                          'span', {
                            className: 'fa fa-fw fa-globe'
                          }
                        )
                      ),
                      createElement(
                        Button, {
                          disabled: activeApplication.locked,
                          onClick: () => this.doAction(activeApplication.running ? 'StopApplication' : 'StartApplication', {
                            applicationName: activeApplication.name
                          })
                        },
                        createElement(
                          'span', {
                            className: `fa fa-fw fa-${activeApplication.locked ? 
                              'spinner fa-spin' : 
                                (activeApplication.running ? 'stop' : 'play')}`
                          }
                        )
                      ),
                      createElement(
                        Button, {
                          disabled: activeApplication.locked || !activeApplication.running,
                          onClick: () => this.doAction('RestartApplication', {
                            applicationName: activeApplication.name
                          })
                        },
                        createElement(
                          'span', {
                            className: 'fa fa-fw fa-repeat'
                          }
                        )
                      ),
                      createElement(
                        ButtonGroup, {},
                        createElement(
                          Button, {
                            active: this.state.tab == 'terminal',
                            onClick: () => this.setState({
                              tab: 'terminal'
                            })
                          },
                          createElement(
                            'span', {
                              className: 'fa fa-fw fa-terminal'
                            }
                          ),
                          'Terminal'
                        ),
                        createElement(
                          Button, {
                            active: this.state.tab == 'details',
                            onClick: () => this.setState({
                              tab: 'details'
                            })
                          },
                          createElement(
                            'span', {
                              className: 'fa fa-fw fa-info'
                            }
                          ),
                          'Details'
                        )
                      )
                    )
                  ),
                  createElement(
                    'div', {
                      style: {
                        position: 'absolute',
                        overflowY: 'auto',
                        left: 0,
                        top: 0,
                        right: 0,
                        bottom: 0,
                        padding: 10
                      }
                    },
                    (this.state.tab == 'details' &&
                      createElement(
                        Panel, {
                          header: 'Details'
                        },
                        createElement(
                          ApplicationForm, {
                            application: activeApplication,
                            onSubmit: application => {
                              this.doAction('CreateApplication', {
                                application
                              });
                            }
                          },
                          createElement(
                            Button, {
                              bsStyle: 'danger',
                              onClick: () => this.doAction('DeleteApplication', {
                                applicationName: activeApplication.name
                              })
                            },
                            'Delete'
                          )
                        )
                      )
                    ),
                    (this.state.tab == 'terminal' &&
                      createElement(
                        'div', {
                          style: {
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: '#000'
                          }
                        },
                        createElement(
                          'div', {
                            style: {
                              position: 'absolute',
                              top: 10,
                              left: 10,
                              right: 10,
                              bottom: 10
                            }
                          },
                          createElement(
                            XTerm, {
                              ref: `xTerm_${activeApplication.name}`,
                              title: activeApplication.command,
                              history: this.terminalHistory[activeApplication.name] || [],
                              onResize: (cols, rows) => this.doAction(
                                'ResizeTerminal', {
                                  applicationName: activeApplication.name,
                                  cols,
                                  rows
                                }
                              ),
                              onData: dataString => this.doAction(
                                'InputTerminal', {
                                  applicationName: activeApplication.name,
                                  dataString
                                }
                              )
                            }
                          )
                        )
                      )
                    )
                  )
                ) : 
                createElement(
                  Alert, {
                    bsStyle: 'success'
                  },
                  createElement(
                    'p', {},
                    'Tips:'
                  ),
                  createElement(
                    'p', {},
                    `You can use HTTP(S) proxy at http://${this.state.bind}:${this.state.port} to access bnb in your own browser.`
                  ),
                  createElement(
                    'p', {},
                    'You can also download the self-signed CA which is used for SSL of .dev domains.',
                    createElement(
                      'a', {
                        href: '#',
                        disabled: !this.state.caCertificate,
                        onClick: () => OpenBlob('bnb.ca.crt', new Blob([this.state.caCertificate]))
                      },
                      createElement(
                        'span', {
                          className: 'fa fa-fw fa-download'
                        }
                      ),
                      'SSL CA certificate'
                    )
                  )
                )
              )
            )
          )
        )
      )
    );
  }
}
