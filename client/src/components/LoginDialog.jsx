import LoginForm from "./LoginForm.jsx";

// Lightweight modal wrapper around the shared login form.
function LoginDialog({ onClose, onSuccess, open }) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="dialog-backdrop d-flex align-items-center justify-content-center p-3"
      role="presentation"
    >
      <section
        aria-labelledby="login-dialog-title"
        className="nes-container is-rounded login-dialog"
        role="dialog"
      >
        <div className="d-flex align-items-center justify-content-between gap-3 mb-4">
          <h2 className="m-0" id="login-dialog-title">
            Login
          </h2>
          <button
            aria-label="Close login dialog"
            className="nes-btn is-error nes-pointer"
            onClick={onClose}
            type="button"
          >
            X
          </button>
        </div>
        <LoginForm
          idPrefix="login-dialog"
          onSuccess={() => {
            onClose();
            onSuccess?.();
          }}
        />
      </section>
    </div>
  );
}

export default LoginDialog;
