import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Usuario from "../models/Usuario.js";


// Registrar usuario
export const registrarUsuario = async (req, res) => {
  try {
    const { nombre, email, contraseña, rol } = req.body;

    // Verificar si el usuario ya existe
    const existe = await Usuario.findOne({ where: { email } });
    if (existe) return res.status(400).json({ message: "El usuario ya existe" });

    // Encriptar contraseña
    const hashed = await bcrypt.hash(contraseña, 10);

    const nuevoUsuario = await Usuario.create({
      nombre,
      email,
      contraseña: hashed,
      rol,
    });

    res.status(201).json({ message: "Usuario registrado correctamente", usuario: nuevoUsuario });
  } catch (error) {
    res.status(500).json({ message: "Error al registrar usuario", error });
  }
};

// Iniciar sesión
export const loginUsuario = async (req, res) => {
  try {
    const { email, contraseña } = req.body;

    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });

    const validPassword = await bcrypt.compare(contraseña, usuario.contraseña);
    if (!validPassword) return res.status(401).json({ message: "Contraseña incorrecta" });

    const token = jwt.sign({ id: usuario.id, rol: usuario.rol }, process.env.JWT_SECRET, {
      expiresIn: "2h",
    });

    res.json({ message: "Inicio de sesión exitoso", token });
  } catch (error) {
    res.status(500).json({ message: "Error al iniciar sesión", error });
  }
};
export const usuarioActual = async (req, res) => {
  try {
    // req.user lo puso el middleware verifyToken
    res.json({ usuario: req.user });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener usuario actual", error });
  }
};
