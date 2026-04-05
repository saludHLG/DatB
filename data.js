/* =========================================================
   data.js — Datos estáticos para prototipo local
   Simula los catálogos de la BD (provincias, municipios,
   centros de salud). Ajustar según país destino.
   ========================================================= */

const DATOS_GEO = {
    provincias: [
        { id: 1, nombre: "La Habana",        codigo: "LHA" },
        { id: 2, nombre: "Artemisa",          codigo: "ART" },
        { id: 3, nombre: "Mayabeque",         codigo: "MAY" },
        { id: 4, nombre: "Pinar del Río",     codigo: "PRI" },
        { id: 5, nombre: "Matanzas",          codigo: "MTZ" },
        { id: 6, nombre: "Villa Clara",       codigo: "VCL" },
        { id: 7, nombre: "Cienfuegos",        codigo: "CFG" },
        { id: 8, nombre: "Sancti Spíritus",   codigo: "SSP" },
        { id: 9, nombre: "Ciego de Ávila",    codigo: "CAV" },
        { id: 10, nombre: "Camagüey",         codigo: "CMG" },
        { id: 11, nombre: "Las Tunas",        codigo: "LTU" },
        { id: 12, nombre: "Holguín",          codigo: "HOL" },
        { id: 13, nombre: "Granma",           codigo: "GRA" },
        { id: 14, nombre: "Santiago de Cuba", codigo: "SCU" },
        { id: 15, nombre: "Guantánamo",       codigo: "GTM" },
        { id: 16, nombre: "Isla de la Juventud", codigo: "IJV" }
    ],

    municipios: [
        // Holguín (12)
        { id: 1201, nombre: "Holguín",        provincia_id: 12 },
        { id: 1202, nombre: "Báguanos",          provincia_id: 12 },
        { id: 1203, nombre: "Banes",            provincia_id: 12 },
		{ id: 1204, nombre: "Cacocum",            provincia_id: 12 },
		{ id: 1205, nombre: "Calixto García",            provincia_id: 12 },
		{ id: 1206, nombre: "Cueto",            provincia_id: 12 },
		{ id: 1207, nombre: "Frank País",            provincia_id: 12 },
		{ id: 1208, nombre: "Gibara",            provincia_id: 12 },
		{ id: 1209, nombre: "Mayarí",            provincia_id: 12 },
		{ id: 1210, nombre: "Moa",            provincia_id: 12 },
		{ id: 1211, nombre: "Rafael Freyre",            provincia_id: 12 },
		{ id: 1212, nombre: "Sagua de Tánamo",            provincia_id: 12 },
		{ id: 1213, nombre: "Urbano Noris",            provincia_id: 12 },
		{ id: 1214, nombre: "Antilla",            provincia_id: 12 },
		
    ],

    centros_salud: [
        // Holguín (1201)
        { id: 120101, nombre: "Centro Provincial de Higiene, Epidemiología y Microbiología (Holguín)",                    municipio_id: 1201, tipo: "hospital" },
    ],

    laboratorios: [
        // Holguín
        { id: 4001, nombre: "Lab. Prov. de Tuberculosis (Holguín, CPHEM)",                       provincia_id: 12, municipio_id: 1201, nivel_referencia: 'provincial', examenes_ids: [1, 2, 3, 5] },
        { id: 4002, nombre: "Lab. de Microbiología de Hptal. V. I. Lenin",                   provincia_id: 12, municipio_id: 1201, nivel_referencia: 'municipal', examenes_ids: [1, 2] }
    ]
};

const ROLES_PROFESIONALES = {
    1: { nombre: "Médico/a",                  requiere_registro: true  },
    2: { nombre: "Enfermero/a",               requiere_registro: false },
    3: { nombre: "Licenciado/a de Lab.",       requiere_registro: false },
    4: { nombre: "Técnico/a de Lab.",          requiere_registro: false }
};

const ROLES_SISTEMA = {
    1: "Usuario común",
    2: "Moderador institucional",
    3: "Moderador municipal",
    4: "Moderador provincial",
    5: "Moderador nacional",
    6: "Administrador"
};
