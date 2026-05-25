-- =============================================================================
-- BASE DE DATOS: OPTILUXE
-- Script SQL generado a partir del esquema de Prisma (PostgreSQL)
-- Diseñado con comentarios explicativos y relaciones explícitas.
-- =============================================================================

-- =============================================================================
-- 0. LIMPIEZA DE TABLAS EXISTENTES (Orden inverso de dependencias)
-- =============================================================================
DROP TABLE IF EXISTS respuesta_encuesta CASCADE;
DROP TABLE IF EXISTS pregunta CASCADE;
DROP TABLE IF EXISTS encuesta CASCADE;
DROP TABLE IF EXISTS historia_clinica CASCADE;
DROP TABLE IF EXISTS soporte_pago CASCADE;
DROP TABLE IF EXISTS cita CASCADE;
DROP TABLE IF EXISTS carrito_producto CASCADE;
DROP TABLE IF EXISTS carrito_servicio CASCADE;
DROP TABLE IF EXISTS carrito CASCADE;
DROP TABLE IF EXISTS producto CASCADE;
DROP TABLE IF EXISTS categoria CASCADE;
DROP TABLE IF EXISTS contacto CASCADE;
DROP TABLE IF EXISTS servicio CASCADE;
DROP TABLE IF EXISTS webpush_suscripcion CASCADE;
DROP TABLE IF EXISTS log_acceso CASCADE;
DROP TABLE IF EXISTS notificacion CASCADE;
DROP TABLE IF EXISTS usuario CASCADE;
DROP TABLE IF EXISTS rol CASCADE;


-- =============================================================================
-- 1. TABLAS MAESTRAS (Sin dependencias)
-- =============================================================================

-- Tabla de Roles de Usuario
CREATE TABLE rol (
    idRol SERIAL PRIMARY KEY,
    rolNombre VARCHAR(50) NOT NULL UNIQUE,          -- Ej: 'ADMINISTRADOR', 'CLIENTE', 'OPTOMETRA'
    rolDescripcion VARCHAR(200)                      -- Descripción breve de las funciones del rol
);

COMMENT ON TABLE rol IS 'Define los roles de acceso para los usuarios del sistema Optiluxe.';

-- Tabla de Categorías de Productos
CREATE TABLE categoria (
    idCategoria SERIAL PRIMARY KEY,
    catNombre VARCHAR(100) NOT NULL UNIQUE,          -- Nombre de la categoría (Ej: 'Monturas', 'Lentes de Contacto')
    catEstado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' -- Estado de la categoría ('ACTIVO', 'INACTIVO')
);

COMMENT ON TABLE categoria IS 'Categorías jerárquicas para organizar los productos en venta.';

-- Tabla de Servicios ofrecidos por la óptica
CREATE TABLE servicio (
    idServicio SERIAL PRIMARY KEY,
    serNombre VARCHAR(150) NOT NULL,                 -- Nombre del servicio (Ej: 'Examen de refracción')
    serDescripcion TEXT,                             -- Descripción del servicio
    serPrecio DECIMAL(10, 2) NOT NULL,               -- Precio base del servicio
    serDuracion INTEGER NOT NULL DEFAULT 30,         -- Duración promedio estimada en minutos
    serEstado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO'  -- Estado del servicio ('ACTIVO', 'INACTIVO')
);

COMMENT ON TABLE servicio IS 'Catálogo de servicios y consultas ofrecidos en Optiluxe.';

-- Tabla de Mensajes de Contacto (Formulario público)
CREATE TABLE contacto (
    idContacto SERIAL PRIMARY KEY,
    conNombre VARCHAR(100) NOT NULL,                 -- Nombre del remitente
    conCorreo VARCHAR(150) NOT NULL,                 -- Correo de contacto
    conTelefono VARCHAR(20),                         -- Teléfono opcional
    conMensaje TEXT NOT NULL,                        -- Contenido del mensaje o consulta
    conFechaEnvio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Fecha y hora de envío
    conEstado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' -- Estado de atención ('PENDIENTE', 'RESUELTO')
);

