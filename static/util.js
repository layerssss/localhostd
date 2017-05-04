var {
  Alert,
  Accordion,
  Button,
  Breadcrumb,
  ButtonGroup,
  ButtonToolbar,
  Col,
  ControlLabel,
  DropdownButton,
  Form,
  FormGroup,
  FormControl,
  HelpBlock,
  InputGroup,
  Grid,
  ListGroup,
  ListGroupItem,
  Modal,
  MenuItem,
  Nav,
  Navbar,
  NavItem,
  OverlayTrigger,
  Panel,
  PanelGroup,
  ProgressBar,
  Row,
  Tab,
  Tabs,
  Table,
  Tooltip
} = ReactBootstrap;

var {
  createElement
} = React;

var OpenBlob = (name, blob) => {
  var a = document.createElement('a');
  a.style = 'display: none;';
  a.target = '_blank';
  a.href = window.URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  _.defer(() => {
    window.URL.revokeObjectURL(a.href);
  });
};

var OpenUrl = (url) => {
  location.href = url;
};

var idCounter = 0;
var newId = () => {
  return idCounter++;
};

var SelectFile = (accept, callback) => {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.style = 'position: fixed;';
  document.body.appendChild(input);

  input.onchange = () => {
    var file = input.files[0];
    if (file) {
      callback(file);
    }
  };

  _.defer(() => {
    input.click();
    _.defer(() => {
      document.body.removeChild(input);
    });
  });
};

const PADDING = {
  RIGHT: 'padding-right',
  LEFT: 'padding-left',
  TOP: 'padding-top',
  BOTTOM: 'padding-bottom'
};

const MARGIN = {
  RIGHT: 'margin-right',
  LEFT: 'margin-left',
  TOP: 'margin-top',
  BOTTOM: 'margin-bottom'
};

const getStyle = (el, str) => parseInt(getComputedStyle(el).getPropertyValue(str), 10);

const getTextNodeBoundingClientRect = node => {
  const newNode = node.length ? node[node.length - 1] : node;
  if (typeof document.createRange === 'function') {
    const range = document.createRange();
    if (range.getBoundingClientRect) {
      range.selectNodeContents(newNode);
      return range.getBoundingClientRect();
    }
  }
  return 0;
};

class Util {}

Util.compareWithMarginOfError = (num1, num2) => Math.abs(num1 - num2) < 1.01;

Util.getDimension = node => {
  const margin = {};

  const padding = {
    right: getStyle(node, PADDING.RIGHT),
    left: getStyle(node, PADDING.LEFT),
    top: getStyle(node, PADDING.TOP),
    bottom: getStyle(node, PADDING.BOTTOM)
  };

  if (node.childElementCount) {
    const child = node.childNodes[0];
    margin.height = getStyle(child, MARGIN.BOTTOM) + getStyle(child, MARGIN.TOP);
    margin.width = getStyle(child, MARGIN.LEFT) + getStyle(child, MARGIN.RIGHT);

    return {
      width: (child.scrollWidth || child.offsetWidth) + margin.width + padding.left + padding.right,
      height: (child.scrollHeight || child.offsetHeight) + margin.height + padding.top + padding.bottom
    };
  }

  const range = getTextNodeBoundingClientRect(node.childNodes);

  return {
    width: range.width + padding.right + padding.left,
    height: range.height + padding.bottom + padding.top
  };
};
