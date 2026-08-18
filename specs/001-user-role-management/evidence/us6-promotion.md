# US6 Promotion Evidence

**Status**: Local PostgreSQL and rendered-browser checks passed.

Integration coverage passed active-Member promotion, preservation of an existing session, current-role authority on its next lookup, ineligible target rejection, and one-winner suspend-versus-promote concurrency. Component coverage passed eligibility and confirmation focus.

In the local browser, an Admin opened an active Member, focused the promotion confirmation, committed the action in two activations, and immediately saw the account rendered as Admin with Member-management controls removed.

This is local single-server evidence, not a production concurrency exercise.
