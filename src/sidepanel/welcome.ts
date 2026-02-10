const feedbackArea = document.getElementById('feedback-area');
const updateFeedback = (text: string, state: 'neutral' | 'success' | 'error' = 'neutral') => {
  if (!feedbackArea) return;
  feedbackArea.textContent = text;
  // Reset classes to ensure animation restarts if needed or style changes apply
  feedbackArea.className = '';
  void feedbackArea.offsetWidth; // Trigger reflow
  feedbackArea.className = 'feedback ' + state;
};

const USER_ID_KEY = 'firebase_current_user_id';
const googleButton = document.getElementById('google-signin') as HTMLButtonElement | null;
const guestButton = document.getElementById('local-signin');
const logoutButton = document.getElementById('logout-btn');

let isSigningIn = false;

const setAuthControls = (loggedIn: boolean) => {
  // If logged in, hide guest options immediately
  if (guestButton) guestButton.classList.toggle('hidden', loggedIn);
  if (logoutButton) logoutButton.classList.toggle('hidden', !loggedIn);
  if (googleButton) googleButton.classList.toggle('hidden', loggedIn);

  if (loggedIn) {
    updateFeedback('Welcome back! Opening side panel...', 'success');
  }
};

const refreshAuthState = () => {
  if (!chrome?.storage?.local) return;

  chrome.storage.local.get([USER_ID_KEY], (result) => {
    const loggedIn = Boolean(result[USER_ID_KEY]);
    setAuthControls(loggedIn);

    if (loggedIn) {
      // Short delay for user to see the success message before redirect
      setTimeout(() => {
        window.location.href = './index.html';
      }, 1000);
    }
  });
};

const openSidePanel = () => {
  updateFeedback('Entering Guest Mode...', 'neutral');
  setTimeout(() => {
    window.location.href = './index.html';
  }, 500);
};

const openSignIn = (callback?: (success: boolean) => void) => {
  if (chrome?.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ action: 'OPEN_SIGNIN' }, (response) => {
      if (chrome.runtime.lastError) {
        callback?.(false);
        return;
      }
      callback?.(Boolean(response?.success));
    });
  } else {
    callback?.(false);
  }
};

const setGoogleState = (loading: boolean, message?: string) => {
  if (!googleButton) return;

  googleButton.disabled = loading;
  googleButton.classList.toggle('loading', loading);

  if (message) updateFeedback(message, loading ? 'neutral' : 'error');

  const textSpan = googleButton.querySelector('.btn-text');
  const icon = googleButton.querySelector('img');

  if (textSpan) {
    textSpan.textContent = loading ? 'Signing you in...' : 'Continue with Google';
  }

  // Optional: dim the icon while loading
  if (icon) {
    icon.style.opacity = loading ? '0.6' : '1';
  }
};

googleButton?.addEventListener('click', () => {
  if (isSigningIn) return;
  isSigningIn = true;
  setGoogleState(true, 'Contacting Google...');

  try {
    openSignIn((success) => {
      isSigningIn = false;
      if (success) {
        setGoogleState(false);
        updateFeedback('Sign in successful!', 'success');
        refreshAuthState();
      } else {
        setGoogleState(false, 'Sign-in cancelled');
      }
    });
  } catch (error) {
    isSigningIn = false;
    setGoogleState(false, 'Error triggering sign-in');
  }
});

guestButton?.addEventListener('click', () => {
  // Prevent double clicks
  if (guestButton.getAttribute('disabled') === 'true') return;
  guestButton.setAttribute('disabled', 'true');
  openSidePanel();
});

logoutButton?.addEventListener('click', () => {
  if (!chrome?.runtime?.sendMessage) return;

  updateFeedback('Logging out...', 'neutral');

  chrome.runtime.sendMessage({ action: 'SIGN_OUT' }, (response) => {
    if (response?.success) {
      updateFeedback('Signed out', 'neutral');
      refreshAuthState();
      // Re-enable guest button explicitly
      if (guestButton) guestButton.removeAttribute('disabled');
    } else {
      updateFeedback('Logout failed', 'error');
    }
  });
});

// Initial check
refreshAuthState();
