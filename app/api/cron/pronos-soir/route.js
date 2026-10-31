// Deuxième passage du soir (juste avant les matchs NBA) : même traitement que /api/cron/pronos.
export { GET } from "../pronos/route";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
