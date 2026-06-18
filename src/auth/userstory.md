# [BACK] Implementación de Endpoints para Autenticación y Gestión de Usuarios en Metrigas

---

## **Descripción**

Desarrollar e integrar el set de endpoints esenciales para la gestión del ciclo de vida del usuario en el ecosistema Metrigas dentro del framework NestJS. Este bloque técnico soporta el registro de cuentas, validación criptográfica de credenciales mediante JWT, flujo completo de recuperación de contraseña vía códigos temporales (6 dígitos) con expiración de 15 minutos, y autenticación segura con tokens de sesión.

---

## **Tareas**

- [x] **Módulo de Registro y Activación:**
  - [x] Desarrollar endpoint `POST /auth/signup` para registro inicial con código de verificación.
  - [x] Desarrollar endpoint `POST /auth/verify` para validación del código enviado por correo.

- [x] **Módulo de Autenticación:**
  - [x] Desarrollar endpoint `POST /auth/login` con firma de tokens JWT.

- [x] **Módulo de Recuperación de Contraseña:**
  - [x] Desarrollar endpoint `GET /auth/checkemailpwd/:email` para solicitar código de recuperación.
  - [x] Desarrollar endpoint `POST /auth/updatepwd` para actualizar contraseña con código validado.

---

## **Endpoints Implementados**

### **1. POST /auth/signup - Registro de Usuario**

**Descripción:** Crea un nuevo usuario con validación de email, genera un código de 6 dígitos, lo envía por correo y almacena el usuario en estado inactivo.

**¿Qué espera? (Request Body)**

```json
{
  "email": "alejandro@email.com",
  "username": "Alejandro Herrera González",
  "age": 30,
  "pwd": "PasswordSeguro123!"
}
```

**¿Qué devuelve? (Response 201 Created)**

```json
{
  "message": "Usuario registrado. Revisa tu correo para verificar tu cuenta."
}
```

**Flujo:**
1. Valida que el email no esté registrado
2. Genera código de 6 dígitos (válido 15 minutos)
3. Encripta contraseña con bcrypt (salt: 10)
4. Crea usuario INACTIVO con código y expiración almacenados
5. Envía correo con el código de verificación
6. Usuario debe usar `POST /auth/verify` para activar su cuenta

---

### **2. POST /auth/verify - Verificar Código de Activación**

**Descripción:** Valida el código de verificación recibido por correo. Si es correcto y no ha expirado, activa la cuenta del usuario.

**¿Qué espera? (Request Body)**

```json
{
  "email": "alejandro@email.com",
  "code": "123456"
}
```

**¿Qué devuelve? (Response 200 OK)**

```json
{
  "message": "Cuenta verificada con éxito. Ya puedes iniciar sesión."
}
```

**Validaciones:**
- El usuario debe existir en BD
- Código debe coincidir exactamente
- Código no debe haber expirado (15 minutos)
- Si código es incorrecto o expiró: usuario se elimina automáticamente

**Flujo:**
1. Busca usuario por email
2. Compara código enviado con el almacenado en BD
3. Verifica que no haya expirado
4. Activa usuario (`isActive = true`)
5. Limpia campos de verificación (`verificationCode` y `verificationCodeExpires = null`)

---

### **3. POST /auth/login - Autenticación con JWT**

**Descripción:** Valida credenciales (email y contraseña) y devuelve un JWT válido para futuras peticiones autenticadas.

**¿Qué espera? (Request Body)**

```json
{
  "email": "alejandro@email.com",
  "pwd": "PasswordSeguro123!"
}
```

**¿Qué devuelve? (Response 200 OK)**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1dWlkLWFxdWksImVtYWlsIjoiYWxlamFuZHJvQGVtYWlsLmNvbSJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "alejandro@email.com",
    "username": "Alejandro Herrera González",
    "age": 30,
    "subscriptionDate": "2026-07-18T12:00:00.000Z"
  }
}
```

**Validaciones:**
- Usuario debe existir en BD
- Cuenta debe estar activa (`isActive = true`)
- Contraseña debe coincidir (validada con bcrypt)

**Flujo:**
1. Busca usuario por email
2. Verifica que la cuenta esté activada
3. Compara contraseña con hash almacenado
4. Genera JWT con payload: `{ sub: userId, email }`
5. Devuelve token + información básica del usuario

---

### **4. GET /auth/checkemailpwd/:email - Solicitar Código de Recuperación**

**Descripción:** Verifica que el email existe, genera un código temporal de 6 dígitos (válido 15 minutos) y lo envía por correo.

**¿Qué espera? (Parámetro URL)**

```
GET /auth/checkemailpwd/alejandro@email.com
```

**¿Qué devuelve? (Response 200 OK)**

```json
{
  "message": "Código enviado al correo electrónico"
}
```

**Errores posibles:**
- Email no registrado: `404 Not Found`

**Flujo:**
1. Busca usuario por email
2. Si no existe, lanza error
3. Genera código de 6 dígitos
4. Calcula fecha de expiración (+15 minutos)
5. Almacena código y expiración en BD
6. Envía correo con el código
7. Usuario debe guardar el código para el siguiente paso

---

### **5. POST /auth/updatepwd - Actualizar Contraseña con Código**

**Descripción:** Valida el código de recuperación y la nueva contraseña. Si el código es válido y no ha expirado, actualiza la contraseña hasheada.

**¿Qué espera? (Request Body)**

```json
{
  "email": "alejandro@email.com",
  "code": "123456",
  "pwd": "NuevaContraseña456!"
}
```

**¿Qué devuelve? (Response 200 OK)**

```json
{
  "message": "Contraseña actualizada con éxito"
}
```

**Validaciones:**
- Usuario debe existir
- Código debe coincidir exactamente
- Código no debe haber expirado (15 minutos)
- Si código es incorrecto: error `400 Bad Request`
- Si código expiró: error `400 Bad Request`

**Flujo:**
1. Busca usuario por email
2. Compara código con el almacenado
3. Verifica que no haya expirado
4. Encripta nueva contraseña con bcrypt
5. Actualiza campo `pwd` en BD
6. Limpia campos de verificación
7. Guarda cambios

---

## **Flujos de Uso Completo**

### **Flujo 1: Registro e Inicio de Sesión**

```
1. POST /auth/signup
   ├─ Enviar: { email, username, age, pwd }
   ├─ Recibir: "Usuario registrado. Revisa tu correo..."
   └─ Estado: Usuario INACTIVO, código enviado por correo

