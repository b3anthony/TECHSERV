package pe.techserv.almacen;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import pe.techserv.comun.PropiedadesTechServ;
import pe.techserv.comun.SolicitudInvalida;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.*;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Guarda las fotos de la averia en disco.
 *
 * En el prototipo el disco es una carpeta local; el dia que haga falta S3 o
 * MinIO se cambia esta clase y nada mas, porque el resto de la aplicacion solo
 * conoce la ruta publica que devuelve {@link #guardar}.
 *
 * El nombre del archivo lo pone la aplicacion, nunca el navegador: un nombre
 * subido por el cliente puede traer "../" y acabar escribiendo fuera de la
 * carpeta.
 */
@Service
public class ServicioAlmacenamiento {

    private static final List<String> TIPOS_PERMITIDOS =
            List.of("image/jpeg", "image/png", "image/webp");
    private static final long MAXIMO_BYTES = 5L * 1024 * 1024;
    public static final int MAXIMO_FOTOS = 5;

    private final Path raiz;

    public ServicioAlmacenamiento(PropiedadesTechServ props) {
        this.raiz = Paths.get(props.subidas().directorio()).toAbsolutePath().normalize();
        try {
            Files.createDirectories(raiz);
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo preparar la carpeta de subidas", e);
        }
    }

    public Path getRaiz() {
        return raiz;
    }

    /**
     * @return la ruta publica con la que el navegador pedira la foto,
     *         por ejemplo {@code /uploads/ORD-0143/8f3c....jpg}
     */
    public String guardar(String codigoOrden, MultipartFile archivo) {
        return guardarEnCarpeta(codigoOrden, archivo);
    }

    /** Reutiliza los mismos tipos y límite de las fotos, sin asociar el QR a una orden. */
    public String guardarCobro(Long mypeId, MultipartFile archivo) {
        return guardarEnCarpeta("cobro-" + mypeId, archivo);
    }

    /** Solo borra archivos de cobro de este taller, nunca fotos ni rutas ajenas. */
    public void eliminarCobro(Long mypeId, String rutaPublica) {
        if (rutaPublica == null) return;
        String prefijo = "/uploads/cobro-" + mypeId + "/";
        if (!rutaPublica.startsWith(prefijo)) {
            throw new SolicitudInvalida("Ruta del QR no válida");
        }
        Path carpeta = raiz.resolve("cobro-" + mypeId).normalize();
        Path archivo = carpeta.resolve(rutaPublica.substring(prefijo.length())).normalize();
        if (!carpeta.equals(archivo.getParent())) {
            throw new SolicitudInvalida("Ruta del QR no válida");
        }
        try {
            Files.deleteIfExists(archivo);
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo borrar el QR", e);
        }
    }

    private String guardarEnCarpeta(String nombreCarpeta, MultipartFile archivo) {
        validar(archivo);

        String extension = extensionDe(archivo.getContentType());
        String nombre = UUID.randomUUID() + extension;

        Path carpeta = raiz.resolve(nombreCarpeta).normalize();
        if (!carpeta.startsWith(raiz)) {
            throw new SolicitudInvalida("Ruta de subida no válida");
        }

        try {
            Files.createDirectories(carpeta);
            Path destino = carpeta.resolve(nombre);
            archivo.transferTo(destino);
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo guardar la foto", e);
        }

        return "/uploads/" + nombreCarpeta + "/" + nombre;
    }

    private void validar(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw new SolicitudInvalida("Una de las fotos llegó vacía");
        }
        if (archivo.getSize() > MAXIMO_BYTES) {
            throw new SolicitudInvalida("Cada foto debe pesar como máximo 5 MB");
        }
        String tipo = archivo.getContentType() == null ? ""
                : archivo.getContentType().toLowerCase(Locale.ROOT);
        if (!TIPOS_PERMITIDOS.contains(tipo)) {
            throw new SolicitudInvalida("Solo se admiten imágenes JPG, PNG o WEBP");
        }
    }

    private static String extensionDe(String tipoMime) {
        return switch (tipoMime.toLowerCase(Locale.ROOT)) {
            case "image/png"  -> ".png";
            case "image/webp" -> ".webp";
            default           -> ".jpg";
        };
    }
}
