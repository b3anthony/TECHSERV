package pe.techserv.panel;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import pe.techserv.comun.SolicitudInvalida;
import pe.techserv.orden.EstadoOrden;
import pe.techserv.orden.OrdenServicio;

import java.text.Normalizer;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Los filtros de la bandeja del taller, y la UNICA consulta que los aplica.
 *
 * La lista y los conteos por etapa usan el mismo {@link #filtrar}: si cada uno
 * armara su consulta, un dia la pestaña diria 3 y la lista mostraria 2. Y el
 * orden vive en {@link #orden}: cambiar el criterio es tocar una linea.
 *
 * El taller entra siempre como primer predicado y no es opcional: una
 * busqueda nunca devuelve ni cuenta ordenes de otro taller.
 */
public final class BusquedaOrdenes {

    public static final int MAXIMO_TEXTO = 80;

    /**
     * Mayusculas con tilde → minusculas sin tilde, en la base. lower() solo no
     * basta: quita la mayuscula pero deja la tilde, y el cotejamiento de la base
     * (utf8mb4_0900_as_cs) la distingue.
     */
    private static final String CON_TILDE = "ÁÉÍÓÚÜÑáéíóúüñ";
    private static final String SIN_TILDE = "aeiouunaeiouun";

    public enum Orden { RECIENTES, PROXIMAS }

    /**
     * @param q          texto libre; null o vacio = sin buscar
     * @param tecnicoId  solo las de ese tecnico (ya comprobado que es del taller)
     * @param sinTecnico solo las que no tienen tecnico
     */
    public record Filtro(String q, Long tecnicoId, boolean sinTecnico,
                         LocalDate desde, LocalDate hasta, Orden orden) {

        public Filtro {
            q = (q == null || q.isBlank()) ? null : q.trim();
            if (q != null && q.length() > MAXIMO_TEXTO) {
                throw new SolicitudInvalida("La búsqueda no puede tener más de " + MAXIMO_TEXTO + " caracteres");
            }
            if (desde != null && hasta != null && desde.isAfter(hasta)) {
                throw new SolicitudInvalida("La fecha «desde» no puede ser posterior a «hasta»");
            }
            if (tecnicoId != null && sinTecnico) {
                throw new SolicitudInvalida("Elige un técnico o «sin técnico», no los dos");
            }
            orden = orden == null ? Orden.RECIENTES : orden;
        }

        public static Filtro vacio() {
            return new Filtro(null, null, false, null, null, null);
        }
    }

    private BusquedaOrdenes() {}

    public static Specification<OrdenServicio> filtrar(Long mypeId, Filtro f, EstadoOrden estado) {
        return (raiz, consulta, cb) -> {
            List<Predicate> y = new ArrayList<>();
            y.add(cb.equal(raiz.get("mype").get("id"), mypeId));
            if (estado != null) {
                y.add(cb.equal(raiz.get("estado"), estado));
            }
            if (f.tecnicoId() != null) {
                y.add(cb.equal(raiz.get("tecnico").get("id"), f.tecnicoId()));
            }
            if (f.sinTecnico()) {
                y.add(cb.isNull(raiz.get("tecnico")));
            }
            if (f.desde() != null) {
                y.add(cb.greaterThanOrEqualTo(raiz.get("fechaProgramada"), f.desde()));
            }
            if (f.hasta() != null) {
                y.add(cb.lessThanOrEqualTo(raiz.get("fechaProgramada"), f.hasta()));
            }
            if (f.q() != null) {
                y.add(texto(raiz, cb, f.q()));
            }
            return cb.and(y.toArray(Predicate[]::new));
        };
    }

    /**
     * Las atenciones por garantia van primero: son prioritarias. Despues,
     * recientes (lo programado mas tarde arriba) o proximas (lo que toca antes).
     *
     * «tipo» ascendente pone GARANTIA antes que NORMAL porque se guarda como
     * texto y G va antes que N. Si algun dia se anade otro tipo, revisa esto:
     * la prueba de la bandeja priorizada de GarantiaTest lo vigila.
     */
    public static Sort orden(Orden orden) {
        Sort.Direction dir = orden == Orden.PROXIMAS ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(Sort.Direction.ASC, "tipo")
                .and(Sort.by(dir, "fechaProgramada", "horaProgramada", "id"));
    }

    /** El texto en minusculas y sin tildes, igual que {@link #normalizada} lo deja en la base. */
    static String normalizar(String texto) {
        String sinMarcas = Normalizer.normalize(texto.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        return sinMarcas;
    }

    private static Predicate texto(Root<OrdenServicio> raiz, CriteriaBuilder cb, String q) {
        String patron = "%" + escaparComodines(normalizar(q)) + "%";

        Join<Object, Object> usuarioCliente = raiz.join("cliente").join("usuario");
        Join<Object, Object> tecnico = raiz.join("tecnico", JoinType.LEFT);
        Join<Object, Object> usuarioTecnico = tecnico.join("usuario", JoinType.LEFT);

        List<Expression<String>> campos = List.of(
                raiz.get("codigo"),
                raiz.get("descripcionFalla"),
                raiz.get("direccion"),
                raiz.get("distrito"),
                cb.concat(cb.concat(usuarioCliente.<String>get("nombres"), " "), usuarioCliente.<String>get("apellidos")),
                cb.concat(cb.concat(usuarioTecnico.<String>get("nombres"), " "), usuarioTecnico.<String>get("apellidos")));

        return cb.or(campos.stream()
                .map(campo -> cb.like(normalizada(cb, campo), patron, '\\'))
                .toArray(Predicate[]::new));
    }

    /** MySQL no tiene translate(): un replace() por letra, encadenados. */
    private static Expression<String> normalizada(CriteriaBuilder cb, Expression<String> campo) {
        Expression<String> texto = cb.lower(campo);
        for (int i = 0; i < CON_TILDE.length(); i++) {
            texto = cb.function("replace", String.class, texto,
                    cb.literal(CON_TILDE.substring(i, i + 1)), cb.literal(SIN_TILDE.substring(i, i + 1)));
        }
        return texto;
    }

    /** % y _ son literales en la busqueda, no comodines. */
    private static String escaparComodines(String texto) {
        return texto.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
