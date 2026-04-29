import express from "express";
import { 
  getUserAuthByEmail, 
  createLocalUser, 
  getUserById, 
  createSession, 
  updateUserPassword, 
  storePasswordResetToken, 
  resetUserPasswordWithToken, 
  revokeSessionToken 
} from "../db-adapter.js";
import { 
  ensureMembershipUser, 
  getMembershipByUserId 
} from "../pro-db.js";
import { 
  hashPassword, 
  verifyPassword, 
  createPasswordResetToken, 
  createPasswordResetEmailCode, 
  hashResetToken, 
  hashResetVerificationCode 
} from "../password-auth.js";
import { 
  isResetEmailConfigured, 
  sendPasswordResetVerificationEmail 
} from "../reset-email.js";
import { 
  verifyGoogleCredential 
} from "../services/google-auth.js";
import { 
  setAuthCookie, 
  clearAuthCookie 
} from "../utils/cookie-helper.js";
import { 
  readBearerToken, 
  readCookie 
} from "../utils/auth-helper.js";
import { 
  normalizeEmail, 
  extractProviderError, 
  buildAccountSecurity 
} from "../utils/common.js";
import { requireAuthenticatedUser } from "../middleware/auth-guard.js";
import { COOKIE_AUTH_TOKEN } from "../config.js";
import { upsertGoogleUser } from "../db-adapter.js";

const router = express.Router();

router.post("/local", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!password) {
      return res.status(400).json({ error: "Password is required." });
    }

    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    let user = await getUserAuthByEmail(email);

    if (!user) {
      const passwordHash = await hashPassword(password);
      user = await createLocalUser({
        email,
        name,
        passwordHash,
        passwordUpdatedAt: new Date().toISOString(),
      });
    } else if (!user.hasPassword) {
      return res.status(400).json({
        error: user.googleSub
          ? "This account currently uses Google sign-in. Sign in with Google, then set a Luna password from Profile."
          : "This account does not have a password yet.",
      });
    } else {
      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid email or password." });
      }
    }

    const safeUser = await getUserById(user.id);
    if (!safeUser) {
      return res.status(500).json({ error: "User lookup failed." });
    }

    await ensureMembershipUser({ userId: safeUser.id, email: safeUser.email, name: safeUser.name });
    const membership = await getMembershipByUserId(safeUser.id);
    const session = await createSession(safeUser.id);
    setAuthCookie(req, res, session.token, session.expiresAt);

    return res.json({
      token: session.token,
      expiresAt: session.expiresAt,
      user: safeUser,
      account: buildAccountSecurity(safeUser),
      membership: {
        plan: membership?.plan === "pro" ? "pro" : "free",
        activatedAt: membership?.activatedAt || "",
      },
    });
  } catch (error) {
    const normalized = extractProviderError(error);
    return res.status(error.status || normalized.status || 500).json({
      error: error.message || normalized.providerMessage,
    });
  }
});

router.post("/google", async (req, res) => {
  try {
    const credential = typeof req.body?.credential === "string" ? req.body.credential : "";
    const profile = await verifyGoogleCredential(credential);

    const user = await upsertGoogleUser(profile);
    await ensureMembershipUser({ userId: user.id, email: user.email, name: user.name });
    const membership = await getMembershipByUserId(user.id);
    const session = await createSession(user.id);
    setAuthCookie(req, res, session.token, session.expiresAt);

    return res.json({
      token: session.token,
      expiresAt: session.expiresAt,
      user,
      account: buildAccountSecurity(user),
      membership: {
        plan: membership?.plan === "pro" ? "pro" : "free",
        activatedAt: membership?.activatedAt || "",
      },
    });
  } catch (error) {
    const normalized = extractProviderError(error);
    return res.status(error.status || normalized.status || 500).json({
      error: error.message || normalized.providerMessage || "Google sign-in failed",
    });
  }
});

router.get("/me", async (req, res) => {
  try {
    const auth = await requireAuthenticatedUser(req, res);
    if (!auth) return;
    setAuthCookie(req, res, auth.token, auth.session?.expiresAt);

    await ensureMembershipUser({ userId: auth.user.id, email: auth.user.email, name: auth.user.name });
    const membership = await getMembershipByUserId(auth.user.id);

    return res.json({
      user: auth.user,
      account: buildAccountSecurity(auth.user),
      membership: {
        plan: membership?.plan === "pro" ? "pro" : "free",
        activatedAt: membership?.activatedAt || "",
      },
      session: {
        expiresAt: auth.session?.expiresAt,
        lastSeenAt: auth.session?.lastSeenAt,
      },
    });
  } catch (error) {
    const normalized = extractProviderError(error);
    return res.status(500).json({ error: normalized.providerMessage });
  }
});