COMMENT ON TABLE contacto IS 'Mensajes e inquietudes enviados por clientes externos desde la Landing Page.';

-- Tabla de Preguntas para encuestas de satisfacción
CREATE TABLE pregunta (
    idPregunta SERIAL PRIMARY KEY,
    preTexto VARCHAR(300) NOT NULL,                  -- Enunciado de la pregunta
    preTipo VARCHAR(50) NOT NULL,                    -- Tipo de respuesta (Ej: 'Selección Múltiple', 'Texto')
    preCategoria VARCHAR(50) NOT NULL,               -- Categoría asociada (Ej: 'Servicio', 'Producto')
    preActiva BOOLEAN NOT NULL DEFAULT TRUE          -- Indica si la pregunta se encuentra vigente
);

COMMENT ON TABLE pregunta IS 'Banco de preguntas estandarizadas para medir la calidad del servicio.';


-- =============================================================================
-- 2. TABLAS DE PRIMER NIVEL (Dependencia simple)
-- =============================================================================

-- Tabla de Usuarios
CREATE TABLE usuario (
    idUsuario SERIAL PRIMARY KEY,
    usuNombre VARCHAR(100) NOT NULL,                 -- Nombre del usuario
    usuApellido VARCHAR(100) NOT NULL,               -- Apellido del usuario
    usuDocumento VARCHAR(15) NOT NULL UNIQUE,        -- Documento de identidad (cédula, pasaporte)
    usuTelefono VARCHAR(10) NOT NULL,                -- Teléfono celular
    usuCorreo VARCHAR(150) NOT NULL UNIQUE,          -- Correo electrónico (utilizado para iniciar sesión)
    usuDireccion VARCHAR(200) NOT NULL,              -- Dirección física
    usuEstado VARCHAR(20) NOT NULL,                  -- Estado del usuario ('ACTIVO', 'INACTIVO', 'SUSPENDIDO')
    fkIdRol INTEGER,                                 -- Rol asignado al usuario
    usuPassword VARCHAR(60) NOT NULL,                -- Contraseña encriptada (bcrypt)
    usuResetToken VARCHAR(255),                      -- Token para restablecer contraseña
    usuResetTokenExpiry TIMESTAMP,                   -- Fecha de expiración del token de restablecimiento
    
    -- Relación: usuario -> rol
    CONSTRAINT fk_usuario_rol 
        FOREIGN KEY (fkIdRol) 
        REFERENCES rol(idRol) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE
);

COMMENT ON TABLE usuario IS 'Usuarios registrados en la plataforma (Clientes, Optómetras, Administradores).';

-- Tabla de Productos
CREATE TABLE producto (
    idProducto SERIAL PRIMARY KEY,
    proNombre VARCHAR(150) NOT NULL,                 -- Nombre comercial del producto
    proDescripcion TEXT,                             -- Descripción técnica/comercial
    fkIdCategoria INTEGER NOT NULL,                  -- Categoría del producto
    proPrecio DECIMAL(10, 2) NOT NULL,               -- Precio de venta al público
    proStock INTEGER NOT NULL,                       -- Inventario actual
    proEstado VARCHAR(20) NOT NULL,                  -- Estado del producto ('DISPONIBLE', 'AGOTADO')
    proImagen VARCHAR(255),                          -- URL o ruta de la imagen del producto
    
    -- Relación: producto -> categoria
    CONSTRAINT fk_producto_categoria 
        FOREIGN KEY (fkIdCategoria) 
        REFERENCES categoria(idCategoria) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
);

COMMENT ON TABLE producto IS 'Inventario y catálogo de productos físicos disponibles en la tienda.';


-- =============================================================================
-- 3. TABLAS DE SEGUNDO NIVEL (Transaccionales e Historiales)
-- =============================================================================

-- Carrito de Compras
CREATE TABLE carrito (
    idCarrito SERIAL PRIMARY KEY,
    carFechaCreacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Creación del carrito
    carEstado VARCHAR(20) NOT NULL,                  -- Estado del carrito ('ACTIVO', 'PROCESADO', 'ABANDONADO')
    fkIdUsuario INTEGER NOT NULL,                    -- Cliente propietario del carrito
    
    -- Relación: carrito -> usuario
    CONSTRAINT fk_carrito_usuario 
        FOREIGN KEY (fkIdUsuario) 
        REFERENCES usuario(idUsuario) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
);

