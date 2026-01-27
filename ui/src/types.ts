export type OAuthUser = {
  sub?: string | null;
  email?: string | null;
  email_verified?: boolean | null;
  groups?: string[];
};
