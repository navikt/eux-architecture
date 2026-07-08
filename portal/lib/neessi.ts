/** Deep link to a case in nEESSI (svarsed) for the given environment. */
export function neessiSakUrl(env: string, rinaSakId: string | number): string {
  return `https://eux-neessi-${env}.intern.dev.nav.no/svarsed/view/sak/${rinaSakId}`;
}
