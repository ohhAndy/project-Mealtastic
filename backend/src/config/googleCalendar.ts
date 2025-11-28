import { google } from 'googleapis';

// chat gpt: https://chatgpt.com/s/t_69293b0ca1488191b9df4d35c51b46f4
export function getGoogleCalendarClient(tokens: { access_token: string; refresh_token: string }) {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oAuth2Client.setCredentials(tokens);

  return google.calendar({ version: 'v3', auth: oAuth2Client });
}
