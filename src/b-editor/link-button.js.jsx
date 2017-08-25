import StyleButton from './style-button';
import utils from './utils';

const { RichUtils } = Draft;
const stopPropagation = e => e.stopPropagation();

export default class LinkButton extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      modalOpen: false,
      text: null,
      url: null,
      entityKey: null
    };

    this.backdropEl = document.createElement('div');
    this.backdropEl.className = 'modal-backdrop in';

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.openModal = this.openModal.bind(this);
    this.closeModal = this.closeModal.bind(this);
    this.handleURLChange = this.handleURLChange.bind(this);
    this.handleTextChange = this.handleTextChange.bind(this);

    this.submit = this.submit.bind(this);
  }

  render() {
    const { editorState } = this.props;
    const entity = utils.getStartEntity(editorState);

    return (
      <span>
        <StyleButton
          style="LINK"
          onClick={this.openModal}
          active={entity && entity.type === 'LINK'}
        />
        {this.state.modalOpen && this.renderModal()}
        {this.state.modalOpen &&
          <div className="modal-backdrop in" onClick={this.closeModal} />
        }
      </span>
    );
  }

  renderModal() {
    const { url, text } = this.state;

    return (
      <div
        id="discourse-modal"
        className="BEditor-link-modal modal in"
        onClick={this.closeModal}
      >
        <div className="modal-outer-container">
          <div className="modal-middle-container">
            <div className="modal-inner-container" onClick={stopPropagation}>
              <div className="modal-header">
                <div className="modal-close">
                  <a className="close" onClick={this.closeModal}>
                    <i className="fa fa-times d-icon d-icon-times" />
                  </a>
                </div>
                <h3>Insert Hyperlink</h3>
              </div>
              <div className="modal-body">
                <div>
                  <input
                    type="text"
                    value={url}
                    onChange={this.handleURLChange}
                    placeholder="http://example.com"
                    className="ember-text-field"
                    onKeyDown={this.handleKeyDown}
                    ref="url"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={text}
                    onChange={this.handleTextChange}
                    placeholder="optional title"
                    className="ember-text-field"
                    onKeyDown={this.handleKeyDown}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  title="OK"
                  className="btn-primary btn btn-text"
                  onClick={this.submit}
                >
                  <span className="d-button-label">
                    OK
                  </span>
                </button>
                <button
                  title="Cancel"
                  className="btn-danger btn btn-text"
                  onClick={this.closeModal}
                >
                  <span className="d-button-label">Cancel</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  componentDidUpdate(prevProps, prevState) {
    if (!prevState.modalOpen && this.state.modalOpen) {
      this.addEventHandlers();
      setTimeout(() => {
        this.refs.url.focus();
        this.refs.url.select();
      }, 100);
    }

    if (prevState.modalOpen && !this.state.modalOpen) {
      this.removeEventHandlers();
    }
  }

  handleKeyDown(e) {
    if (e.key === 'Enter') {
      this.submit(e);
    }
  }

  addEventHandlers() {
    $('.BEditor-link-modal').on('keydown.b-editor', e => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        this.closeModal();
      }
    });
  }

  removeEventHandlers() {
    $('.BEditor-link-modal').off('keydown.b-editor');
  }

  openModal() {
    const { editorState } = this.props;
    const entity = utils.getStartEntity(editorState);

    this.setState({
      modalOpen: true,
      text: '',
      url: entity && entity.type === 'LINK' ? entity.data.url : '',
      entityKey: entity && entity.key
    });
  }

  closeModal() {
    this.setState({
      modalOpen: false,
      text: null,
      url: null,
      entityKey: null
    });
  }

  handleTextChange(e) {
    this.setState({ text: e.target.value });
  }

  handleURLChange(e) {
    this.setState({ url: e.target.value });
  }

  submit(e) {
    const { url, text, entityKey } = this.state;

    this.props.onRequestChange(e, { url, text, entityKey });
    this.closeModal();
  }
}
