const { createApp } = Vue;

createApp({
    data() {
        return {
            titulo: '',
            descripcion: '',
            preguntas: [],
            fondoColor: '#1a4d2e',
            palabrasProhibidas: [
                'estupido', 'estupida', 'idiota', 'imbecil', 'maldito', 'maldita', 'basura',
                'pendejo', 'pendeja', 'estupidez', 'mierda', 'carajo', 'verga', 'puto', 'puta',
                'macho', 'perra', 'maldicion', 'estupidos', 'idiotas', 'infeliz',
                'chucha', 'hdp', 'mrd', 'vrga', 'webon', 'guevon', 'careverga', 'no seas bobo',
                'pendejada', 'baboso', 'babosa', 'puerco', 'puerca', 'cabrón', 'cabrona',
                'negro', 'gringo', 'muerto de hambre'
            ],
            privacidad: {
                tipo: 'todos',
                roles: [],
                correos: ''
            },
            usuarioActual: dbObtenerSesion(),
            guardando: false
        };
    },
    mounted() {
        if (!this.usuarioActual) {
            window.location.replace('../index.html');
            return;
        }
        this.agregarPregunta('radio');
    },
    methods: {
        agregarPregunta(tipo) {
            this.preguntas.push({
                id: Date.now() + Math.random(),
                tipo: tipo,
                texto: '',
                opciones: tipo === 'texto' ? null : ['Opción 1', 'Opción 2']
            });
        },

        tieneContenidoReal(texto) {
            if (!texto) return false;
            return texto.replace(/[^a-zA-Z0-9]/g, '').length >= 3;
        },

        contienePalabrasMalsonantes(texto) {
            if (!texto) return false;
            const textoLimpio = texto.toLowerCase();
            return this.palabrasProhibidas.some(palabra => textoLimpio.includes(palabra));
        },

        validarTodoElContenido() {
            if (!this.titulo.trim() || !this.tieneContenidoReal(this.titulo)) {
                return 'Título inválido (mínimo 3 letras).';
            }
            if (this.contienePalabrasMalsonantes(this.titulo)) {
                return 'Título con lenguaje inapropiado.';
            }

            for (let i = 0; i < this.preguntas.length; i++) {
                const p = this.preguntas[i];
                if (!p.texto.trim() || !this.tieneContenidoReal(p.texto)) {
                    return `La pregunta ${i + 1} está vacía.`;
                }
                if (this.contienePalabrasMalsonantes(p.texto)) {
                    return `La pregunta ${i + 1} contiene lenguaje inapropiado.`;
                }
            }
            return null;
        },

        async guardarEncuesta() {
            const error = this.validarTodoElContenido();
            if (error) return alert('⚠️ ' + error);

            if (this.privacidad.tipo === 'rol' && this.privacidad.roles.length === 0) {
                return alert('Selecciona al menos un rol.');
            }

            if (this.guardando) return;
            this.guardando = true;

            const preguntasFormateadas = this.preguntas.map(p => {
                const nuevaP = { ...p, id: String(p.id) };
                if (p.tipo !== 'texto') {
                    nuevaP.opciones = p.opciones.map(opt => ({
                        texto: typeof opt === 'object' ? opt.texto : opt,
                        votos: 0
                    }));
                }
                return nuevaP;
            });

            const encuestaFinal = {
                id: Date.now().toString(),
                titulo: this.titulo,
                descripcion: this.descripcion,
                creador: this.usuarioActual.nombre,
                creadorCorreo: this.usuarioActual.correo,
                colorTema: this.fondoColor,
                totalVotos: 0,
                estado: 'Activa',
                acceso: {
                    tipo: this.privacidad.tipo,
                    rolesPermitidos: this.privacidad.roles.map(r => String(r).toUpperCase()),
                    usuariosPermitidos: this.privacidad.correos
                        .split(',')
                        .map(c => c.trim().toLowerCase())
                        .filter(c => c)
                }
            };

            try {
                const ok = await dbGuardarEncuesta(encuestaFinal, preguntasFormateadas);
                if (ok) {
                    alert('¡Encuesta publicada correctamente!');
                    window.location.href = 'Proyecto_Pagina_Principal.html';
                } else {
                    alert('No se pudo publicar la encuesta. Revisa Supabase (tablas y políticas RLS).');
                }
            } catch (e) {
                console.error(e);
                alert('Error al guardar en la base de datos.');
            } finally {
                this.guardando = false;
            }
        },

        agregarOpcion(i) {
            this.preguntas[i].opciones.push('Nueva Opción');
        },
        eliminarOpcion(pi, oi) {
            this.preguntas[pi].opciones.splice(oi, 1);
        },
        eliminarPregunta(i) {
            if (this.preguntas.length > 1) this.preguntas.splice(i, 1);
        }
    }
}).mount('#app');
