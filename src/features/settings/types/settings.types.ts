import { z } from "zod";
import { settingsValidation } from "@/features/settings/validations/settings.validation.js";

export type GetLogsInput = z.infer<typeof settingsValidation.getLogs>;
export type GetLogDetailInput = z.infer<typeof settingsValidation.getLogDetail>;
