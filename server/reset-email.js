import axios from "axios";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getProvider() {
  return normalizeText(process.env.EMAIL_PROVIDER || "resend").toLowerCase();
}

function buildEmailContent({ appName, supportUrl, code, expiresAt }) {
  const expiryTime = new Date(expiresAt);
  const expiryLabel = Number.isFinite(expiryTime.getTime()) ? expiryTime.toUTCString() : "soon";
  const supportLine = supportUrl
    ? `If you did not request this reset, ignore this email and review your account at ${supportUrl}.`
    : "If you did not request this reset, ignore this email.";
  const subject = `${appName} password reset verification code`;
  const text = [
    `Your ${appName} password reset verification code is ${code}.`,
    `This code expires at ${expiryLabel}.`,
    "Enter this code in the reset password screen to finish updating your password.",
    supportLine,
  ].join("\n\n");
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
      <p>Your <strong>${appName}</strong> password reset verification code is:</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:20px 0">${code}</p>
      <p>This code expires at <strong>${expiryLabel}</strong>.</p>
      <p>Enter this code in the reset password screen to finish updating your password.</p>
      <p style="color:#4b5563">${supportLine}</p>
    </div>
  `;

  return { subject, text, html };
}

function getResetEmailConfig() {
  return {
    provider: getProvider(),
    from: normalizeText(process.env.RESET_EMAIL_FROM || process.env.RESEND_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL),
    replyTo: normalizeText(process.env.RESET_EMAIL_REPLY_TO),
    appName: normalizeText(process.env.RESET_EMAIL_APP_NAME) || "Luna",
    supportUrl: normalizeText(process.env.APP_URL || process.env.FRONTEND_URL || process.env.SITE_URL),
    resendApiKey: normalizeText(process.env.RESEND_API_KEY),
    sendgridApiKey: normalizeText(process.env.SENDGRID_API_KEY),
    postmarkApiKey: normalizeText(process.env.POSTMARK_API_KEY),
    mailgunApiKey: normalizeText(process.env.MAILGUN_API_KEY),
    mailgunDomain: normalizeText(process.env.MAILGUN_DOMAIN),
  };
}

function hasProviderCredentials(config) {
  if (!config.from) return false;

  if (config.provider === "resend") return Boolean(config.resendApiKey);
  if (config.provider === "sendgrid") return Boolean(config.sendgridApiKey);
  if (config.provider === "postmark") return Boolean(config.postmarkApiKey);
  if (config.provider === "mailgun") return Boolean(config.mailgunApiKey && config.mailgunDomain);
  return false;
}

async function sendWithResend(config, payload) {
  await axios.post(
    "https://api.resend.com/emails",
    {
      from: config.from,
      to: [payload.to],
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      ...(config.replyTo ? { reply_to: config.replyTo } : {}),
    },
    {
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    },
  );
}

async function sendWithSendGrid(config, payload) {
  await axios.post(
    "https://api.sendgrid.com/v3/mail/send",
    {
      personalizations: [{ to: [{ email: payload.to }] }],
      from: { email: config.from },
      subject: payload.subject,
      content: [
        { type: "text/plain", value: payload.text },
        { type: "text/html", value: payload.html },
      ],
      ...(config.replyTo ? { reply_to: { email: config.replyTo } } : {}),
    },
    {
      headers: {
        Authorization: `Bearer ${config.sendgridApiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    },
  );
}

async function sendWithPostmark(config, payload) {
  await axios.post(
    "https://api.postmarkapp.com/email",
    {
      From: config.from,
      To: payload.to,
      Subject: payload.subject,
      TextBody: payload.text,
      HtmlBody: payload.html,
      ...(config.replyTo ? { ReplyTo: config.replyTo } : {}),
    },
    {
      headers: {
        "X-Postmark-Server-Token": config.postmarkApiKey,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      timeout: 10000,
    },
  );
}

async function sendWithMailgun(config, payload) {
  const body = new URLSearchParams({
    from: config.from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
  if (config.replyTo) {
    body.append("h:Reply-To", config.replyTo);
  }

  await axios.post(
    `https://api.mailgun.net/v3/${config.mailgunDomain}/messages`,
    body,
    {
      auth: {
        username: "api",
        password: config.mailgunApiKey,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 10000,
    },
  );
}

export function isResetEmailConfigured() {
  return hasProviderCredentials(getResetEmailConfig());
}

export async function sendPasswordResetVerificationEmail({ to, code, expiresAt }) {
  const config = getResetEmailConfig();
  if (!hasProviderCredentials(config)) {
    throw new Error("Password reset email delivery is not configured.");
  }

  const payload = {
    to,
    ...buildEmailContent({
      appName: config.appName,
      supportUrl: config.supportUrl,
      code,
      expiresAt,
    }),
  };

  if (config.provider === "resend") {
    await sendWithResend(config, payload);
    return;
  }
  if (config.provider === "sendgrid") {
    await sendWithSendGrid(config, payload);
    return;
  }
  if (config.provider === "postmark") {
    await sendWithPostmark(config, payload);
    return;
  }
  if (config.provider === "mailgun") {
    await sendWithMailgun(config, payload);
    return;
  }

  throw new Error(`Unsupported EMAIL_PROVIDER: ${config.provider}`);
}
