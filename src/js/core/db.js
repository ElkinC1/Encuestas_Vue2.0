/**
 * Capa de persistencia Supabase — alineada al esquema del proyecto.
 * Tablas: usuarios, encuestas, preguntas, respuestas_usuarios, respuestas_detalle
 */
const SUPABASE_URL = 'https://raygaeiumarehtrsuoqe.supabase.co';
const SUPABASE_KEY = 'sb_publishable_0gwkICgd9SwE5G-Nz_EbYg_bWGUm0mi';

function esArchivoLocal() {
    return window.location.protocol === 'file:';
}

// Variables globales internas de la capa de datos
let supabaseClient = null;
let errorInicializacionDb = null;

try {
    // Si la librería externa ya está cargada en la ventana, inicializamos el cliente
    if (typeof window.supabase !== 'undefined') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
} catch (e) {
    errorInicializacionDb = 'Error al conectar con Supabase.';
    console.error(e);
}

function dbMensajeEntorno() {
    // MODIFICADO: Ya no bloqueamos 'file://', solo avisamos en consola si falta la librería por red
    if (!supabaseClient && typeof window.supabase === 'undefined') {
        return 'No se pudo cargar la librería de Supabase (Revisa tu conexión a internet).';
    }
    if (errorInicializacionDb) {
        return errorInicializacionDb;
    }
    return null;
}

const SESION_KEY = 'usuarioSesion';
const TABLA_DETALLE = 'respuestas_detalle';

function dbObtenerSesion() {
    try {
        const raw = localStorage.getItem(SESION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function dbGuardarSesion(usuario) {
    localStorage.setItem(SESION_KEY, JSON.stringify(usuario));
}

function dbCerrarSesion() {
    localStorage.removeItem(SESION_KEY);
}

function formatearFechaDesdeDb(valor) {
    if (!valor) return '';
    try {
        return new Date(valor).toLocaleDateString('es-ES');
    } catch {
        return '';
    }
}

function mapDetalleRespuesta(row) {
    return {
        nombreUsuario: row.nombre_usuario,
        opcionElegida: row.opcion_elegida
    };
}

function mapPreguntaFromDb(row, detalles = []) {
    const pid = String(row.id);
    return {
        id: row.id,
        texto: row.texto_pregunta,
        tipo: row.tipo_pregunta,
        opciones: row.opciones || [],
        respuestasDetalle: detalles
            .filter(d => String(d.pregunta_id) === pid)
            .map(mapDetalleRespuesta)
    };
}

function mapEncuestaFromDb(row, preguntas = [], detalles = []) {
    const eid = String(row.id);
    const preguntasEncuesta = preguntas
        .filter(p => String(p.encuesta_id) === eid)
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

    const detallesEncuesta = detalles.filter(d => String(d.encuesta_id) === eid);

    return {
        id: row.id,
        titulo: row.titulo,
        descripcion: row.descripcion || '',
        creador: row.creador_nombre,
        creadorCorreo: row.creador_correo,
        fecha: formatearFechaDesdeDb(row.creado_en),
        colorTema: row.color_tema,
        estado: row.estado || 'Activa',
        totalVotos: row.total_votos ?? 0,
        duracion: 0,
        acceso: {
            tipo: row.acceso_tipo || 'todos',
            rolesPermitidos: row.roles_permitidos || [],
            usuariosPermitidos: row.usuarios_permitidos || []
        },
        preguntas: preguntasEncuesta.map(p => mapPreguntaFromDb(p, detallesEncuesta))
    };
}

function usuarioPuedeResponder(encuesta, usuario) {
    const acceso = encuesta.acceso || {};
    const rol = (usuario.rol || '').toUpperCase();

    if (acceso.tipo === 'todos') return true;
    if (acceso.tipo === 'rol') {
        const roles = (acceso.rolesPermitidos || []).map(r => String(r).toUpperCase());
        return roles.includes(rol);
    }
    if (acceso.tipo === 'especifico') {
        const correo = (usuario.correo || '').toLowerCase().trim();
        return (acceso.usuariosPermitidos || []).some(
            c => String(c).toLowerCase().trim() === correo
        );
    }
    return false;
}

async function dbCargarDatosEncuestas(encuestaIds = null) {
    if (!supabaseClient && typeof window.supabase !== 'undefined') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }

    let queryEncuestas = supabaseClient.from('encuestas').select('*').order('creado_en', { ascending: false });
    if (encuestaIds?.length) {
        queryEncuestas = queryEncuestas.in('id', encuestaIds.map(String));
    }

    const { data: encuestas, error: errEnc } = await queryEncuestas;
    if (errEnc) throw errEnc;
    if (!encuestas?.length) return [];

    const ids = encuestas.map(e => String(e.id));

    const [{ data: preguntas, error: errPre }, { data: detalles, error: errDet }] =
        await Promise.all([
            supabaseClient.from('preguntas').select('*').in('encuesta_id', ids).order('orden', { ascending: true }),
            supabaseClient.from(TABLA_DETALLE).select('*').in('encuesta_id', ids)
        ]);

    if (errPre) throw errPre;
    if (errDet) throw errDet;

    return encuestas.map(e => mapEncuestaFromDb(e, preguntas || [], detalles || []));
}

async function dbLoginUsuario(correo, clave) {
    const aviso = dbMensajeEntorno();
    if (aviso) return { ok: false, mensaje: aviso };

    if (!supabaseClient && typeof window.supabase !== 'undefined') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }

    try {
        const correoNorm = correo.toLowerCase().trim();
        const { data, error } = await supabaseClient
            .from('usuarios')
            .select('id, nombre, correo, clave, rol, inicial')
            .eq('correo', correoNorm)
            .eq('clave', clave)
            .maybeSingle();

        if (error) {
            console.error('Error en login:', error);
            return { ok: false, mensaje: error.message || 'No se pudo consultar la base de datos.' };
        }
        if (!data) return { ok: false, mensaje: null };

        return {
            ok: true,
            usuario: {
                id: data.id,
                nombre: data.nombre,
                correo: data.correo,
                clave: data.clave,
                rol: String(data.rol || 'ESTUDIANTE').toUpperCase(),
                inicial: data.inicial || (data.nombre ? data.nombre.charAt(0).toUpperCase() : 'U')
            }
        };
    } catch (e) {
        console.error('Error en login:', e);
        return { ok: false, mensaje: 'Error de conexión. Verifica los permisos de CORS o tu red.' };
    }
}

async function dbRegistrarUsuario(nombre, correo, clave, rol) {
    if (!supabaseClient && typeof window.supabase !== 'undefined') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }

    if (!supabaseClient) {
        return { ok: false, error: 'La librería de Supabase no se cargó correctamente.' };
    }

    try {
        const correoNorm = correo.toLowerCase().trim();
        const rolNorm = String(rol).toUpperCase();

        const { data: existente } = await supabaseClient
            .from('usuarios')
            .select('id')
            .eq('correo', correoNorm)
            .maybeSingle();

        if (existente) return { ok: false, error: 'Este correo ya está registrado.' };

        const { error } = await supabaseClient.from('usuarios').insert([{
            nombre: nombre.trim(),
            correo: correoNorm,
            clave: clave,
            rol: rolNorm,
            inicial: nombre.trim().charAt(0).toUpperCase()
        }]);

        if (error) throw error;
        return { ok: true };
    } catch (e) {
        console.error('Error al registrar:', e);
        return { ok: false, error: 'No se pudo crear la cuenta. Verifica RLS, CORS o tu conexión.' };
    }
}

