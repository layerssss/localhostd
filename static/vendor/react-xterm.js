class XTerm extends React.Component {
  constructor(props) {
    super(props);

    this.fit = () => {
      this._xterm.fit();
    }
  }

  write(dataString) {
    this._xterm.write(dataString);
  }

  componentDidMount() {
    this._xterm = new Terminal({
      cursorBlink: true
    });

    this._xterm.open(this.refs.container);
    this._xterm.on('data', (data) => {
      if (this.props.onData) this.props.onData(data);
    });

    this._xterm.on('resize', (size) => {
      if (this.props.onResize) _.defer(() => {
        this.props.onResize(size.cols, size.rows);
      });
    });

    $(window).on('resize', this.fit);
    this._xterm.write(this.props.history.join(''));

    this.fit();
  }

  componentWillUnmount() {
    $(window).off('resize', this.fit);
  }

  render() {
    return createElement(
      'div', {
        ref: 'container',
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }
      }
    );
  }
}
