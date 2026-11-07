-- =============================================================
-- 0003 — Datos semilla (catálogos)
-- Valores tomados del proyecto Supabase arbdhyeycvyskjgpjlmn.
-- Idempotente: se puede reejecutar sin duplicar.
-- =============================================================

-- ── Provincias (16) ──────────────────────────────────────────
insert into public.provincias (id, nombre, codigo) values
    (1,  'La Habana',         'LHA'),
    (2,  'Artemisa',          'ART'),
    (3,  'Mayabeque',         'MAY'),
    (4,  'Pinar del Río',     'PRI'),
    (5,  'Matanzas',          'MTZ'),
    (6,  'Villa Clara',       'VCL'),
    (7,  'Cienfuegos',        'CFG'),
    (8,  'Sancti Spíritus',   'SSP'),
    (9,  'Ciego de Ávila',    'CAV'),
    (10, 'Camagüey',          'CMG'),
    (11, 'Las Tunas',         'LTU'),
    (12, 'Holguín',           'HOL'),
    (13, 'Granma',            'GRA'),
    (14, 'Santiago de Cuba',  'SCU'),
    (15, 'Guantánamo',        'GTM'),
    (16, 'Isla de la Juventud','IJV')
on conflict (id) do update set nombre = excluded.nombre, codigo = excluded.codigo;

-- ── Municipios de Holguín (14) ───────────────────────────────
insert into public.municipios (id, nombre, provincia_id) values
    (1201, 'Holguín',        12),
    (1202, 'Báguanos',       12),
    (1203, 'Banes',          12),
    (1204, 'Cacocum',        12),
    (1205, 'Calixto García', 12),
    (1206, 'Cueto',          12),
    (1207, 'Frank País',     12),
    (1208, 'Gibara',         12),
    (1209, 'Mayarí',         12),
    (1210, 'Moa',            12),
    (1211, 'Rafael Freyre',  12),
    (1212, 'Sagua de Tánamo',12),
    (1213, 'Urbano Noris',   12),
    (1214, 'Antilla',        12)
on conflict (id) do update set nombre = excluded.nombre, provincia_id = excluded.provincia_id;

-- ── Centros de salud de Holguín ──────────────────────────────
insert into public.centros_salud (id, nombre, tipo, municipio_id) values
    (120101, 'Centro Provincial de Higiene, Epidemiología y Microbiología (Holguín)', 'hospital',       1201),
    (120102, 'Vladimir Ilich Lenin',                                                 'hospital',       1201),
    (120103, 'Lucía Íñiguez Landín',                                                 'hospital',       1201),
    (120104, 'Octavio de la Concepción de la Pedraja',                               'hospital',       1201),
    (120105, 'Máximo Gómez Báez, Pol.',                                              'área de salud',  1201),
    (120106, 'Julio Grave de Peralta, Pol.',                                         'área de salud',  1201),
    (120107, 'Fermín Valdés Domínguez',                                              'hospital',       1201)
on conflict (id) do update set
    nombre = excluded.nombre, tipo = excluded.tipo, municipio_id = excluded.municipio_id;

-- ── Pruebas TB (6) ───────────────────────────────────────────
insert into public.examenes_tb (id, nombre, codigo, activo) values
    (1,  'Baciloscopia',            'BACI',        true),
    (2,  'Cultivo',                 'CULT',        true),
    (3,  'Xpert MTB/RIF (Ultra)',   'XPERT-ULTRA', true),
    (4,  'MF-LED',                  'MF-LED',      false),
    (5,  'Xpert MTB/XDR',           'XPERT-XDR',   true),
    (46, 'TB-LAM',                  'TB-LAM',      true)
on conflict (id) do update set
    nombre = excluded.nombre, codigo = excluded.codigo, activo = excluded.activo;

-- ── Tipos de muestra (24) ────────────────────────────────────
insert into public.tipos_muestra (id, nombre, activo) values
    (1,  'Aspirado bronquial',   true),
    (2,  'BAAF ganglio',         true),
    (3,  'Biopsias de tejido',   true),
    (4,  'Broncoscopía',         true),
    (5,  'Contenido gástrico',   true),
    (6,  'Esputo 1',             true),
    (7,  'Esputo 2',             true),
    (8,  'Esputo 3',             true),
    (9,  'Esputo evolutivo',     true),
    (10, 'Exudado de lesión',    true),
    (11, 'Exudado faríngeo',     true),
    (12, 'Ganglio mesentérico',  true),
    (13, 'L. Articular',         true),
    (14, 'L. Ascítico',          true),
    (15, 'L. Pericárdico',       true),
    (16, 'L. Peritoneal',        true),
    (17, 'L. Pleural',           true),
    (18, 'Lavado bronquial',     true),
    (19, 'LCR',                  true),
    (20, 'Líquido sinovial',     true),
    (21, 'Médula ósea',          true),
    (22, 'Orina',                true),
    (23, 'Pus de lesión',        true),
    (24, 'Secreción',            true)