async function dbObtenerEncuestas(usuarioActual) {
    try {
        const todas = await dbCargarDatosEncuestas();
        const rol = (usuarioActual?.rol || '').toUpperCase();
        const correoSesion = (usuarioActual?.correo || '').toLowerCase().trim();

        if (rol === 'ADMINISTRADOR') return todas;

        return todas.filter(e => {
            const correoCreador = (e.creadorCorreo || '').toLowerCase().trim();
            return correoCreador === correoSesion;
        });
    } catch (e) {
        console.error('Error al traer encuestas:', e);
        return [];
    }
}

async function dbObtenerEncuestasParaResponder(usuarioActual) {
    if (!supabaseClient && typeof window.supabase !== 'undefined') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }

    try {
        const todas = await dbCargarDatosEncuestas();
        const correo = (usuarioActual?.correo || '').toLowerCase().trim();

        const { data: historial, error: errHist } = await supabaseClient
            .from('respuestas_usuarios')
            .select('encuesta_id')
            .eq('usuario_correo', correo);

        if (errHist) throw errHist;

        const respondidasIds = new Set((historial || []).map(r => String(r.encuesta_id)));

        return todas.filter(e => {
            const esActiva = (e.estado || 'Activa') === 'Activa';
            const noRespondida = !respondidasIds.has(String(e.id));
            const noSoyElCreador = (e.creadorCorreo || '').toLowerCase().trim() !== correo;
            const tienePermiso = usuarioPuedeResponder(e, usuarioActual);
            return esActiva && noRespondida && noSoyElCreador && tienePermiso;
        });
    } catch (e) {
        console.error('Error al cargar encuestas para responder:', e);
        return [];
    }
}

async function dbUsuarioYaRespondio(usuarioCorreo, encuestaId) {
    if (!supabaseClient && typeof window.supabase !== 'undefined') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }

    const { data, error } = await supabaseClient
        .from('respuestas_usuarios')
        .select('id')
        .eq('usuario_correo', usuarioCorreo.toLowerCase().trim())
        .eq('encuesta_id', String(encuestaId))
        .maybeSingle();

    if (error) {
        console.error(error);
        return false;
    }
    return !!data;
}

