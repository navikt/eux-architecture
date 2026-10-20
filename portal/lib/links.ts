/** Link to a node in the architecture map. Handled by `app/architecture/page.tsx`. */
export const archHref = (id: string) => `/architecture?fokus=${encodeURIComponent(id)}#kart`;

/** Link to a repository under github.com/navikt. */
export const ghHref = (repo: string) => `https://github.com/navikt/${repo}`;
