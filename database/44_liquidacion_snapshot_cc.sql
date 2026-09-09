-- Las liquidaciones mostraban siempre el centro de costo ACTUAL del
-- trabajador (vía JOIN a empleados), por lo que reasignar a alguien de CC
-- (ej. unificar dos CC) cambiaba retroactivamente el CC de liquidaciones ya
-- emitidas de meses anteriores. Se agrega una foto (snapshot) del CC vigente
-- al momento de emitir cada liquidación.
ALTER TABLE erp.liquidaciones
  ADD COLUMN IF NOT EXISTS id_centro_costo INTEGER REFERENCES erp.centros_costo(id);

-- Backfill: para liquidaciones ya emitidas no tenemos el CC histórico real,
-- se deja el CC actual del trabajador como mejor aproximación disponible.
UPDATE erp.liquidaciones l
SET id_centro_costo = e.id_centro_costo
FROM erp.empleados e
WHERE l.id_empleado = e.id AND l.id_centro_costo IS NULL;
