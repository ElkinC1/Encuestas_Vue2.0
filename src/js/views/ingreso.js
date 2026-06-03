const { createApp } = Vue;

createApp({
    data() {
        return {
            correo: '',
            clave: '',
            verClave: false,
            error: false,
            mensajeError: '',
            recordar: false,
            mostrarRegistro: false,
            nuevoUsuario: {
                nombre: '',
                correo: '',
                clave: '',
                repetir_clave: '',
                rol: ''
            },
            fraseActual: '',
            listaFrases: [
                'No hay texto.',
                '¿Dormir? no gracias, prefiero programar.',
                'Hola mundo.',
                'Los lentes son parte del outfit de un programador.',
                'El que hace mas goles gana el partido.',
                'Uleam >>> cualquier universidad.',
                'Usa el poder de las encuestas con sabiduria.',
                'No respondas encuestas bajo el efecto del insomnio.',
                'Software es clave.',
                'El conocimiento es libertad.'
            ],
            ingresando: false
        };
    },

    mounted() {
        this.generarFraseAleatoria();

        const avisoEntorno = window.dbMensajeEntorno ? window.dbMensajeEntorno() : null;
        if (avisoEntorno) {
            this.mensajeError = avisoEntorno;
            this.error = true;
        }

        if (window.dbObtenerSesion && window.dbObtenerSesion()) {
            window.location.replace('HTML/Proyecto_Pagina_Principal.html');
        }

        window.history.pushState(null, null, window.location.href);
        window.onpopstate = function () {
            window.history.go(1);
        };
    },

    methods: {
        abrirRegistro() {
            this.mostrarRegistro = true;
            document.body.classList.add('modal-registro-abierto');
        },

        cerrarRegistro() {
            this.mostrarRegistro = false;
            document.body.classList.remove('modal-registro-abierto');
        },

        generarFraseAleatoria() {
            const indice = Math.floor(Math.random() * this.listaFrases.length);
            this.fraseActual = this.listaFrases[indice];
        },

        async validarIngreso() {
            this.error = false;
            if (this.ingresando) return;

            const avisoEntorno = window.dbMensajeEntorno ? window.dbMensajeEntorno() : null;
            if (avisoEntorno) {
                this.mensajeError = avisoEntorno;
                this.error = true;
                return;
            }

            this.ingresando = true;

            try {
                if (typeof window['dbLoginUsuario'] !== 'function') {
                    this.mensajeError = 'Error: No se encuentra el archivo de persistencia de datos.';
                    this.error = true;
                    return;
                }

                const resultado = await window['dbLoginUsuario'](this.correo, this.clave);

                if (resultado.ok && resultado.usuario) {
                    window.dbGuardarSesion(resultado.usuario);
                    window.location.replace('HTML/Proyecto_Pagina_Principal.html');
                } else if (resultado.mensaje) {
                    this.mensajeError = resultado.mensaje;
                    this.error = true;
                } else {
                    this.mensajeError = 'Correo o contraseña incorrectos.';
                    this.error = true;
                }
            } catch (e) {
                console.error(e);
                this.mensajeError = 'Error de conexión. Abre el proyecto con Live Server.';
                this.error = true;
            } finally {
                this.ingresando = false;
            }
        },

        async registrarUsuario() {
            const { nombre, correo, clave, repetir_clave, rol } = this.nuevoUsuario;

            if (!nombre || !correo || !clave || !repetir_clave || !rol) {
                alert("Todos los campos son obligatorios.");
                return;
            }

            const correoL = correo.toLowerCase().trim();

            if (rol === 'Estudiante' && !correoL.endsWith("@live.uleam.edu.ec")) {
                alert("Los estudiantes deben usar correo @live.uleam.edu.ec");
                return;
            }
            if ((rol === 'Profesor' || rol === 'Administrador') && !correoL.endsWith("@uleam.edu.ec")) {
                alert("Docentes y Administrativos deben usar correo @uleam.edu.ec");
                return;
            }

            const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
            if (!passRegex.test(clave)) {
                alert("Contraseña débil. Debe tener:\n- Al menos 8 caracteres\n- Una letra Mayúscula\n- Una letra Minúscula\n- Al menos un Número");
                return;
            }

            if (clave !== repetir_clave) {
                alert("Las contraseñas no coinciden.");
                return;
            }

            try {
                if (typeof window['dbRegistrarUsuario'] !== 'function') {
                    alert("Error crítico: Las funciones de la base de datos no se inyectaron correctamente en la ventana.");
                    return;
                }

                const resultado = await window['dbRegistrarUsuario'](nombre, correo, clave, rol);

                if (resultado.ok) {
                    alert(rol + " " + nombre + " ¡Cuenta creada exitosamente en Supabase!");
                    this.mostrarRegistro = false;
                    this.nuevoUsuario = { nombre: '', correo: '', clave: '', repetir_clave: '', rol: '' };
                } else {
                    alert(resultado.error || "No se pudo completar el registro. Comprueba políticas RLS.");
                }
            } catch (e) {
                console.error("Error en la vista de registro:", e);
                alert("Error inesperado en la interfaz de usuario.");
            }
        }
    }
}).mount('#app');