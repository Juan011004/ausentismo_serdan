export type StructureRow = {
  regional: string; gerencia: string; sector: string; estado: string; cedula: string;
  nombre: string; cargo: string; cargoAvancys: string; tipo: string; fechaIngreso: string;
  unidad: string; numeroPersonal: string; correo: string
}

export type DailyRecord = {
  regional: string; gerencia: string; cedula: string; nombre: string; cargo: string;
  sector: string; fechaIngreso: string; fechaRegistro: string; valorReportado: string
}

export type Assignment = DailyRecord & { id: string; esSuper: boolean; autoVacante: boolean }
