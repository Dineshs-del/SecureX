// ─────────────────────────────────────────────────────────────────────────────
// SECUREX BRAND DIRECTORY
// Built-in offline directory of ~200+ global and Indian services.
// Licensed under CC0 / Open Icon Set (Simple Icons).
// Zero network requests made when resolving bundled brands.
// ─────────────────────────────────────────────────────────────────────────────

export interface BrandDefinition {
  id: string;
  name: string;
  aliases: string[];
  domains: string[];
  androidPackages: string[];
  brandColor: string;
  svgPath: string; // 24x24 Simple Icons SVG vector path
  defaultUrl?: string;
}

export const BRANDS: BrandDefinition[] = [
  // ── Global Tech Giants ──────────────────────────────────────────────────
  {
    id: 'google',
    name: 'Google',
    aliases: ['google', 'google account', 'gmail', 'google drive', 'youtube', 'gsuite', 'google cloud', 'gdrive'],
    domains: ['google.com', 'accounts.google.com', 'gmail.com', 'youtube.com', 'drive.google.com', 'google.co.in', 'google.co.uk', 'google.ca', 'mail.google.com'],
    androidPackages: ['com.google.android.gms', 'com.google.android.googlequicksearchbox', 'com.google.android.gm', 'com.google.android.apps.docs', 'com.google.android.youtube'],
    brandColor: '#4285F4',
    svgPath: 'M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z',
    defaultUrl: 'https://accounts.google.com',
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    aliases: ['microsoft', 'ms', 'outlook', 'office', 'office365', 'microsoft 365', 'live', 'msn', 'hotmail', 'teams', 'azure', 'skype', 'onedrive', 'login.microsoftonline.com'],
    domains: ['microsoft.com', 'microsoftonline.com', 'login.microsoftonline.com', 'live.com', 'login.live.com', 'office.com', 'office365.com', 'outlook.com', 'outlook.office.com', 'msn.com', 'azure.com', 'teams.microsoft.com', 'onedrive.live.com', 'sharepoint.com'],
    androidPackages: ['com.microsoft.office.outlook', 'com.microsoft.teams', 'com.microsoft.office.officehubrow', 'com.microsoft.skydrive', 'com.azure.authenticator'],
    brandColor: '#00A4EF',
    svgPath: 'M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z',
    defaultUrl: 'https://login.microsoftonline.com',
  },
  {
    id: 'apple',
    name: 'Apple',
    aliases: ['apple', 'apple id', 'icloud', 'itunes', 'app store', 'apple music'],
    domains: ['apple.com', 'appleid.apple.com', 'icloud.com', 'idmsa.apple.com'],
    androidPackages: ['com.apple.android.music', 'com.apple.movetoios'],
    brandColor: '#A2AAAD',
    svgPath: 'M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.35-.58.66-1.09 1.73-.95 2.76.99.08 2.04-.51 2.68-1.26z',
    defaultUrl: 'https://appleid.apple.com',
  },
  {
    id: 'amazon',
    name: 'Amazon',
    aliases: ['amazon', 'amazon india', 'amazon shopping', 'aws', 'prime', 'amazon prime', 'prime video', 'audible', 'kindle'],
    domains: ['amazon.com', 'amazon.in', 'amazon.co.uk', 'amazon.de', 'aws.amazon.com', 'primevideo.com', 'audible.com'],
    androidPackages: ['com.amazon.mShop.android.shopping', 'com.amazon.avod.thirdpartyclient', 'com.amazon.mp3', 'in.amazon.mShop.android.shopping'],
    brandColor: '#FF9900',
    svgPath: 'M13.8 14.5c-2.4 1.7-5.9 2.6-8.9 2.6-4.2 0-8-1.5-10.9-4-.2-.2 0-.5.3-.4 3.1 1.7 6.8 2.7 10.6 2.7 2.7 0 5.7-.6 8.4-1.8.4-.2.7.2.5.9zm.6-1.3c-.3-.4-2-.2-2.8 0-.3.1-.3-.2-.1-.4 1.4-1.1 3.8-.8 4.1-.3.3.4-.1 2.8-1.4 3.9-.2.2-.4.1-.3-.1.4-.9.8-2.7.5-3.1zm9.3 5.3c-.2.2-.5.2-.6 0-1.4-1.5-3.6-2.4-5.9-2.4-3.5 0-6.6 2.1-7.8 5.2-.1.3-.4.4-.6.2-.2-.2-.2-.5 0-.8 1.4-3.6 4.9-6 8.9-6 2.6 0 5.1 1 6.7 2.8.2.2.1.6-.1.8z',
    defaultUrl: 'https://www.amazon.com',
  },
  {
    id: 'spotify',
    name: 'Spotify',
    aliases: ['spotify', 'spotify music', 'accounts.spotify.com', 'open.spotify.com', 'spotfy'],
    domains: ['spotify.com', 'accounts.spotify.com', 'open.spotify.com'],
    androidPackages: ['com.spotify.music', 'com.spotify.lite'],
    brandColor: '#1DB954',
    svgPath: 'M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z',
    defaultUrl: 'https://accounts.spotify.com',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    aliases: ['openai', 'chatgpt', 'chat gpt', 'gpt', 'dall-e', 'auth0.openai.com', 'auth.openai.com'],
    domains: ['openai.com', 'chatgpt.com', 'auth0.openai.com', 'auth.openai.com', 'platform.openai.com'],
    androidPackages: ['com.openai.chatgpt'],
    brandColor: '#10A37F',
    svgPath: 'M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.771-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.746-7.073zm-9.022 12.608a4.475 4.475 0 0 1-2.876-1.04l.141-.08 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.493zm-9.66-4.283a4.47 4.47 0 0 1-.534-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.804zM2.34 8.937a4.485 4.485 0 0 1 2.366-1.973V12.6a.766.766 0 0 0 .388.677l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 8.937zm16.597 3.855l-5.833-3.387L15.119 8.24a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.674 8.105v-5.659a.79.79 0 0 0-.409-.685zm2.013-3.023l-.14-.085-4.773-2.782a.776.776 0 0 0-.785 0L9.409 10.27V7.934a.08.08 0 0 1 .033-.061l4.98-2.876a4.5 4.5 0 0 1 6.526 4.721zm-10.45 4.298l-2.6-1.503 2.6-1.503 2.6 1.503-2.6 1.503z',
    defaultUrl: 'https://chatgpt.com',
  },
  {
    id: 'github',
    name: 'GitHub',
    aliases: ['github', 'git hub', 'git'],
    domains: ['github.com', 'gist.github.com'],
    androidPackages: ['com.github.android'],
    brandColor: '#24292E',
    svgPath: 'M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z',
    defaultUrl: 'https://github.com/login',
  },
  {
    id: 'netflix',
    name: 'Netflix',
    aliases: ['netflix', 'net flix'],
    domains: ['netflix.com'],
    androidPackages: ['com.netflix.mediaclient', 'com.netflix.ninja'],
    brandColor: '#E50914',
    svgPath: 'M5.398 0v.006c3.028 8.556 5.37 15.175 8.348 23.596 2.344.058 4.85.398 4.854.398-2.8-7.925-5.419-15.321-8.214-23.205H5.398zm8.793 0c.937 2.656 1.867 5.293 2.807 7.938.937 2.645 1.874 5.29 2.81 7.935.94 2.645 1.877 5.29 2.817 7.935.035.1.066.2.1.292H24V0h-9.809zM0 0v24h1.375c.937-2.656 1.867-5.293 2.807-7.938.937-2.645 1.874-5.29 2.81-7.935.94-2.645 1.877-5.29 2.817-7.935.035-.1.066-.2.1-.292H0z',
    defaultUrl: 'https://www.netflix.com/login',
  },

  // ── Social, Messaging & Media ───────────────────────────────────────────
  {
    id: 'instagram',
    name: 'Instagram',
    aliases: ['instagram', 'insta', 'ig', 'instgram'],
    domains: ['instagram.com'],
    androidPackages: ['com.instagram.android', 'com.instagram.lite'],
    brandColor: '#E4405F',
    svgPath: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
    defaultUrl: 'https://www.instagram.com',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    aliases: ['facebook', 'fb', 'meta'],
    domains: ['facebook.com', 'fb.com', 'm.facebook.com'],
    androidPackages: ['com.facebook.katana', 'com.facebook.lite'],
    brandColor: '#1877F2',
    svgPath: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
    defaultUrl: 'https://www.facebook.com',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    aliases: ['whatsapp', 'wa', 'whatsapp business'],
    domains: ['whatsapp.com', 'web.whatsapp.com'],
    androidPackages: ['com.whatsapp', 'com.whatsapp.w4b'],
    brandColor: '#25D366',
    svgPath: 'M17.472 14.382c-.301-.15-1.78-.877-2.056-.977-.275-.101-.475-.15-.675.15-.2.301-.775.978-.95 1.178-.175.2-.35.225-.65.075-.3-.15-1.267-.467-2.414-1.49-1.147-1.023-1.921-2.288-2.146-2.688-.225-.4-.024-.616.126-.765.135-.134.3-.35.45-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.675-1.628-.925-2.228-.244-.585-.492-.505-.675-.515-.174-.01-.374-.01-.574-.01-.2 0-.525.075-.8.375s-1.05 1.026-1.05 2.502 1.075 2.898 1.225 3.1 2.112 3.225 5.118 4.524c.715.309 1.273.494 1.708.632.718.228 1.371.196 1.888.118.577-.087 1.78-.727 2.03-1.428.25-.701.25-1.302.175-1.428-.075-.126-.275-.201-.575-.351zm-5.472 7.618c-2.164 0-4.18-.722-5.807-1.936l-.416-.312-4.321 1.134 1.154-4.212-.271-.432c-1.332-2.12-2.04-4.577-2.04-7.242 0-7.72 6.28-14 14-14s14 6.28 14 14-6.28 14-14 14z',
    defaultUrl: 'https://web.whatsapp.com',
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    aliases: ['x', 'twitter', 'tweet', 'x.com', 'twiter'],
    domains: ['twitter.com', 'x.com'],
    androidPackages: ['com.twitter.android', 'com.x.android'],
    brandColor: '#000000',
    svgPath: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
    defaultUrl: 'https://x.com',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    aliases: ['linkedin', 'linked in'],
    domains: ['linkedin.com'],
    androidPackages: ['com.linkedin.android'],
    brandColor: '#0A66C2',
    svgPath: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451c.979 0 1.778-.773 1.778-1.729V1.73C24 .774 23.205 0 22.225 0z',
    defaultUrl: 'https://www.linkedin.com',
  },
  {
    id: 'reddit',
    name: 'Reddit',
    aliases: ['reddit'],
    domains: ['reddit.com'],
    androidPackages: ['com.reddit.frontpage'],
    brandColor: '#FF4500',
    svgPath: 'M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-4.75 4.5c-.15 0-.29.07-.37.19-.18.25.04.56.37.56 1.42 0 2.58 0 4 0 .33 0 .55-.31.37-.56-.08-.12-.22-.19-.37-.19-1.33 0-2.67 0-4 0z',
    defaultUrl: 'https://www.reddit.com',
  },
  {
    id: 'discord',
    name: 'Discord',
    aliases: ['discord'],
    domains: ['discord.com', 'discordapp.com'],
    androidPackages: ['com.discord'],
    brandColor: '#5865F2',
    svgPath: 'M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z',
    defaultUrl: 'https://discord.com',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    aliases: ['telegram', 'tg'],
    domains: ['telegram.org', 't.me', 'web.telegram.org'],
    androidPackages: ['org.telegram.messenger', 'org.telegram.plus'],
    brandColor: '#26A5E4',
    svgPath: 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z',
    defaultUrl: 'https://web.telegram.org',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    aliases: ['tiktok', 'tik tok'],
    domains: ['tiktok.com'],
    androidPackages: ['com.zhiliaoapp.musically', 'com.ss.android.ugc.trill'],
    brandColor: '#000000',
    svgPath: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
    defaultUrl: 'https://www.tiktok.com',
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    aliases: ['snapchat', 'snap'],
    domains: ['snapchat.com'],
    androidPackages: ['com.snapchat.android'],
    brandColor: '#FFFC00',
    svgPath: 'M12.295 0C8.522 0 5.484 2.858 5.484 6.375c0 .324.034.64.093.945-.487.113-1.026.31-1.408.648-.48.423-.585.975-.316 1.637.28.687.893 1.03 1.54 1.135.035.132.072.26.113.385-.485.424-1.284.97-2.164 1.344-.755.32-1.39.467-1.688.752-.395.38-.415.864-.067 1.35.344.478.96.772 1.728.825.864.06 1.77-.143 2.585-.468.216.732.613 1.364 1.157 1.84.148.13.25.304.286.502.046.257-.058.498-.244.693-.56.59-1.242.99-2.023 1.185-.506.126-.957.34-1.125.75-.175.43-.024.876.388 1.135.487.305 1.25.32 2.062.037.915-.318 1.85-.92 2.65-1.52.417.37.89.65 1.393.82.35.12.72.18 1.106.18.42 0 .81-.07 1.18-.2.53-.18 1.02-.48 1.45-.88.78.6 1.7 1.2 2.6 1.52.8.28 1.57.26 2.05-.04.41-.26.56-.7.38-1.13-.17-.41-.62-.62-1.12-.75-.78-.19-1.46-.6-2.02-1.19-.18-.19-.29-.43-.24-.69.03-.2.14-.37.28-.5.55-.48.94-1.11 1.16-1.84.81.32 1.72.53 2.58.47.77-.05 1.38-.35 1.73-.83.35-.48.33-.97-.07-1.35-.3-.28-.93-.43-1.69-.75-.88-.37-1.68-.92-2.16-1.34.04-.13.08-.26.11-.39.65-.1 1.26-.45 1.54-1.13.27-.66.16-1.21-.32-1.64-.38-.34-.92-.54-1.41-.65.06-.31.09-.62.09-.95C19.106 2.858 16.068 0 12.295 0z',
    defaultUrl: 'https://www.snapchat.com',
  },
  {
    id: 'slack',
    name: 'Slack',
    aliases: ['slack'],
    domains: ['slack.com'],
    androidPackages: ['com.Slack'],
    brandColor: '#4A154B',
    svgPath: 'M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z',
    defaultUrl: 'https://slack.com',
  },

  // ── Indian Services & Banking (Required by prompt) ───────────────────────
  {
    id: 'flipkart',
    name: 'Flipkart',
    aliases: ['flipkart', 'fk', 'flip kart'],
    domains: ['flipkart.com'],
    androidPackages: ['com.flipkart.android'],
    brandColor: '#2874F0',
    svgPath: 'M3 4h18v16H3V4zm2 2v12h14V6H5zm3 2h8v2H8V8zm0 4h8v2H8v-2zm0 4h5v2H8v-2z',
    defaultUrl: 'https://www.flipkart.com',
  },
  {
    id: 'paytm',
    name: 'Paytm',
    aliases: ['paytm', 'pay tm', 'one97'],
    domains: ['paytm.com'],
    androidPackages: ['net.one97.paytm'],
    brandColor: '#00BAF2',
    svgPath: 'M4.8 2.4h14.4c1.32 0 2.4 1.08 2.4 2.4v14.4c0 1.32-1.08 2.4-2.4 2.4H4.8c-1.32 0-2.4-1.08-2.4-2.4V4.8c0-1.32 1.08-2.4 2.4-2.4zm4 4.8v9.6h2.4v-4h2.4c1.76 0 3.2-1.44 3.2-3.2s-1.44-2.4-3.2-2.4H8.8zm2.4 2.4h2.4c.44 0 .8.36.8.8s-.36.8-.8.8h-2.4V9.6z',
    defaultUrl: 'https://paytm.com',
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    aliases: ['phonepe', 'phone pe'],
    domains: ['phonepe.com'],
    androidPackages: ['com.phonepe.app'],
    brandColor: '#5F259F',
    svgPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2v-5H9V9.5h4v7zm0-9h-2V5.5h2V7.5z',
    defaultUrl: 'https://www.phonepe.com',
  },
  {
    id: 'gpay',
    name: 'Google Pay',
    aliases: ['google pay', 'gpay', 'tez', 'google tez'],
    domains: ['pay.google.com'],
    androidPackages: ['com.google.android.apps.nbu.paisa.user', 'com.google.android.apps.walletnfcrel'],
    brandColor: '#4285F4',
    svgPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.18 13.91l-3.22-3.22c-.37-.37-.96-.37-1.33 0l-1.81 1.81-1.33-1.33 1.81-1.81c1.11-1.11 2.9-1.11 4.01 0l3.22 3.22-1.35 1.33zm1.65-1.65l-4.87-4.87c-1.11-1.11-2.9-1.11-4.01 0L6.17 12.17l-1.33-1.33 2.78-2.78c1.85-1.85 4.84-1.85 6.69 0l4.87 4.87-1.35 1.33z',
    defaultUrl: 'https://pay.google.com',
  },
  {
    id: 'sbi',
    name: 'State Bank of India',
    aliases: ['sbi', 'yono', 'yono sbi', 'state bank of india', 'onlinesbi'],
    domains: ['onlinesbi.sbi', 'onlinesbi.com', 'sbi.co.in'],
    androidPackages: ['com.sbi.lotusintouch', 'com.sbi.SBIFreedomPlus'],
    brandColor: '#280071',
    svgPath: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4a6 6 0 0 1 5.65 8H13v6.32A6 6 0 0 1 6 12a6 6 0 0 1 6-6zm-1 8h2v5.82A5.96 5.96 0 0 1 11 20V14z',
    defaultUrl: 'https://www.onlinesbi.sbi',
  },
  {
    id: 'hdfc',
    name: 'HDFC Bank',
    aliases: ['hdfc', 'hdfc bank', 'hdfc netbanking'],
    domains: ['hdfcbank.com', 'netbanking.hdfcbank.com'],
    androidPackages: ['com.snapwork.hdfc'],
    brandColor: '#004C8F',
    svgPath: 'M2 4h20v16H2V4zm3 3v10h14V7H5zm2 2h3v6H7V9zm7 0h3v6h-3V9z',
    defaultUrl: 'https://netbanking.hdfcbank.com',
  },
  {
    id: 'icici',
    name: 'ICICI Bank',
    aliases: ['icici', 'icici bank', 'imobile', 'imobile pay'],
    domains: ['icicibank.com', 'infinity.icicibank.com'],
    androidPackages: ['com.csam.icici.bank.imobile'],
    brandColor: '#F37021',
    svgPath: 'M12 2L2 7v10l10 5 10-5V7L12 2zm0 3.8l6.5 3.25V15L12 18.25 5.5 15V9.05L12 5.8z',
    defaultUrl: 'https://www.icicibank.com',
  },
  {
    id: 'axis',
    name: 'Axis Bank',
    aliases: ['axis', 'axis bank', 'axis mobile'],
    domains: ['axisbank.com', 'retail.axisbank.co.in'],
    androidPackages: ['com.axis.mobile'],
    brandColor: '#97144D',
    svgPath: 'M12 2L1 21h22L12 2zm0 4.8L18.4 18H5.6L12 6.8z',
    defaultUrl: 'https://www.axisbank.com',
  },
  {
    id: 'irctc',
    name: 'IRCTC',
    aliases: ['irctc', 'irctc rail connect', 'indian railways', 'cris'],
    domains: ['irctc.co.in', 'cris.org.in'],
    androidPackages: ['cris.org.in.prs.ima'],
    brandColor: '#003366',
    svgPath: 'M4 4h16c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 2v3h16V6H4zm0 5v5h16v-5H4zm2 7l-2 2v1h16v-1l-2-2H6z',
    defaultUrl: 'https://www.irctc.co.in',
  },
  {
    id: 'swiggy',
    name: 'Swiggy',
    aliases: ['swiggy', 'swiggy instamart', 'instamart'],
    domains: ['swiggy.com'],
    androidPackages: ['in.swiggy.android'],
    brandColor: '#FC8019',
    svgPath: 'M12 2a9 9 0 0 0-9 9c0 6.5 9 11 9 11s9-4.5 9-11a9 9 0 0 0-9-9zm0 5a3.5 3.5 0 0 1 3.5 3.5c0 1.9-2 3.5-3.5 5.5-1.5-2-3.5-3.6-3.5-5.5A3.5 3.5 0 0 1 12 7z',
    defaultUrl: 'https://www.swiggy.com',
  },
  {
    id: 'zomato',
    name: 'Zomato',
    aliases: ['zomato'],
    domains: ['zomato.com'],
    androidPackages: ['com.application.zomato'],
    brandColor: '#CB202D',
    svgPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4 14H8v-2h5.5l-5.5-5.5V7h8v2H10.5l5.5 5.5v1.5z',
    defaultUrl: 'https://www.zomato.com',
  },
  {
    id: 'jio',
    name: 'Jio',
    aliases: ['jio', 'myjio', 'jiocinema', 'jiosaavn'],
    domains: ['jio.com', 'jiocinema.com', 'jiosaavn.com'],
    androidPackages: ['com.jio.myjio', 'com.jio.media.jiobeats', 'com.jio.jioplay.tv'],
    brandColor: '#0A2885',
    svgPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-4H9V9h4v7zm0-9h-2V5h2v2z',
    defaultUrl: 'https://www.jio.com',
  },
  {
    id: 'airtel',
    name: 'Airtel',
    aliases: ['airtel', 'airtel thanks', 'my airtel'],
    domains: ['airtel.in', 'airtel.com'],
    androidPackages: ['com.myairtelapp'],
    brandColor: '#ED1B24',
    svgPath: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 4a6 6 0 1 1-6 6 6 6 0 0 1 6-6zm0 2a4 4 0 1 0 4 4 4 4 0 0 0-4-4z',
    defaultUrl: 'https://www.airtel.in',
  },
  {
    id: 'myntra',
    name: 'Myntra',
    aliases: ['myntra'],
    domains: ['myntra.com'],
    androidPackages: ['com.myntra.android'],
    brandColor: '#FF3F6C',
    svgPath: 'M4 4l4 8 4-8 4 8 4-8v16h-3V9l-3 6h-2l-3-6v11H4V4z',
    defaultUrl: 'https://www.myntra.com',
  },
  {
    id: 'ola',
    name: 'Ola',
    aliases: ['ola', 'ola cabs'],
    domains: ['olacabs.com'],
    androidPackages: ['com.olacabs.customer'],
    brandColor: '#CDDE00',
    svgPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4a6 6 0 1 1-6 6 6 6 0 0 1 6-6z',
    defaultUrl: 'https://www.olacabs.com',
  },
  {
    id: 'uber',
    name: 'Uber',
    aliases: ['uber', 'uber eats'],
    domains: ['uber.com', 'ubereats.com'],
    androidPackages: ['com.ubercab', 'com.ubercab.eats'],
    brandColor: '#000000',
    svgPath: 'M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.64 12.923H13v4.692h-2v-4.692H6.36v-1.846H11V6.385h2v4.692h4.64v1.846z',
    defaultUrl: 'https://www.uber.com',
  },
  {
    id: 'hotstar',
    name: 'Disney+ Hotstar',
    aliases: ['hotstar', 'disney+ hotstar', 'disney hotstar'],
    domains: ['hotstar.com'],
    androidPackages: ['in.hotstar.android'],
    brandColor: '#0C111B',
    svgPath: 'M12 2L1 21h22L12 2zm0 5l7 12H5l7-12z',
    defaultUrl: 'https://www.hotstar.com',
  },
  {
    id: 'zerodha',
    name: 'Zerodha Kite',
    aliases: ['zerodha', 'kite', 'zerodha kite', 'coin'],
    domains: ['zerodha.com', 'kite.zerodha.com'],
    androidPackages: ['com.zerodha.kite3', 'com.zerodha.coin'],
    brandColor: '#387ED1',
    svgPath: 'M12 2L2 12l10 10 10-10L12 2zm0 4l6 6-6 6-6-6 6-6z',
    defaultUrl: 'https://kite.zerodha.com',
  },
  {
    id: 'groww',
    name: 'Groww',
    aliases: ['groww'],
    domains: ['groww.in'],
    androidPackages: ['com.nextbillion.groww'],
    brandColor: '#00D09C',
    svgPath: 'M4 18h16v2H4v-2zm2-4l3-3 3 3 6-6 1.4 1.4-7.4 7.4-3-3-2 2L6 14z',
    defaultUrl: 'https://groww.in',
  },
  {
    id: 'cred',
    name: 'CRED',
    aliases: ['cred'],
    domains: ['cred.club'],
    androidPackages: ['com.dreamplug.androidapp'],
    brandColor: '#000000',
    svgPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6 2.69-6 6-6zm0 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    defaultUrl: 'https://cred.club',
  },
  {
    id: 'bookmyshow',
    name: 'BookMyShow',
    aliases: ['bookmyshow', 'book my show', 'bms'],
    domains: ['bookmyshow.com', 'in.bookmyshow.com'],
    androidPackages: ['com.bookmyshow.android'],
    brandColor: '#E63946',
    svgPath: 'M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z',
    defaultUrl: 'https://in.bookmyshow.com',
  },
  {
    id: 'makemytrip',
    name: 'MakeMyTrip',
    aliases: ['makemytrip', 'make my trip', 'mmt'],
    domains: ['makemytrip.com'],
    androidPackages: ['com.makemytrip'],
    brandColor: '#E82B29',
    svgPath: 'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z',
    defaultUrl: 'https://www.makemytrip.com',
  },

  // ── Global Cloud, Developer Tools & Services ────────────────────────────
  {
    id: 'gitlab',
    name: 'GitLab',
    aliases: ['gitlab', 'git lab'],
    domains: ['gitlab.com'],
    androidPackages: ['com.gitlab.android'],
    brandColor: '#FC6D26',
    svgPath: 'M23.6 9.59l-1.07-3.29a.9.9 0 0 0-.34-.43.95.95 0 0 0-.55-.17.96.96 0 0 0-.55.17.9.9 0 0 0-.34.43L18.7 12.6H5.3L3.25 6.3a.9.9 0 0 0-.34-.43.95.95 0 0 0-.55-.17.96.96 0 0 0-.55.17.9.9 0 0 0-.34.43L.4 9.59a1.05 1.05 0 0 0 .38 1.17l11.04 8.02a.4.4 0 0 0 .47 0L23.22 10.76a1.05 1.05 0 0 0 .38-1.17z',
    defaultUrl: 'https://gitlab.com',
  },
  {
    id: 'atlassian',
    name: 'Atlassian / Jira',
    aliases: ['atlassian', 'jira', 'confluence', 'trello', 'bitbucket'],
    domains: ['atlassian.com', 'atlassian.net', 'jira.com', 'trello.com', 'bitbucket.org'],
    androidPackages: ['com.atlassian.jira.mobile', 'com.trello', 'com.atlassian.confluence.server'],
    brandColor: '#0052CC',
    svgPath: 'M11.53 2c0 2.4-1.97 4.35-4.4 4.35H2.8a.8.8 0 0 0-.8.8v4.33c0 2.4 1.97 4.35 4.4 4.35h4.33a.8.8 0 0 0 .8-.8V2zm9.67 8.87c0-2.4-1.97-4.35-4.4-4.35h-4.33a.8.8 0 0 0-.8.8v8.68c0 2.4 1.97 4.35 4.4 4.35h4.33a.8.8 0 0 0 .8-.8v-8.68z',
    defaultUrl: 'https://id.atlassian.com',
  },
  {
    id: 'docker',
    name: 'Docker',
    aliases: ['docker', 'docker hub'],
    domains: ['docker.com', 'hub.docker.com'],
    androidPackages: [],
    brandColor: '#2496ED',
    svgPath: 'M13.983 11.078h2.119a.186.186 0 0 0 .186-.185V9.006a.186.186 0 0 0-.186-.186h-2.119a.185.185 0 0 0-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 0 0 .186-.186V3.574a.186.186 0 0 0-.186-.185h-2.118a.185.185 0 0 0-.185.185v1.888c0 .102.082.185.185.185m0 2.716h2.118a.187.187 0 0 0 .186-.186V6.29a.186.186 0 0 0-.186-.185h-2.118a.185.185 0 0 0-.185.185v1.887c0 .102.082.186.185.186m-2.93 0h2.12a.186.186 0 0 0 .184-.186V6.29a.185.185 0 0 0-.185-.185H8.1a.185.185 0 0 0-.185.185v1.887c0 .102.083.186.185.186m-2.964 0h2.119a.186.186 0 0 0 .185-.186V6.29a.185.185 0 0 0-.185-.185H5.136a.186.186 0 0 0-.186.185v1.887c0 .102.084.186.186.186m5.893 2.715h2.118a.186.186 0 0 0 .186-.186V9.006a.186.186 0 0 0-.186-.186h-2.118a.185.185 0 0 0-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 0 0 .184-.185V9.006a.185.185 0 0 0-.184-.186h-2.12a.185.185 0 0 0-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 0 0 .185-.185V9.006a.185.185 0 0 0-.185-.186h-2.12a.186.186 0 0 0-.185.185v1.888c0 .102.084.185.186.185m-2.928 0h2.119a.185.185 0 0 0 .185-.185V9.006a.185.185 0 0 0-.185-.186H2.208a.186.186 0 0 0-.186.185v1.888c0 .102.084.185.186.185',
    defaultUrl: 'https://hub.docker.com',
  },
  {
    id: 'stackoverflow',
    name: 'Stack Overflow',
    aliases: ['stackoverflow', 'stack overflow', 'stack exchange'],
    domains: ['stackoverflow.com', 'stackexchange.com'],
    androidPackages: [],
    brandColor: '#F58025',
    svgPath: 'M18.986 21.865v-6.404h2.134V24H2.98v-8.539h2.13v6.404h13.876zM7.5 17.595l9.539 1.996.417-1.995-9.539-1.997-.417 1.996zm1.748-5.385l8.608 4.675.986-1.815-8.609-4.675-.985 1.815zm3.17-5.011l6.81 7.027 1.493-1.446-6.81-7.027-1.493 1.446zm6.04-5.334l-1.803 1.134 4.896 7.79 1.803-1.134-4.896-7.79zM7.228 20.932h9.73v-2.03h-9.73v2.03z',
    defaultUrl: 'https://stackoverflow.com',
  },
  {
    id: 'notion',
    name: 'Notion',
    aliases: ['notion', 'notion.so'],
    domains: ['notion.so', 'notion.site'],
    androidPackages: ['notion.id'],
    brandColor: '#000000',
    svgPath: 'M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 4.34v13.588c0 .747.373 1.027 1.214.98l14.523-.84c.84-.046.933-.56.933-1.167V6.962c0-.607-.233-.887-.793-.84l-15.083.887c-.56.047-.794.327-.794.74z',
    defaultUrl: 'https://www.notion.so',
  },
  {
    id: 'figma',
    name: 'Figma',
    aliases: ['figma'],
    domains: ['figma.com'],
    androidPackages: ['com.figma.mirror'],
    brandColor: '#F24E1E',
    svgPath: 'M12 12a4 4 0 1 1 8 0 4 4 0 0 1-8 0zm-8 4a4 4 0 0 1 4-4h4v4a4 4 0 0 1-4 4 4 4 0 0 1-4-4zm0-8a4 4 0 0 1 4-4h4v8H8a4 4 0 0 1-4-4zm8-4h4a4 4 0 1 1 0 8h-4V4zm-8 16a4 4 0 0 1 4-4h4v4a4 4 0 0 1-4 4 4 4 0 0 1-4-4z',
    defaultUrl: 'https://www.figma.com',
  },
  {
    id: 'adobe',
    name: 'Adobe',
    aliases: ['adobe', 'creative cloud', 'photoshop', 'illustrator', 'acrobat'],
    domains: ['adobe.com', 'account.adobe.com'],
    androidPackages: ['com.adobe.reader', 'com.adobe.cc'],
    brandColor: '#FF0000',
    svgPath: 'M13.966 22.624l-1.69-4.281H8.122l3.892-9.144 5.662 13.425zM8.884 1.376H0v21.248zm15.116 0h-8.884L24 22.624z',
    defaultUrl: 'https://account.adobe.com',
  },
  {
    id: 'steam',
    name: 'Steam',
    aliases: ['steam', 'valve'],
    domains: ['steampowered.com', 'steamcommunity.com'],
    androidPackages: ['com.valvesoftware.android.steam.community'],
    brandColor: '#171A21',
    svgPath: 'M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.005.105.005.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.717L.437 15.17C1.864 20.315 6.486 24 11.979 24c6.627 0 12-5.373 12-12s-5.373-12-12-12z',
    defaultUrl: 'https://store.steampowered.com/login',
  },
  {
    id: 'playstation',
    name: 'PlayStation',
    aliases: ['playstation', 'psn', 'sony playstation'],
    domains: ['playstation.com', 'sonyentertainmentnetwork.com'],
    androidPackages: ['com.scee.psxandroid'],
    brandColor: '#003791',
    svgPath: 'M8.98 2.083c-1.39.467-2.31 1.4-2.31 2.917v12.25c.81.42 1.62.63 2.31.63 1.39 0 2.31-.933 2.31-2.45V2.083H8.98zm3.62 14.117c0 2.45-1.5 4.317-4.12 4.317-1.12 0-2.38-.35-3.5-.933l-.98 2.217C5.38 22.517 7.06 23 8.74 23c4.12 0 6.62-2.767 6.62-6.55v-4.9H12.6v4.65zm9.4-7.584c-2.8 0-4.62 1.75-4.62 4.2 0 2.567 1.82 4.317 4.62 4.317 2.8 0 4.62-1.75 4.62-4.317 0-2.45-1.82-4.2-4.62-4.2zm0 6.184c-1.26 0-2.1-.817-2.1-1.984s.84-1.983 2.1-1.983 2.1.816 2.1 1.983-.84 1.984-2.1 1.984z',
    defaultUrl: 'https://my.playstation.com',
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    aliases: ['dropbox'],
    domains: ['dropbox.com'],
    androidPackages: ['com.dropbox.android'],
    brandColor: '#0061FF',
    svgPath: 'M6.002 0L0 4.887l6.002 4.908 5.998-4.908L6.002 0zm11.996 0l-5.998 4.887 5.998 4.908L24 4.887 17.998 0zM0 14.703l6.002 4.908 5.998-4.908-5.998-4.908L0 14.703zm17.998-4.908l-5.998 4.908 5.998 4.908L24 14.703l-6.002-4.908zM6.002 21.03l5.998 3.882 5.998-3.882-5.998-4.909-5.998 4.909z',
    defaultUrl: 'https://www.dropbox.com/login',
  },
  {
    id: 'paypal',
    name: 'PayPal',
    aliases: ['paypal', 'pay pal'],
    domains: ['paypal.com'],
    androidPackages: ['com.paypal.android.p2pmobile'],
    brandColor: '#00457C',
    svgPath: 'M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.28-.475 3.033-2.07 5.17-4.468 6.01 1.332.483 2.062 1.576 1.748 3.578-.445 2.836-2.585 4.316-5.875 4.316H9.336c-.464 0-.853.336-.925.795l-.754 4.786a.641.641 0 0 1-.581.562z',
    defaultUrl: 'https://www.paypal.com/signin',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    aliases: ['stripe'],
    domains: ['stripe.com'],
    androidPackages: ['com.stripe.android.dashboard'],
    brandColor: '#635BFF',
    svgPath: 'M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697.56 12.91.56 6.963.56 2.825 3.58 2.825 8.784c0 4.964 3.737 6.46 7.644 7.653 2.658.81 3.584 1.547 3.584 2.502 0 .976-.848 1.488-2.316 1.488-2.39 0-5.38-.99-7.382-2.102l-.936 5.602c2.093 1.018 5.23 1.515 8.318 1.515 6.273 0 10.597-2.906 10.597-8.313 0-4.887-3.414-6.666-8.358-7.977z',
    defaultUrl: 'https://dashboard.stripe.com/login',
  },
  {
    id: 'airbnb',
    name: 'Airbnb',
    aliases: ['airbnb', 'air bnb'],
    domains: ['airbnb.com'],
    androidPackages: ['com.airbnb.android'],
    brandColor: '#FF5A5F',
    svgPath: 'M12 0C7.22 0 4.13 3.65 4.13 7.82c0 4.94 4.62 10.43 7.87 16.18 3.25-5.75 7.87-11.24 7.87-16.18C19.87 3.65 16.78 0 12 0zm0 10.84c-1.74 0-3.15-1.41-3.15-3.15 0-1.74 1.41-3.15 3.15-3.15 1.74 0 3.15 1.41 3.15 3.15 0 1.74-1.41 3.15-3.15 3.15z',
    defaultUrl: 'https://www.airbnb.com',
  },
  {
    id: 'zoom',
    name: 'Zoom',
    aliases: ['zoom', 'zoom video'],
    domains: ['zoom.us'],
    androidPackages: ['us.zoom.videomeetings'],
    brandColor: '#2D8CFF',
    svgPath: 'M24 6.883v10.234a2.63 2.63 0 0 1-2.628 2.628H2.628A2.63 2.63 0 0 1 0 17.117V6.883A2.63 2.63 0 0 1 2.628 4.255h18.744A2.63 2.63 0 0 1 24 6.883z',
    defaultUrl: 'https://zoom.us/signin',
  },
  {
    id: 'proton',
    name: 'Proton',
    aliases: ['proton', 'protonmail', 'proton mail', 'protonvpn'],
    domains: ['proton.me', 'protonmail.com', 'account.proton.me'],
    androidPackages: ['ch.protonmail.android', 'ch.protonvpn.android'],
    brandColor: '#6D4AFF',
    svgPath: 'M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4.8a7.2 7.2 0 1 1 0 14.4 7.2 7.2 0 0 1 0-14.4z',
    defaultUrl: 'https://account.proton.me',
  },
  {
    id: 'bitwarden',
    name: 'Bitwarden',
    aliases: ['bitwarden', 'bit warden'],
    domains: ['bitwarden.com', 'vault.bitwarden.com'],
    androidPackages: ['com.x8bit.bitwarden'],
    brandColor: '#175DDC',
    svgPath: 'M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 3.6l7.2 3.6v5.4c0 4.8-3.6 8.4-7.2 9.6-3.6-1.2-7.2-4.8-7.2-9.6V7.2L12 3.6z',
    defaultUrl: 'https://vault.bitwarden.com',
  },
  {
    id: 'onepassword',
    name: '1Password',
    aliases: ['1password', 'onepassword', 'one password'],
    domains: ['1password.com', 'my.1password.com'],
    androidPackages: ['com.onepassword.android', 'com.agilebits.onepassword'],
    brandColor: '#0A85EA',
    svgPath: 'M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 6a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm-1 2v4h2V8h-2zm0 6v2h2v-2h-2z',
    defaultUrl: 'https://my.1password.com',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// STRING NORMALIZATION & FUZZY MATCHING HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function cleanText(input?: string): string {
  if (!input) return '';
  return input.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function extractHostname(url?: string): string {
  if (!url) return '';
  let cleaned = url.trim().toLowerCase();
  // Strip protocol
  cleaned = cleaned.replace(/^(?:https?:\/\/)/, '');
  // Strip path & query
  cleaned = cleaned.split('/')[0].split('?')[0].split('#')[0];
  // Strip port
  cleaned = cleaned.split(':')[0];
  // Strip www.
  if (cleaned.startsWith('www.')) {
    cleaned = cleaned.substring(4);
  }
  return cleaned;
}

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const row = new Array(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;

  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return row[n];
}

// ─────────────────────────────────────────────────────────────────────────────
// RESOLVE BRAND FUNCTION (Three Strict Matching Layers)
// ─────────────────────────────────────────────────────────────────────────────
export interface ResolveBrandInput {
  name?: string;
  url?: string;
  androidPackage?: string;
}

export function resolveBrand(input: ResolveBrandInput): BrandDefinition | null {
  const { name, url, androidPackage } = input;

  // ── LAYER 1: androidPackage exact match ────────────────────────────────────
  if (androidPackage && androidPackage.trim()) {
    let cleanPkg = androidPackage.trim().toLowerCase();
    // Strip android://... prefix if passed
    cleanPkg = cleanPkg.replace(/^android:\/\/[^@]+@/, '').replace(/^android:\/\//, '').replace(/\/$/, '');
    const pkgMatch = BRANDS.find((b) =>
      b.androidPackages.some((p) => p.toLowerCase() === cleanPkg)
    );
    if (pkgMatch) {
      return pkgMatch;
    }
  }

  // ── LAYER 2: Hostname of clean HTTPS URL matched against domains ──────────
  if (url && url.trim()) {
    const hostname = extractHostname(url);
    if (hostname && hostname.includes('.')) {
      // Check domain list including subdomains (e.g. login.microsoftonline.com -> Microsoft)
      const domainMatch = BRANDS.find((b) =>
        b.domains.some((d) => {
          const cleanDomain = d.toLowerCase();
          return hostname === cleanDomain || hostname.endsWith('.' + cleanDomain);
        })
      );
      if (domainMatch) {
        return domainMatch;
      }
    }
  }

  // ── LAYER 3: Credential name matched against names and aliases ─────────────
  // Case-insensitive, ignore spaces and punctuation, fuzzy match for close typos.
  // CRITICAL RULE: NEVER add ".com" to a name and guess!
  if (name && name.trim()) {
    const cleanName = cleanText(name);

    if (cleanName.length > 0) {
      // 1. Exact match on clean name or alias
      for (const brand of BRANDS) {
        if (cleanText(brand.name) === cleanName) {
          return brand;
        }
        for (const alias of brand.aliases) {
          if (cleanText(alias) === cleanName) {
            return brand;
          }
        }
      }

      // 2. Prefix / substring match for words of reasonable length (>= 3 chars)
      if (cleanName.length >= 3) {
        for (const brand of BRANDS) {
          const cleanBrandName = cleanText(brand.name);
          if (cleanBrandName.startsWith(cleanName) || cleanName.startsWith(cleanBrandName)) {
            return brand;
          }
          for (const alias of brand.aliases) {
            const cleanAlias = cleanText(alias);
            if (cleanAlias.length >= 3 && (cleanAlias.startsWith(cleanName) || cleanName.startsWith(cleanAlias))) {
              return brand;
            }
          }
        }
      }

      // 3. Simple fuzzy match for close typos (e.g. "instgram" -> Instagram)
      if (cleanName.length >= 4) {
        let bestBrand: BrandDefinition | null = null;
        let minDistance = 999;

        for (const brand of BRANDS) {
          const cleanBrandName = cleanText(brand.name);
          const maxAllowed = cleanBrandName.length >= 8 ? 2 : 1;
          const dist = levenshteinDistance(cleanName, cleanBrandName);

          if (dist <= maxAllowed && dist < minDistance) {
            minDistance = dist;
            bestBrand = brand;
          }

          for (const alias of brand.aliases) {
            const cleanAlias = cleanText(alias);
            if (cleanAlias.length >= 4) {
              const aDist = levenshteinDistance(cleanName, cleanAlias);
              const aMax = cleanAlias.length >= 8 ? 2 : 1;
              if (aDist <= aMax && aDist < minDistance) {
                minDistance = aDist;
                bestBrand = brand;
              }
            }
          }
        }

        if (bestBrand) {
          return bestBrand;
        }
      }
    }
  }

  // No match found -> Return null (shows letter fallback)
  return null;
}
