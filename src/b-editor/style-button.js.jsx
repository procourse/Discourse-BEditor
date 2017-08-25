export default class StyleButton extends React.Component {

  constructor() {
    super();
    this.handleMouseDown = e => {
      e.preventDefault();
      this.props.onClick(this.props.style);
    };
  }

  render() {
    const iconName = this.iconName();

    return (
      <span className={this.className()} onMouseDown={this.handleMouseDown}>
        <i className={`fa fa-${iconName} d-icon d-icon-${iconName}`} />
      </span>
    );
  }

  className() {
    if (this.props.disabled) {
      return 'BEditor-styleButton BEditor-disabledButton';
    }

    if (this.props.active) {
      return 'BEditor-styleButton BEditor-activeButton';
    }

    return 'BEditor-styleButton';
  }

  iconName() {
    const { style } = this.props;

    switch (style) {
    case 'unordered-list-item':
      return 'list-ul';

    case 'ordered-list-item':
      return 'list-ol';

    default:
      return style.toLowerCase();

    }
  }
}
