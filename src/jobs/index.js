import { iniciarJobEnvioNotificaciones } from "./enviarNotificaciones.job.js";
import { iniciarJobRecordatorioCitas }   from "./recordatoriosCitas.job.js";

export function iniciarJobs() {
    iniciarJobEnvioNotificaciones();
    iniciarJobRecordatorioCitas();
}