on conflict (id) do update set nombre = excluded.nombre, activo = excluded.activo;

-- ── Microorganismos ──────────────────────────────────────────
insert into public.microorganismos (id, nombre, sistema, activo) values
    (1, 'M. tuberculosis',                        true, true),
    (2, 'MNTB (Micobacteria No Tuberculosas)',    true, true),
    (7, 'Mycobacterium tuberculosis',             true, false),
    (8, 'MNTB (Micobacteria No Tuberculosa)',     true, false)
on conflict (id) do update set
    nombre = excluded.nombre, sistema = excluded.sistema, activo = excluded.activo;

-- ── Roles del sistema (6) ────────────────────────────────────
-- El id es el valor que usa el frontend (rol_sistema_id) en módulos.
insert into public.roles_sistema (id, nombre, descripcion) values
    (1, 'usuario_comun',
        'Indica exámenes a pacientes dentro de su institución. Asignable únicamente a médicos/as y enfermeros/as (rol_profesional_id IN (1,2)). Sin acceso a datos epidemiológicos ni resultados de laboratorio.'),
    (2, 'moderador_institucional', 'Modera datos de su institución adscrita.'),
    (3, 'moderador_municipal',     'Modera datos del municipio adscrito.'),
    (4, 'moderador_provincial',    'Modera datos de su provincia.'),
    (5, 'moderador_nacional',      'Modera datos a nivel nacional.'),
    (6, 'administrador',           'Acceso total. Gestión de usuarios y configuración.')
on conflict (id) do update set
    nombre = excluded.nombre, descripcion = excluded.descripcion;

-- ── Laboratorios ─────────────────────────────────────────────
insert into public.laboratorios (id, nombre, nivel_referencia, provincia_id, municipio_id, activo, examenes_ids) values
    (4001, 'Lab. Prov. de Tuberculosis (Holguín, CPHEM)', 'provincial', 12, 1201, true, '{1,2,3,4,5,6}'),
    (4002, 'Lab. de Microbiología de Hptal. V. I. Lenin', 'local',      12, 1201, true, '{1}'),
    (4003, 'Lucía Íñiguez Landín',                        'local',      12, 1201, true, '{1}'),
    (4004, 'HPP Holguín, Lab. Micro',                     'local',      12, 1201, true, '{1}')
on conflict (id) do update set
    nombre = excluded.nombre,
    nivel_referencia = excluded.nivel_referencia,
    provincia_id = excluded.provincia_id,
    municipio_id = excluded.municipio_id,
    activo = excluded.activo,
    examenes_ids = excluded.examenes_ids;

-- ── Grupos vulnerables / factores de riesgo ──────────────────
-- La base viva tiene 22 filas. Referencia para no perder la
-- continuidad numérica (grupos_ids de pacientes ya guardados):
insert into public.grupos_vulnerables (id, nombre, activo) select v.id, v.nombre, true
from (values
    (1,  'Antiguo caso de TB'),
    (2,  'Contacto TB'),
    (3,  'Cubano viviendo en países de alta carga de TB'),
    (4,  'Desnutrición'),
    (5,  'Diabetes mellitus'),
    (6,  'Enfermedad respiratoria crónica'),
    (7,  'Extranjero proveniente de país de alta carga de TB'),
    (8,  'Fumador'),
    (9,  'Insuficiencia renal crónica'),
    (10, 'Lesiones radiográficas antiguas'),
    (11, 'Minero'),
    (12, 'Niños ≤ 5 años'),
    (13, 'Otros'),
    (14, 'Persona que consume drogas'),
    (15, 'Personas en internamiento prolongado'),
    (16, 'Recluso o Exrecluso'),
    (17, 'Sin hogar'),
    (18, 'Trabajador de salud relacionado con la atención a pacientes'),
    (19, 'Trabajador de unidad penitenciaria'),
    (20, 'Trastornos por consumo de alcohol'),
    (21, 'Vivir en hacinamiento, poca ventilación y luz solar, barrios marginales'),
    (22, 'VIH')
) as v(id, nombre)
on conflict (id) do update set nombre = excluded.nombre;