2. POST /auth/verify
   ├─ Enviar: { email, code }  ← Code recibido por correo
   ├─ Recibir: "Cuenta verificada con éxito..."
   └─ Estado: Usuario ACTIVO

3. POST /auth/login
   ├─ Enviar: { email, pwd }
   ├─ Recibir: { accessToken, user }
   └─ Estado: Sesión iniciada con JWT
```

### **Flujo 2: Recuperación de Contraseña**

```
1. GET /auth/checkemailpwd/:email
   ├─ Parámetro URL: alejandro@email.com
   ├─ Recibir: "Código enviado al correo electrónico"
   └─ Estado: Código guardado en BD, enviado por correo

2. POST /auth/updatepwd
   ├─ Enviar: { email, code, pwd }  ← Code recibido por correo
   ├─ Recibir: "Contraseña actualizada con éxito"
   └─ Estado: Nueva contraseña hasheada, código limpiado

3. POST /auth/login
   ├─ Enviar: { email, pwd }  ← Con nueva contraseña
   ├─ Recibir: { accessToken, user }
   └─ Estado: Sesión iniciada con nuevas credenciales
```

---

## **Criterios de Aceptación**

- ✅ **Cifrado de Contraseñas:** Todas las contraseñas se guardan hasheadas con bcrypt (salt: 10), nunca en texto plano.

- ✅ **Validación de Tokens:** Códigos de 6 dígitos se validan exactamente y tienen expiración de 15 minutos.

- ✅ **Seguridad de Email:** Los emails se validan con decoradores de `class-validator`.

- ✅ **Restricción de Cuentas:** Solo usuarios con `isActive = true` pueden hacer login.

- ✅ **JWT Válido:** Tokens se firman con `JWT_SECRET` del `.env` y permiten identificar al usuario.

- ✅ **Límpieza de Datos:** Códigos de verificación se eliminan después de uso exitoso.

- ✅ **Manejo de Errores:** Se lanzan excepciones apropiadas (404, 400) con mensajes claros.

---

## **Estructuras de Base de Datos**

### Tabla `user`
```sql
- id (UUID, PRIMARY KEY)
- email (VARCHAR, UNIQUE)
- username (VARCHAR)
- age (INT)
- pwd (VARCHAR) -- Hasheado con bcrypt
- isActive (BOOLEAN, default: false)
- subscriptionDate (TIMESTAMP, default: CURRENT_TIMESTAMP + 1 month)
- verificationCode (VARCHAR, nullable)
- verificationCodeExpires (TIMESTAMP, nullable)
```

---

## **Variables de Entorno Requeridas**

```env
JWT_SECRET=clave_super_secreta
JWT_EXPIRES_IN=7d
RESEND_API_KEY=re_xxxxxxxxxxxx
```

---

## **Notas**

- Esta historia técnica pertenece a la **Épica: Gestión de Identidad y Autenticación**.
- Todos los códigos de verificación son de 6 dígitos y expiran en 15 minutos.
- Las contraseñas mínimas deben tener 8 caracteres (validado en DTO).
- Los tokens JWT expiran en 7 días según configuración.
- Si un código es incorrecto o expira durante signup, el usuario se elimina automáticamente.

---

## **Q&A**

- **¿El endpoint signup inserta correctamente en PostgreSQL?** Sí, crea usuario inactivo con código de verificación en BD.

- **¿Se valida la expiración del código?** Sí, se compara `new Date() > verificationCodeExpires`.

- **¿Las contraseñas se guardan en texto plano?** No, se hashean con bcrypt antes de almacenarlas.

- **¿Qué sucede si el código es incorrecto?** Durante signup: usuario se elimina. Durante recuperación: error 400.

- **¿El JWT permite identificar al usuario?** Sí, contiene `sub` (user ID) y `email`.
