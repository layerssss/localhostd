class ReactBootstrapToggle extends React.Component {

  constructor() {
    super();
    this.state = { width: null, height: null };
    this.onClick = this.onClick.bind(this);
  }

  componentDidMount() {
    if (this.props.width && this.props.height) {
      return;
    }
    this.setDimensions();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.width && this.props.height) {
      return;
    }
    this.setDimensions();
  }

  onClick() {
    if (this.props.disabled) return;
    if (typeof this.props.onClick === 'function') {
      this.props.onClick(!this.props.active);
    }
  }

  setDimensions() {
    const onDim = Util.getDimension(this.on);
    const offDim = Util.getDimension(this.off);

    const width = Math.max(onDim.width, offDim.width);
    const height = Math.max(onDim.height, offDim.height);

    // Check if the sizes are the same with a margin of error of one pixel
    const areAlmostTheSame = Util.compareWithMarginOfError(this.state.width, width) && Util.compareWithMarginOfError(this.state.height, height);

    // if they are the same then return
    if (areAlmostTheSame) {
      return;
    }

    this.setState({
      width,
      height
    });
  }

  getSizeClass() {
    if (this.props.size === 'lg') return 'btn-lg';
    if (this.props.size === 'sm') return 'btn-sm';
    if (this.props.size === 'xs') return 'btn-xs';
    return 'btn-md';
  }

  render() {
    const onstyle = `btn-${this.props.onstyle}`;
    const offstyle = `btn-${this.props.offstyle}`;
    const sizeClass = this.getSizeClass();
    const activeClass = `btn toggle ${sizeClass} ${onstyle}`;
    const inactiveClass = `btn toggle ${sizeClass} ${offstyle} off`;
    const onStyleClass = `btn toggle-on ${sizeClass} ${onstyle}`;
    const offStyleClass = `btn toggle-off ${sizeClass} ${offstyle}`;

    let style = {};
    let className = this.props.active ? activeClass : inactiveClass;
    if (this.props.width && this.props.height) {
      style = {
        width: this.props.width,
        height: this.props.height
      };
    } else {
      style = {
        width: this.state.width,
        height: this.state.height
      };
    }

    if (this.props.className) {
      className += ` ${this.props.className}`;
    }

    return (
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      React.createElement(
        'div',
        {
          role: 'button',
          id: this.props.id,
          disabled: this.props.disabled,
          className: className,
          onClick: this.onClick,
          style: style

        },
        React.createElement(
          'div',
          { className: 'toggle-group' },
          React.createElement(
            'span',
            {
              ref: onLabel => {
                this.on = onLabel;
              },
              className: onStyleClass
            },
            this.props.on
          ),
          React.createElement(
            'span',
            {
              ref: offLabel => {
                this.off = offLabel;
              },
              className: offStyleClass
            },
            this.props.off
          ),
          React.createElement('span', { className: `toggle-handle btn btn-${this.props.handlestyle} ${sizeClass}` })
        )
      )
    );
  }
}

ReactBootstrapToggle.propTypes = {
  // Holds the className for label one
  onstyle: React.PropTypes.string,
  // Holds the className for label two
  offstyle: React.PropTypes.string,
  // The className for the handle
  handlestyle: React.PropTypes.string,
  // Height prop
  height: React.PropTypes.string,
  // Width prop
  width: React.PropTypes.string,
  // The on and off elements defaults to 'On' and 'Off'
  on: React.PropTypes.node,
  off: React.PropTypes.node,
  // The initial state of the component
  active: React.PropTypes.bool,
  // Sets the button to disabled
  disabled: React.PropTypes.bool,
  // Set the size of the button defaults to normal
  size: React.PropTypes.string,
  // The onClick event, returns the state as the argument
  onClick: React.PropTypes.func,
  id: React.PropTypes.string,
  className: React.PropTypes.string
};
ReactBootstrapToggle.defaultProps = {
  onstyle: 'primary',
  offstyle: 'default',
  handlestyle: 'default',
  width: '',
  height: '',
  on: 'On',
  off: 'Off',
  disabled: false,
  size: 'normal',
  active: true
};
