const { createApp } = Vue;

createApp({
    data() {
        return {
            encuestas: [],
            encuestaSeleccionada: null,
            respuestasMap: {},
            usuarioActual: dbObtenerSesion() || {},
            cargando: true,
            enviando: false
        };
    },
    async mounted() {
        if (!this.usuarioActual.correo) {
            window.location.replace('../index.html');
            return;
        }
        await this.cargarEncuestas();
    },
    methods: {
        async cargarEncuestas() {
            this.cargando = true;
            try {
                this.encuestas = await dbObtenerEncuestasParaResponder(this.usuarioActual);
            } finally {
                this.cargando = false;
            }
        },

        seleccionarEncuesta(encuesta) {
            this.encuestaSeleccionada = encuesta;
            this.respuestasMap = {};
            encuesta.preguntas.forEach(p => {
                this.respuestasMap[p.id] = p.tipo === 'checkbox' ? [] : '';
            });
        },

        async enviarRespuestas() {
            if (this.enviando || !this.encuestaSeleccionada) return;
            this.enviando = true;

            try {
                const resultado = await dbEnviarVotos(
                    this.usuarioActual.correo,
                    this.usuarioActual.nombre,
                    this.encuestaSeleccionada,
                    this.respuestasMap
                );

                if (resultado.ok) {
                    alert('¡Encuesta enviada!');
                    window.location.href = 'Proyecto_Pagina_Principal.html';
                } else {
                    alert(resultado.mensaje || 'No se pudo enviar la respuesta.');
                }
            } finally {
                this.enviando = false;
            }
        },

        volver() {
            if (this.encuestaSeleccionada) {
                this.encuestaSeleccionada = null;
            } else {
                window.location.href = 'Proyecto_Pagina_Principal.html';
            }
        }
    }
}).mount('#app');