COMMENT ON TABLE carrito IS 'Cabecera del carrito de compras asociado a un usuario.';

-- Citas Médicas / Optométricas
CREATE TABLE cita (
    idCita SERIAL PRIMARY KEY,
    citFecha TIMESTAMP NOT NULL,                     -- Fecha y hora agendada para la cita
    citMotivo VARCHAR(200) NOT NULL,                 -- Motivo de la cita (Ej: 'Revisión anual')
    citEstado VARCHAR(20) NOT NULL,                  -- Estado ('PENDIENTE', 'REALIZADA', 'CANCELADA')
    citObservaciones VARCHAR(300),                   -- Notas internas del agendamiento
    citDuracion INTEGER NOT NULL DEFAULT 30,         -- Duración en minutos
    fkIdUsuario INTEGER NOT NULL,                    -- Paciente que asiste a la cita
    
    -- Relación: cita -> usuario
    CONSTRAINT fk_cita_usuario 
        FOREIGN KEY (fkIdUsuario) 
        REFERENCES usuario(idUsuario) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
);

COMMENT ON TABLE cita IS 'Agendamiento de citas optométricas para los pacientes.';

-- Historial Clínico (Asociado a una Cita)
CREATE TABLE historia_clinica (
    idHistoriaClinica SERIAL PRIMARY KEY,
    hisFecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Registro del historial
    hisDiagnostico TEXT NOT NULL,                    -- Diagnóstico médico del optómetra
    hisFormulaOptica TEXT NOT NULL,                  -- Fórmula de lentes recomendada (Esfera, Cilindro, Eje, etc.)
    hisObservaciones TEXT,                           -- Recomendaciones adicionales
    fkIdCita INTEGER NOT NULL,                       -- Cita asociada que generó este historial
    
    -- Relación: historia_clinica -> cita
    CONSTRAINT fk_historia_clinica_cita 
        FOREIGN KEY (fkIdCita) 
        REFERENCES cita(idCita) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
);

COMMENT ON TABLE historia_clinica IS 'Registro médico resultante de una cita de optometría.';

-- Registro de Accesos (Auditoría de Seguridad)
CREATE TABLE log_acceso (
    idLogAcceso SERIAL PRIMARY KEY,
    logAccion VARCHAR(100) NOT NULL,                 -- Acción realizada (Ej: 'LOGIN', 'LOGOUT')
    logFecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Momento de la acción
    logIP VARCHAR(45) NOT NULL,                      -- IP desde donde se realiza el acceso (IPv4/IPv6)
    logRecurso VARCHAR(150) NOT NULL,                -- Ruta o endpoint accedido
    fkIdUsuario INTEGER NOT NULL,                    -- Usuario que realizó la acción
    
    -- Relación: log_acceso -> usuario
    CONSTRAINT fk_log_acceso_usuario 
        FOREIGN KEY (fkIdUsuario) 
        REFERENCES usuario(idUsuario) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
);

COMMENT ON TABLE log_acceso IS 'Bitácora de seguridad para el rastreo de inicio de sesión y acciones críticas.';

-- Suscripciones Web Push
CREATE TABLE webpush_suscripcion (
    idWebpushSuscripcion SERIAL PRIMARY KEY,
    webEndpoint VARCHAR(500) NOT NULL UNIQUE,        -- URL de suscripción del navegador web
    webP256dh VARCHAR(255) NOT NULL,                 -- Clave pública de cifrado push
    webAuth VARCHAR(255) NOT NULL,                   -- Clave de autenticación push
    webFechaRegistro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fkIdUsuario INTEGER NOT NULL,                    -- Usuario suscrito
    
    -- Relación: webpush_suscripcion -> usuario
    CONSTRAINT fk_webpush_suscripcion_usuario 
        FOREIGN KEY (fkIdUsuario) 
        REFERENCES usuario(idUsuario) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
);

