package pe.techserv.garantia;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.techserv.comun.RecursoNoEncontrado;
import pe.techserv.comun.SolicitudInvalida;
import pe.techserv.garantia.dto.AjusteGarantia;
import pe.techserv.mype.Mype;
import pe.techserv.mype.MypeRepository;

import java.util.Set;

@Service
public class ServicioAjustesGarantia {
    private final MypeRepository mypes;

    public ServicioAjustesGarantia(MypeRepository mypes) {
        this.mypes = mypes;
    }

    @Transactional(readOnly = true)
    public AjusteGarantia ver(Long mypeId) {
        return new AjusteGarantia(taller(mypeId).getGarantiaDias());
    }

    @Transactional
    public AjusteGarantia actualizar(Long mypeId, AjusteGarantia datos) {
        if (datos.dias() == null || !Set.of(30, 60, 90).contains(datos.dias())) {
            throw new SolicitudInvalida("La garantía debe durar 30, 60 o 90 días");
        }
        Mype taller = taller(mypeId);
        taller.setGarantiaDias(datos.dias());
        return new AjusteGarantia(taller.getGarantiaDias());
    }

    private Mype taller(Long mypeId) {
        return mypes.findById(mypeId).orElseThrow(() -> new RecursoNoEncontrado("No se encontró el taller"));
    }
}