router.post("/password/set", async (req, res) => {
  try {
    const auth = await requireAuthenticatedUser(req, res);
    if (!auth) return;

    const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
    const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
    const confirmPassword = typeof req.body?.confirmPassword === "string" ? req.body.confirmPassword : "";

    if (!newPassword) {
      return res.status(400).json({ error: "New password is required." });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match." });
    }

    const userWithAuth = await getUserAuthByEmail(auth.user.email);
    if (!userWithAuth) {
      return res.status(404).json({ error: "User not found." });
    }

    if (userWithAuth.hasPassword) {
      const currentValid = await verifyPassword(currentPassword, userWithAuth.passwordHash);
      if (!currentValid) {
        return res.status(401).json({ error: "Current password is incorrect." });
      }
    }

    const passwordHash = await hashPassword(newPassword);
    const updatedUser = await updateUserPassword({
      userId: userWithAuth.id,
      passwordHash,
      passwordUpdatedAt: new Date().toISOString(),
      resetTokenHash: "",
      resetTokenExpiresAt: "",
      resetCodeHash: "",
      resetCodeExpiresAt: "",
    });

    return res.json({
      ok: true,
      user: updatedUser,
      account: buildAccountSecurity(updatedUser),
      message: userWithAuth.hasPassword ? "Password updated successfully." : "Password set successfully.",
    });
  } catch (error) {
    const normalized = extractProviderError(error);
    return res.status(error.status || normalized.status || 400).json({
      error: error.message || normalized.providerMessage,
    });
  }
});

router.post("/password/reset/request", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const emailConfigured = isResetEmailConfigured();
    const reset = createPasswordResetToken();
    const verification = createPasswordResetEmailCode();
    const user = await storePasswordResetToken({
      email,
      resetTokenHash: reset.tokenHash,
      resetTokenExpiresAt: reset.expiresAt,
      resetCodeHash: verification.codeHash,
      resetCodeExpiresAt: verification.expiresAt,
    });

    if (user && emailConfigured) {
      await sendPasswordResetVerificationEmail({
        to: email,
        code: verification.code,
        expiresAt: verification.expiresAt,
      });
    }

    return res.json({
      ok: true,
      message: emailConfigured
        ? "If that account exists, Luna sent a password reset verification code to the email address on file."
        : "If that account exists, Luna generated a password reset code and showed it in the reset screen.",
      resetToken: user ? reset.token : "",
      resetTokenPreview: user ? reset.token : "",
      resetTokenExpiresAt: user ? reset.expiresAt : "",
      resetCodePreview: user ? verification.code : "",
      resetCodeExpiresAt: user ? verification.expiresAt : "",
    });
  } catch (error) {
    const normalized = extractProviderError(error);
    return res.status(error.status || normalized.status || 400).json({
      error: error.message || normalized.providerMessage,
    });
  }
});

router.post("/password/reset/confirm", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    const verificationCode = typeof req.body?.verificationCode === "string" ? req.body.verificationCode.trim() : "";
    const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
    const confirmPassword = typeof req.body?.confirmPassword === "string" ? req.body.confirmPassword : "";

    if (!email) return res.status(400).json({ error: "Email is required." });
    if (!token) return res.status(400).json({ error: "Reset token is required." });
    if (!verificationCode) return res.status(400).json({ error: "Verification code is required." });
    if (!newPassword) return res.status(400).json({ error: "New password is required." });
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match." });
    }

    const passwordHash = await hashPassword(newPassword);
    const updatedUser = await resetUserPasswordWithToken({
      email,
      resetTokenHash: hashResetToken(token),
      resetCodeHash: hashResetVerificationCode(verificationCode),
      passwordHash,
      passwordUpdatedAt: new Date().toISOString(),
    });

    await ensureMembershipUser({ userId: updatedUser.id, email: updatedUser.email, name: updatedUser.name });
    const membership = await getMembershipByUserId(updatedUser.id);
    const session = await createSession(updatedUser.id);
    setAuthCookie(req, res, session.token, session.expiresAt);

    return res.json({
      ok: true,
      token: session.token,
      expiresAt: session.expiresAt,
      user: updatedUser,
      account: buildAccountSecurity(updatedUser),
      membership: {
        plan: membership?.plan === "pro" ? "pro" : "free",
        activatedAt: membership?.activatedAt || "",
      },
      message: "Password reset successfully.",
    });
  } catch (error) {
    const normalized = extractProviderError(error);
    return res.status(error.status || normalized.status || 400).json({
      error: error.message || normalized.providerMessage,
    });
  }
});

router.post("/logout", async (req, res) => {
  try {
    const tokenFromBody = typeof req.body?.token === "string" ? req.body.token : "";
    const token = readBearerToken(req) || readCookie(req, COOKIE_AUTH_TOKEN) || tokenFromBody;
    clearAuthCookie(req, res);
    if (!token) return res.json({ ok: true });

    await revokeSessionToken(token);
    return res.json({ ok: true });
  } catch (error) {
    const normalized = extractProviderError(error);
    return res.status(500).json({ error: normalized.providerMessage });
  }
});

export default router;