COMMENT ON TABLE webpush_suscripcion IS 'Tokens de navegación para enviar notificaciones push a través de Service Workers.';

-- Notificaciones Generales del Sistema
CREATE TABLE notificacion (
    idNotificacion SERIAL PRIMARY KEY,
    notTitulo VARCHAR(100) NOT NULL,                 -- Título de la notificación
    notMensaje TEXT NOT NULL,                        -- Mensaje detallado
    notCanal VARCHAR(50) NOT NULL DEFAULT 'Email',   -- Canal de envío ('Email', 'Push', 'SMS')
    notEstado VARCHAR(20) NOT NULL,                  -- Estado ('PENDIENTE', 'ENVIADA', 'ERROR')
    notLeida BOOLEAN NOT NULL DEFAULT FALSE,         -- Si el usuario ya leyó la notificación
    notFechaProgramada TIMESTAMP NOT NULL,           -- Fecha programada de envío
    fkIdUsuario INTEGER NOT NULL,                    -- Usuario destino de la notificación
    
    -- Relación: notificacion -> usuario
    CONSTRAINT fk_notificacion_usuario 
        FOREIGN KEY (fkIdUsuario) 
        REFERENCES usuario(idUsuario) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
);

-- Índice optimizado para búsquedas frecuentes de notificaciones programadas
CREATE INDEX idx_notificacion_estado_fecha_leida ON notificacion(notEstado, notFechaProgramada, notLeida);

COMMENT ON TABLE notificacion IS 'Historial y control de notificaciones programadas y enviadas.';


-- =============================================================================
-- 4. DETALLES DE TRANSACCIÓN Y RELACIONES MUCHOS A MUCHOS
-- =============================================================================

-- Detalle de Servicios en el Carrito
CREATE TABLE carrito_servicio (
    idCarritoServicio SERIAL PRIMARY KEY,
    fkIdCarrito INTEGER NOT NULL,                    -- Carrito contenedor
    fkIdServicio INTEGER,                            -- Servicio asociado (Opcional, si se elimina el servicio maestro)
    csNombre VARCHAR(150) NOT NULL,                  -- Instantánea del nombre del servicio en la compra
    csPrecio DECIMAL(10, 2) NOT NULL,                -- Instantánea del precio del servicio en la compra
    csFecha VARCHAR(10) NOT NULL,                    -- Fecha de agendamiento del servicio en formato 'YYYY-MM-DD'
    csHora VARCHAR(5) NOT NULL,                      -- Hora de agendamiento del servicio en formato 'HH:MM'
    
    -- Relaciones
    CONSTRAINT fk_carrito_servicio_carrito 
        FOREIGN KEY (fkIdCarrito) 
        REFERENCES carrito(idCarrito) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
        
    CONSTRAINT fk_carrito_servicio_servicio 
        FOREIGN KEY (fkIdServicio) 
        REFERENCES servicio(idServicio) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE
);

COMMENT ON TABLE carrito_servicio IS 'Relación de servicios agregados y reservados temporalmente en un carrito de compras.';

-- Detalle de Productos en el Carrito (Tabla de rompimiento)
CREATE TABLE carrito_producto (
    idCarritoProducto SERIAL PRIMARY KEY,
    fkIdCarrito INTEGER NOT NULL,                    -- Carrito contenedor
    fkIdProducto INTEGER NOT NULL,                   -- Producto agregado
    cantidad INTEGER NOT NULL,                       -- Cantidad del mismo producto a comprar
    
    -- Relaciones
    CONSTRAINT fk_carrito_producto_carrito 
        FOREIGN KEY (fkIdCarrito) 
        REFERENCES carrito(idCarrito) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
        
    CONSTRAINT fk_carrito_producto_producto 
        FOREIGN KEY (fkIdProducto) 
        REFERENCES producto(idProducto) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
        
    -- Clave Única para evitar duplicidad de un mismo producto en el mismo carrito
    CONSTRAINT uq_carrito_producto UNIQUE (fkIdCarrito, fkIdProducto)
);

COMMENT ON TABLE carrito_producto IS 'Relación de productos y sus cantidades agregadas en un carrito de compras.';


