import { z } from 'zod';
 
const email = z.string().trim().toLowerCase().pipe(z.email({ message: 'Formato de correo inválido' }));
 
export const password = z.string()
    .min(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
    .max(72, { message: 'Máximo 72 caracteres' }) // límite de bcrypt
    .regex(/[A-Z]/, { message: 'Debe contener al menos una mayúscula' })
    .regex(/[0-9]/, { message: 'Debe contener al menos un número' })
    .regex(/[^a-zA-Z0-9]/, { message: 'Debe contener un carácter especial' });
 
const nombre = z.string().trim().min(2, { message: 'El nombre es obligatorio' }).max(100);
 
// alumno_menor NO se auto-registra: lo crea un padre_tutor (register-minor)
export const registerSchema = z.object({
    email, password, nombre,
    rol: z.enum(['alumno_adulto', 'padre_tutor']).default('alumno_adulto'),
});
 
export const registerMinorSchema = z.object({ email, password, nombre });
 
export const loginSchema = z.object({
    email,
    password: z.string().min(1).max(72),
});
 