const { createApp } = Vue;

createApp({
    data() {
        return {
            usuarioActual: {
                nombre: '',
                rol: '',
                correo: '',
                inicial: ''
            },
            encuestaAbiertaId: null,
            misEncuestas: [],
            mostrarModalDetalles: false,
            preguntaSeleccionada: null,
            cargando: true
        };
    },
    async mounted() {
        const sesion = dbObtenerSesion();
        if (!sesion) {
            window.location.replace('../index.html');
            return;
        }

        this.usuarioActual = sesion;
        this.usuarioActual.inicial = this.usuarioActual.nombre
            ? this.usuarioActual.nombre.charAt(0).toUpperCase()
            : 'U';

        await this.cargarEncuestas();
    },
    computed: {
        sidebarColor() {
            const rol = (this.usuarioActual.rol || '').toUpperCase();
            if (rol === 'ESTUDIANTE') return '#1a4d2e';
            if (rol === 'PROFESOR') return '#0056b3';
            return '#212529';
        },
        fechaActual() {
            return new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        }
    },
    methods: {
        async cargarEncuestas() {
            this.cargando = true;
            try {
                this.misEncuestas = await dbObtenerEncuestas(this.usuarioActual);
            } finally {
                this.cargando = false;
            }
        },

        async eliminarMiEncuesta(id) {
            if (!confirm('¿Estás seguro de eliminar esta encuesta? Esta acción no se puede deshacer.')) {
                return;
            }

            const ok = await dbEliminarEncuesta(id);
            if (ok) {
                if (this.encuestaAbiertaId === id) this.encuestaAbiertaId = null;
                await this.cargarEncuestas();
            } else {
                alert('No se pudo eliminar la encuesta. Intenta de nuevo.');
            }
        },

        toggleDetalles(id) {
            this.encuestaAbiertaId = this.encuestaAbiertaId === id ? null : id;
        },

        verMasDetalles(pregunta) {
            this.preguntaSeleccionada = pregunta;
            this.mostrarModalDetalles = true;
        },

        cerrarModal() {
            this.mostrarModalDetalles = false;
            this.preguntaSeleccionada = null;
        },

        calcularPorcentaje(votos, total) {
            if (!total || total === 0) return 0;
            return Math.round((votos / total) * 100);
        },

        cerrarSesion() {
            if (confirm('¿Deseas cerrar la sesión?')) {
                dbCerrarSesion();
                window.location.replace('../index.html');
            }
        }
    }
}).mount('#app');