-- =============================================================================
-- 5. SOPORTES DE PAGO Y ENCUESTAS (Nivel transaccional final)
-- =============================================================================

-- Soporte de Pago / Facturación
CREATE TABLE soporte_pago (
    idSoporte SERIAL PRIMARY KEY,
    sopNumero VARCHAR(50) NOT NULL UNIQUE,           -- Código único identificador del soporte
    sopFecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Fecha de emisión
    sopConcepto TEXT NOT NULL,                       -- Concepto o descripción general de la transacción
    sopCondiciones VARCHAR(300),                     -- Condiciones especiales de pago o garantía
    sopSubtotal DECIMAL(10, 2) NOT NULL,             -- Subtotal antes de impuestos/descuentos
    sopTotal DECIMAL(10, 2) NOT NULL,                -- Monto total neto pagado
    fkIdCarrito INTEGER,                             -- Carrito de compras pagado (si aplica)
    fkIdCita INTEGER,                                -- Cita médica pagada (si aplica)
    sopEstado VARCHAR(20) NOT NULL DEFAULT 'PAGADA', -- Estado de la factura ('PAGADA', 'ANULADA')
    sopMotivoAnulacion TEXT,                         -- Justificación en caso de anulación
    fkIdUsuario INTEGER,                             -- Cliente que realiza el pago (opcional en ventas directas)
    
    -- Relaciones
    CONSTRAINT fk_soporte_pago_carrito 
        FOREIGN KEY (fkIdCarrito) 
        REFERENCES carrito(idCarrito) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE,
        
    CONSTRAINT fk_soporte_pago_cita 
        FOREIGN KEY (fkIdCita) 
        REFERENCES cita(idCita) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE,
        
    CONSTRAINT fk_soporte_pago_usuario 
        FOREIGN KEY (fkIdUsuario) 
        REFERENCES usuario(idUsuario) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE
);

COMMENT ON TABLE soporte_pago IS 'Registro oficial del pago realizado por servicios y/o productos.';

-- Encuesta de Calidad Realizada
CREATE TABLE encuesta (
    idEncuesta SERIAL PRIMARY KEY,
    enFecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Fecha de realización de la encuesta
    enTipo VARCHAR(50) NOT NULL,                     -- Tipo de encuesta (Ej: 'Satisfacción Servicio', 'Satisfacción Producto')
    fkIdSoporte INTEGER,                             -- Soporte de pago de la compra evaluada (opcional)
    fkIdCita INTEGER,                                -- Cita médica evaluada (opcional)
    
    -- Relaciones
    CONSTRAINT fk_encuesta_cita 
        FOREIGN KEY (fkIdCita) 
        REFERENCES cita(idCita) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE,
        
    CONSTRAINT fk_encuesta_soporte_pago 
        FOREIGN KEY (fkIdSoporte) 
        REFERENCES soporte_pago(idSoporte) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE
);

COMMENT ON TABLE encuesta IS 'Encuestas de valoración diligenciadas por los clientes tras recibir un servicio o producto.';

-- Respuestas a las Preguntas de la Encuesta
CREATE TABLE respuesta_encuesta (
    idRespuesta SERIAL PRIMARY KEY,
    resValor VARCHAR(300) NOT NULL,                  -- Valor de la respuesta (Ej: calificación o comentario)
    fkIdPregunta INTEGER NOT NULL,                   -- Pregunta asociada
    fkIdEncuesta INTEGER NOT NULL,                   -- Encuesta a la que pertenece esta respuesta
    
    -- Relaciones
    CONSTRAINT fk_respuesta_encuesta_encuesta 
        FOREIGN KEY (fkIdEncuesta) 
        REFERENCES encuesta(idEncuesta) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
        
    CONSTRAINT fk_respuesta_encuesta_pregunta 
        FOREIGN KEY (fkIdPregunta) 
        REFERENCES pregunta(idPregunta) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
);

COMMENT ON TABLE respuesta_encuesta IS 'Respuestas individuales asociadas a una pregunta dentro de una encuesta realizada.';