async function dbGuardarEncuesta(encuestaFinal, preguntas) {
    if (!supabaseClient && typeof window.supabase !== 'undefined') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }

    try {
        const { error: errorEncuesta } = await supabaseClient.from('encuestas').insert([{
            id: String(encuestaFinal.id),
            titulo: encuestaFinal.titulo,
            descripcion: encuestaFinal.descripcion || null,
            creador_nombre: encuestaFinal.creador,
            creador_correo: encuestaFinal.creadorCorreo,
            color_tema: encuestaFinal.colorTema || '#1a4d2e',
            estado: encuestaFinal.estado || 'Activa',
            total_votos: encuestaFinal.totalVotos ?? 0,
            acceso_tipo: encuestaFinal.acceso.tipo,
            roles_permitidos: encuestaFinal.acceso.rolesPermitidos || [],
            usuarios_permitidos: encuestaFinal.acceso.usuariosPermitidos || []
        }]);

        if (errorEncuesta) throw errorEncuesta;

        const preguntasPayload = preguntas.map(p => ({
            id: String(p.id),
            encuesta_id: String(encuestaFinal.id),
            texto_pregunta: p.texto,
            tipo_pregunta: p.tipo,
            opciones: p.tipo === 'texto' ? null : p.opciones
        }));

        const { error: errorPreguntas } = await supabaseClient.from('preguntas').insert(preguntasPayload);
        if (errorPreguntas) throw errorPreguntas;

        return true;
    } catch (e) {
        console.error('Error en guardado de encuesta:', e);
        return false;
    }
}

async function dbEliminarEncuesta(id) {
    if (!supabaseClient && typeof window.supabase !== 'undefined') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }

    try {
        const { error } = await supabaseClient.from('encuestas').delete().eq('id', String(id));
        if (error) throw error;
        return true;
    } catch (e) {
        console.error('Error al eliminar encuesta:', e);
        return false;
    }
}

async function dbEnviarVotos(usuarioCorreo, usuarioNombre, encuesta, respuestasMap) {
    if (!supabaseClient && typeof window.supabase !== 'undefined') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }

    try {
        const correo = usuarioCorreo.toLowerCase().trim();
        const encuestaId = String(encuesta.id);

        if (await dbUsuarioYaRespondio(correo, encuestaId)) {
            return { ok: false, mensaje: 'Ya registraste tu respuesta en esta encuesta.' };
        }

        const { error: errorHistorial } = await supabaseClient.from('respuestas_usuarios').insert([{
            usuario_correo: correo,
            encuesta_id: encuestaId
        }]);

        if (errorHistorial) throw errorHistorial;

        for (const p of encuesta.preguntas) {
            const rUsuario = respuestasMap[p.id];
            const preguntaId = String(p.id);

            if (p.tipo === 'texto') {
                const textoRespuesta = (rUsuario || '').toString().trim();
                if (textoRespuesta) {
                    const { error } = await supabaseClient.from(TABLA_DETALLE).insert([{
                        encuesta_id: encuestaId,
                        pregunta_id: preguntaId,
                        nombre_usuario: usuarioNombre,
                        opcion_elegida: textoRespuesta
                    }]);
                    if (error) throw error;
                }
                continue;
            }

            if (!p.opciones?.length) continue;

            p.opciones.forEach(opt => {
                const fueElegida = Array.isArray(rUsuario)
                    ? rUsuario.includes(opt.texto)
                    : rUsuario === opt.texto;
                if (fueElegida) opt.votos = (opt.votos || 0) + 1;
            });

            const { error: errOpciones } = await supabaseClient
                .from('preguntas')
                .update({ opciones: p.opciones })
                .eq('id', preguntaId);

            if (errOpciones) throw errOpciones;

            const opcionTexto = Array.isArray(rUsuario)
                ? rUsuario.join(', ')
                : (rUsuario || '').toString();

            if (opcionTexto) {
                const { error } = await supabaseClient.from(TABLA_DETALLE).insert([{
                    encuesta_id: encuestaId,
                    pregunta_id: preguntaId,
                    nombre_usuario: usuarioNombre,
                    opcion_elegida: opcionTexto
                }]);
                if (error) throw error;
            }
        }

        const nuevoTotal = (encuesta.totalVotos || 0) + 1;
        const { error: errTotal } = await supabaseClient
            .from('encuestas')
            .update({ total_votos: nuevoTotal })
            .eq('id', encuestaId);

        if (errTotal) throw errTotal;

        return { ok: true };
    } catch (e) {
        console.error('Error al procesar votación:', e);
        return { ok: false, mensaje: 'No se pudo guardar la respuesta.' };
    }
}

// INYECCIÓN AL ENTORNO WINDOW GLOBAL
window.dbMensajeEntorno = dbMensajeEntorno;
window.dbObtenerSesion = dbObtenerSesion;
window.dbGuardarSesion = dbGuardarSesion;
window.dbCerrarSesion = dbCerrarSesion;
window.dbLoginUsuario = dbLoginUsuario;
window.dbRegistrarUsuario = dbRegistrarUsuario;
window.dbObtenerEncuestas = dbObtenerEncuestas;
window.dbObtenerEncuestasParaResponder = dbObtenerEncuestasParaResponder;
window.dbEliminarEncuesta = dbEliminarEncuesta;
window.dbEnviarVotos = dbEnviarVotos;